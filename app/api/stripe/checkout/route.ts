/**
 * Stripe Checkout Session作成APIエンドポイント
 *
 * ビジネス上の流れ:
 * 1. ログインユーザーが有料プランを選択して「申し込む」をクリック
 * 2. このAPIが呼ばれ、StripeのCheckout Session（決済ページ）を作成
 * 3. ユーザーはStripeの決済ページにリダイレクトされる
 * 4. 決済完了後、指定した成功URLに戻ってくる
 *
 * これにより、ユーザーはクレジットカード情報を安全にStripe上で入力できます
 */

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getStripeClient, STRIPE_PRICE_IDS, type PlanType } from "@/lib/stripe";

// =============================================================================
// 型定義
// =============================================================================

/**
 * リクエストボディの型
 */
interface CheckoutRequestBody {
  /** 購入するプランのタイプ（standard, premium, pro_yearly） */
  planType: "standard" | "premium" | "pro_yearly";
}

// =============================================================================
// ヘルパー関数
// =============================================================================

/**
 * ユーザーのStripe Customer IDを取得または新規作成
 *
 * ビジネス上の役割：
 * - 既存のStripe顧客がいればそのIDを使用（重複顧客を防ぐ）
 * - 初めての決済の場合は新規顧客を作成
 *
 * @param userId - SupabaseのユーザーID
 * @param userEmail - ユーザーのメールアドレス
 * @returns Stripe Customer ID
 */
async function getOrCreateStripeCustomer(
  userId: string,
  userEmail: string
): Promise<string> {
  const stripe = getStripeClient();
  const supabase = await createSupabaseServerClient();

  // まず、既存のStripe Customer IDがあるか確認
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", userId)
    .single();

  // 既存のCustomer IDがあればそれを返す
  if (subscription?.stripe_customer_id) {
    return subscription.stripe_customer_id;
  }

  // 新規顧客を作成
  // metadata にSupabaseのユーザーIDを保存（後でWebhookで紐づけに使用）
  const customer = await stripe.customers.create({
    email: userEmail,
    metadata: {
      supabase_user_id: userId,
    },
  });

  // subscriptionsテーブルにCustomer IDを保存
  // upsert を使用して、レコードがなければ作成、あれば更新
  await supabase.from("subscriptions").upsert(
    {
      user_id: userId,
      stripe_customer_id: customer.id,
      plan_type: "free",
      status: "active",
    },
    {
      onConflict: "user_id",
    }
  );

  return customer.id;
}

/**
 * プランタイプからStripe Price IDを取得
 *
 * @param planType - プランの種類
 * @returns Stripe Price ID
 * @throws プランタイプが不正な場合
 */
function getPriceIdForPlan(planType: "standard" | "premium" | "pro_yearly"): string {
  const priceId = STRIPE_PRICE_IDS[planType];
  if (!priceId) {
    throw new Error(`不正なプランタイプ: ${planType}`);
  }
  return priceId;
}

// =============================================================================
// APIエンドポイント
// =============================================================================

/**
 * POSTリクエストを処理
 * プランを選択してCheckout Sessionを作成し、決済ページのURLを返す
 */
export async function POST(request: NextRequest) {
  try {
    // -----------------------------------------------------------------------
    // 1. ユーザー認証の確認
    // -----------------------------------------------------------------------
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "ログインが必要です。先にログインしてください。" },
        { status: 401 }
      );
    }

    // -----------------------------------------------------------------------
    // 2. リクエストボディの検証
    // -----------------------------------------------------------------------
    const body: CheckoutRequestBody = await request.json();
    const { planType } = body;

    // プランタイプの妥当性チェック
    if (!planType || !["standard", "premium", "pro_yearly"].includes(planType)) {
      return NextResponse.json(
        {
          error:
            "有効なプランを選択してください。" +
            "（standard, premium, pro_yearly のいずれか）",
        },
        { status: 400 }
      );
    }

    // -----------------------------------------------------------------------
    // 3. Stripe Customer IDの取得/作成
    // -----------------------------------------------------------------------
    const customerId = await getOrCreateStripeCustomer(
      user.id,
      user.email || ""
    );

    // -----------------------------------------------------------------------
    // 4. Checkout Sessionの作成
    // -----------------------------------------------------------------------
    const stripe = getStripeClient();
    const priceId = getPriceIdForPlan(planType);

    // アプリのベースURLを取得（環境変数または推測）
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:3000";

    // Checkout Sessionを作成
    // これがStripeの決済ページの設定になる
    const session = await stripe.checkout.sessions.create({
      // 顧客ID（既存/新規）
      customer: customerId,

      // 決済モード（subscription = サブスクリプション）
      mode: "subscription",

      // 購入する商品（価格ID）
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],

      // 決済成功後のリダイレクト先
      // ?session_id={CHECKOUT_SESSION_ID} は、セッションIDを自動で挿入
      success_url: `${baseUrl}/settings?checkout=success&session_id={CHECKOUT_SESSION_ID}`,

      // 決済キャンセル時のリダイレクト先
      cancel_url: `${baseUrl}/pricing?checkout=canceled`,

      // メタデータ（Webhookで使用）
      subscription_data: {
        metadata: {
          supabase_user_id: user.id,
          plan_type: planType,
        },
      },

      // 請求先住所を収集しない（日本国内のみサービス提供の場合）
      billing_address_collection: "auto",

      // 自動で税金計算をしない（日本の消費税は価格に含める）
      automatic_tax: { enabled: false },

      // 決済画面の表示言語を日本語に
      locale: "ja",
    });

    // -----------------------------------------------------------------------
    // 5. 決済ページURLを返す
    // -----------------------------------------------------------------------
    return NextResponse.json({
      success: true,
      checkoutUrl: session.url,
      sessionId: session.id,
    });
  } catch (error: unknown) {
    // エラーの詳細をログに記録
    console.error("Checkout Session作成エラー:", error);

    // Stripeのエラーを詳細に返す
    const stripeError = error as { type?: string; message?: string };
    if (stripeError.type === "StripeAuthenticationError") {
      return NextResponse.json(
        {
          error:
            "Stripeの認証に失敗しました。APIキーを確認してください。",
        },
        { status: 500 }
      );
    }

    if (stripeError.type === "StripeInvalidRequestError") {
      return NextResponse.json(
        {
          error: `リクエストが無効です: ${stripeError.message}`,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error:
          (error instanceof Error ? error.message : null) ||
          "決済セッションの作成中にエラーが発生しました",
      },
      { status: 500 }
    );
  }
}

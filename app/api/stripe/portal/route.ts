/**
 * Stripe Customer Portal APIエンドポイント
 *
 * ビジネス上の流れ:
 * 1. 有料プランユーザーが「プラン変更」や「解約」をしたい時
 * 2. このAPIを呼び出してStripe Customer Portalのセッションを作成
 * 3. ユーザーはStripeが提供する管理画面にリダイレクトされる
 * 4. そこでプラン変更、支払い方法の更新、解約などを自分で行える
 *
 * メリット:
 * - プラン管理のUIを自前で作る必要がない（Stripeが提供）
 * - 支払い情報の更新も安全にStripe上で行える
 * - PCI DSS準拠の心配がない
 */

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getStripeClient } from "@/lib/stripe";

// =============================================================================
// APIエンドポイント
// =============================================================================

/**
 * POSTリクエストを処理
 * Customer PortalのセッションURLを生成して返す
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
    // 2. ユーザーのStripe Customer IDを取得
    // -----------------------------------------------------------------------
    const { data: subscription, error: subscriptionError } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id, plan_type")
      .eq("user_id", user.id)
      .single();

    if (subscriptionError) {
      console.error("サブスクリプション取得エラー:", subscriptionError);
      return NextResponse.json(
        { error: "サブスクリプション情報の取得に失敗しました" },
        { status: 500 }
      );
    }

    // Stripe Customer IDが無い場合（無料プランで決済履歴がない）
    if (!subscription?.stripe_customer_id) {
      return NextResponse.json(
        {
          error:
            "Stripe顧客情報が見つかりません。" +
            "まず有料プランにアップグレードしてください。",
        },
        { status: 400 }
      );
    }

    // -----------------------------------------------------------------------
    // 3. オプションでリターンURLを取得
    // -----------------------------------------------------------------------
    let returnUrl: string;

    try {
      const body = await request.json();
      returnUrl = body.returnUrl;
    } catch {
      // JSONボディが無い場合はデフォルトURLを使用
      returnUrl = "";
    }

    // アプリのベースURLを取得
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      (process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:3000");

    // リターンURLが指定されていなければ設定画面に戻る
    if (!returnUrl) {
      returnUrl = `${baseUrl}/settings`;
    }

    // -----------------------------------------------------------------------
    // 4. Customer Portal Sessionの作成
    // -----------------------------------------------------------------------
    const stripe = getStripeClient();

    // Portalセッションを作成
    // これがStripeのプラン管理画面の設定になる
    const portalSession = await stripe.billingPortal.sessions.create({
      // 対象の顧客ID
      customer: subscription.stripe_customer_id,

      // Portal画面を閉じた後のリダイレクト先
      return_url: returnUrl,
    });

    // -----------------------------------------------------------------------
    // 5. Portal URLを返す
    // -----------------------------------------------------------------------
    return NextResponse.json({
      success: true,
      portalUrl: portalSession.url,
    });
  } catch (error: unknown) {
    // エラーの詳細をログに記録
    console.error("Portal Session作成エラー:", error);

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
          "ポータルセッションの作成中にエラーが発生しました",
      },
      { status: 500 }
    );
  }
}

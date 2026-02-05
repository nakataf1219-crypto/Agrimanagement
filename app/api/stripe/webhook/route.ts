/**
 * Stripe Webhook受信APIエンドポイント
 *
 * ビジネス上の流れ:
 * 1. ユーザーがStripeで決済を完了
 * 2. StripeがこのWebhookエンドポイントに決済完了の通知を送信
 * 3. 通知を検証し、正当なものであればデータベースを更新
 * 4. ユーザーのサブスクリプション状態が有効になる
 *
 * 処理するイベント:
 * - checkout.session.completed: 新規サブスクリプション開始
 * - customer.subscription.updated: プラン変更・更新
 * - customer.subscription.deleted: 解約
 * - invoice.payment_failed: 支払い失敗
 *
 * セキュリティ:
 * - Stripe署名を検証し、不正なリクエストを拒否
 * - service_roleキーを使用してRLSをバイパス（サーバー間通信のため）
 */

import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { getStripeClient, PRICE_ID_TO_PLAN, type PlanType } from "@/lib/stripe";
import {
  upsertSubscription,
  cancelSubscription,
  revertToFreePlan,
} from "@/lib/subscription";

// =============================================================================
// Supabase Service Roleクライアント
// =============================================================================

/**
 * Service Roleキーを使用したSupabaseクライアントを作成
 *
 * ビジネス上の役割：
 * - Webhookはユーザーのセッションを持たないため、RLSをバイパスする必要がある
 * - service_roleキーはサーバーサイドでのみ使用可能（絶対にクライアントに露出させない）
 *
 * @returns Supabaseクライアント（RLSバイパス）
 */
function createSupabaseAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Supabase環境変数が設定されていません。" +
        "NEXT_PUBLIC_SUPABASE_URL と SUPABASE_SERVICE_ROLE_KEY を確認してください。"
    );
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// =============================================================================
// ヘルパー関数
// =============================================================================

/**
 * Stripeの署名を検証
 *
 * ビジネス上の役割：
 * - リクエストが本当にStripeから送られたものか確認
 * - 不正なリクエスト（攻撃者による偽装）を防ぐ
 *
 * @param body - リクエストボディ（生データ）
 * @param signature - Stripeから送られた署名
 * @returns 検証済みのStripeイベント
 */
function verifyStripeWebhook(body: string, signature: string): Stripe.Event {
  const stripe = getStripeClient();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    throw new Error(
      "STRIPE_WEBHOOK_SECRET が設定されていません。" +
        "Stripeダッシュボードでエンドポイントを設定し、Webhook Secretを取得してください。"
    );
  }

  // 署名を検証し、イベントを構築
  return stripe.webhooks.constructEvent(body, signature, webhookSecret);
}

/**
 * Price IDからプランタイプを取得
 *
 * @param priceId - Stripe Price ID
 * @returns プランタイプ（不明な場合はnull）
 */
function getPlanTypeFromPriceId(priceId: string): PlanType | null {
  return PRICE_ID_TO_PLAN[priceId] || null;
}

// =============================================================================
// イベントハンドラー
// =============================================================================

/**
 * checkout.session.completed イベントを処理
 * 新規サブスクリプションが開始された時に呼ばれる
 *
 * @param session - Checkout Sessionオブジェクト
 */
async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session
): Promise<void> {
  console.log("Checkout完了:", session.id);

  const stripe = getStripeClient();
  const supabase = createSupabaseAdminClient();

  // subscriptionが文字列の場合（IDのみ）、詳細を取得
  const subscriptionId =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription?.id;

  if (!subscriptionId) {
    console.error("サブスクリプションIDが見つかりません");
    return;
  }

  // サブスクリプションの詳細を取得
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);

  // メタデータからSupabaseユーザーIDを取得
  const userId =
    subscription.metadata?.supabase_user_id ||
    session.metadata?.supabase_user_id;

  if (!userId) {
    console.error("ユーザーIDがメタデータに見つかりません");
    return;
  }

  // Price IDからプランタイプを特定
  const priceId = subscription.items.data[0]?.price?.id;
  const planType = priceId ? getPlanTypeFromPriceId(priceId) : null;

  if (!planType) {
    console.error("不明なPrice ID:", priceId);
    return;
  }

  // Customer IDを取得
  const customerId =
    typeof session.customer === "string"
      ? session.customer
      : session.customer?.id || "";

  // サブスクリプション情報をデータベースに保存
  await upsertSubscription(
    supabase,
    userId,
    customerId,
    subscriptionId,
    planType,
    "active",
    new Date(subscription.current_period_start * 1000),
    new Date(subscription.current_period_end * 1000)
  );

  console.log(`ユーザー ${userId} のサブスクリプションを ${planType} に更新しました`);
}

/**
 * customer.subscription.updated イベントを処理
 * サブスクリプションが更新された時に呼ばれる（プラン変更、更新など）
 *
 * @param subscription - Subscriptionオブジェクト
 */
async function handleSubscriptionUpdated(
  subscription: Stripe.Subscription
): Promise<void> {
  console.log("サブスクリプション更新:", subscription.id);

  const supabase = createSupabaseAdminClient();

  // メタデータからSupabaseユーザーIDを取得
  const userId = subscription.metadata?.supabase_user_id;

  if (!userId) {
    // メタデータにない場合は、データベースからsubscription_idで検索
    const { data: existingSubscription } = await supabase
      .from("subscriptions")
      .select("user_id")
      .eq("stripe_subscription_id", subscription.id)
      .single();

    if (!existingSubscription?.user_id) {
      console.error("ユーザーIDが見つかりません:", subscription.id);
      return;
    }

    // Price IDからプランタイプを特定
    const priceId = subscription.items.data[0]?.price?.id;
    const planType = priceId ? getPlanTypeFromPriceId(priceId) : null;

    if (!planType) {
      console.error("不明なPrice ID:", priceId);
      return;
    }

    // Customer IDを取得
    const customerId =
      typeof subscription.customer === "string"
        ? subscription.customer
        : subscription.customer?.id || "";

    // ステータスをマッピング
    let status: "active" | "canceled" | "past_due" | "trialing" = "active";
    if (subscription.status === "canceled" || subscription.status === "incomplete_expired") {
      status = "canceled";
    } else if (subscription.status === "past_due" || subscription.status === "unpaid") {
      status = "past_due";
    } else if (subscription.status === "trialing") {
      status = "trialing";
    }

    // サブスクリプション情報を更新
    await upsertSubscription(
      supabase,
      existingSubscription.user_id,
      customerId,
      subscription.id,
      planType,
      status,
      new Date(subscription.current_period_start * 1000),
      new Date(subscription.current_period_end * 1000)
    );

    console.log(
      `ユーザー ${existingSubscription.user_id} のサブスクリプションを更新しました`
    );
    return;
  }

  // メタデータにユーザーIDがある場合
  const priceId = subscription.items.data[0]?.price?.id;
  const planType = priceId ? getPlanTypeFromPriceId(priceId) : null;

  if (!planType) {
    console.error("不明なPrice ID:", priceId);
    return;
  }

  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer?.id || "";

  let status: "active" | "canceled" | "past_due" | "trialing" = "active";
  if (subscription.status === "canceled" || subscription.status === "incomplete_expired") {
    status = "canceled";
  } else if (subscription.status === "past_due" || subscription.status === "unpaid") {
    status = "past_due";
  } else if (subscription.status === "trialing") {
    status = "trialing";
  }

  await upsertSubscription(
    supabase,
    userId,
    customerId,
    subscription.id,
    planType,
    status,
    new Date(subscription.current_period_start * 1000),
    new Date(subscription.current_period_end * 1000)
  );

  console.log(`ユーザー ${userId} のサブスクリプションを ${planType} に更新しました`);
}

/**
 * customer.subscription.deleted イベントを処理
 * サブスクリプションが解約された時に呼ばれる
 *
 * @param subscription - Subscriptionオブジェクト
 */
async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription
): Promise<void> {
  console.log("サブスクリプション解約:", subscription.id);

  const supabase = createSupabaseAdminClient();

  // サブスクリプションを解約状態に更新
  await cancelSubscription(supabase, subscription.id);

  // 契約期間終了後は無料プランに戻す
  // 注意: cancel_at_period_end が true の場合、期間終了まで有料機能が使える
  if (!subscription.cancel_at_period_end) {
    // 即時解約の場合は無料プランに戻す
    await revertToFreePlan(supabase, subscription.id);
    console.log(`サブスクリプション ${subscription.id} を無料プランに戻しました`);
  } else {
    console.log(
      `サブスクリプション ${subscription.id} は期間終了時に無料プランに戻ります`
    );
  }
}

/**
 * invoice.payment_failed イベントを処理
 * 支払いが失敗した時に呼ばれる
 *
 * @param invoice - Invoiceオブジェクト
 */
async function handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
  console.log("支払い失敗:", invoice.id);

  const supabase = createSupabaseAdminClient();

  // サブスクリプションIDを取得
  const subscriptionId =
    typeof invoice.subscription === "string"
      ? invoice.subscription
      : invoice.subscription?.id;

  if (!subscriptionId) {
    console.error("サブスクリプションIDが見つかりません");
    return;
  }

  // ステータスを past_due に更新
  const { error } = await supabase
    .from("subscriptions")
    .update({
      status: "past_due",
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_subscription_id", subscriptionId);

  if (error) {
    console.error("ステータス更新エラー:", error);
    return;
  }

  console.log(`サブスクリプション ${subscriptionId} を past_due に更新しました`);

  // TODO: ユーザーにメール通知を送る（将来の拡張）
}

// =============================================================================
// APIエンドポイント
// =============================================================================

/**
 * POSTリクエストを処理
 * StripeからのWebhookイベントを受信して処理
 */
export async function POST(request: NextRequest) {
  try {
    // -----------------------------------------------------------------------
    // 1. リクエストの検証準備
    // -----------------------------------------------------------------------
    // 生のリクエストボディを取得（署名検証に必要）
    const body = await request.text();

    // Stripe署名ヘッダーを取得
    const headersList = await headers();
    const signature = headersList.get("stripe-signature");

    if (!signature) {
      console.error("Stripe署名がありません");
      return NextResponse.json(
        { error: "Stripe署名が必要です" },
        { status: 400 }
      );
    }

    // -----------------------------------------------------------------------
    // 2. Webhook署名の検証
    // -----------------------------------------------------------------------
    let event: Stripe.Event;
    try {
      event = verifyStripeWebhook(body, signature);
    } catch (verifyError) {
      console.error("Webhook署名検証エラー:", verifyError);
      return NextResponse.json(
        { error: "Webhook署名の検証に失敗しました" },
        { status: 400 }
      );
    }

    // -----------------------------------------------------------------------
    // 3. イベントタイプに応じた処理
    // -----------------------------------------------------------------------
    console.log("Webhookイベント受信:", event.type);

    switch (event.type) {
      // 新規サブスクリプション開始
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session);
        break;
      }

      // サブスクリプション更新（プラン変更、自動更新など）
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(subscription);
        break;
      }

      // サブスクリプション解約
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription);
        break;
      }

      // 支払い失敗
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentFailed(invoice);
        break;
      }

      // その他のイベントは無視（ログのみ）
      default:
        console.log("未処理のイベントタイプ:", event.type);
    }

    // -----------------------------------------------------------------------
    // 4. 成功レスポンスを返す
    // -----------------------------------------------------------------------
    // Stripeは200レスポンスを期待している
    // 200以外を返すとStripeはリトライを行う
    return NextResponse.json({ received: true });
  } catch (error: unknown) {
    // エラーの詳細をログに記録
    console.error("Webhookエラー:", error);

    // 500エラーを返すとStripeがリトライするため、
    // 意図的にリトライさせたい場合以外は200を返すこともある
    return NextResponse.json(
      {
        error:
          (error instanceof Error ? error.message : null) ||
          "Webhook処理中にエラーが発生しました",
      },
      { status: 500 }
    );
  }
}

// =============================================================================
// Next.js設定
// =============================================================================

/**
 * bodyParserを無効化
 * Stripeの署名検証には生のリクエストボディが必要なため
 */
export const config = {
  api: {
    bodyParser: false,
  },
};

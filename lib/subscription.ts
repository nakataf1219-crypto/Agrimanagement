/**
 * サブスクリプション・使用量管理ユーティリティ
 *
 * このファイルは、ユーザーのプラン状態と使用量を管理するための関数を提供します。
 *
 * 主な機能：
 * - ユーザーのサブスクリプション情報取得
 * - 使用量の制限チェック
 * - 使用量のインクリメント（カウントアップ）
 * - 月次使用状況の取得
 */

import { SupabaseClient } from "@supabase/supabase-js";
import {
  type PlanType,
  type UsageFeature,
  PLAN_LIMITS,
  isFreePlan,
  getFeatureLimit,
} from "./stripe";

// =============================================================================
// 型定義
// =============================================================================

/**
 * サブスクリプション情報の型
 * データベースの subscriptions テーブルと対応
 */
export interface Subscription {
  id: string;
  userId: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  planType: PlanType;
  status: "active" | "canceled" | "past_due" | "trialing";
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 使用量情報の型
 * データベースの usage_tracking テーブルと対応
 */
export interface UsageTracking {
  id: string;
  userId: string;
  ocrCount: number;
  exportCount: number;
  aiAssistantCount: number;
  periodStart: Date;
  createdAt: Date;
}

/**
 * 使用制限チェックの結果
 */
export interface UsageLimitCheckResult {
  /** 制限内であればtrue */
  allowed: boolean;
  /** 現在の使用回数 */
  currentUsage: number;
  /** 上限値（Infinityは無制限） */
  limit: number;
  /** 残り使用可能回数 */
  remaining: number;
  /** ユーザーのプランタイプ */
  planType: PlanType;
}

/**
 * 月次使用状況の型
 */
export interface MonthlyUsage {
  ocr: { used: number; limit: number; remaining: number };
  export: { used: number; limit: number; remaining: number };
  aiAssistant: { used: number; limit: number; remaining: number };
  periodStart: Date;
  planType: PlanType;
}

// =============================================================================
// データベース操作関数
// =============================================================================

/**
 * 現在の月の開始日を取得
 *
 * ビジネス上の役割：
 * - 使用量は月単位でリセットされるため、その月の1日を基準日とする
 * - 例: 2024年1月15日 → 2024年1月1日
 *
 * @returns その月の1日（Date型）
 */
export function getCurrentPeriodStart(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

/**
 * 日付を「YYYY-MM-DD」形式の文字列に変換
 *
 * @param date - 変換対象の日付
 * @returns YYYY-MM-DD形式の文字列
 */
function formatDateForDatabase(date: Date): string {
  return date.toISOString().split("T")[0];
}

/**
 * ユーザーのサブスクリプション情報を取得
 *
 * ビジネス上の役割：
 * - ユーザーが現在どのプランに加入しているかを確認
 * - 機能制限の判断や、設定画面でのプラン表示に使用
 *
 * @param supabase - Supabaseクライアント（認証済み）
 * @param userId - 対象ユーザーのID
 * @returns サブスクリプション情報（見つからない場合はnull）
 */
export async function getUserSubscription(
  supabase: SupabaseClient,
  userId: string
): Promise<Subscription | null> {
  // subscriptions テーブルからユーザーのデータを取得
  const { data, error } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error) {
    // PGRST116 はデータが見つからない場合のエラーコード
    if (error.code === "PGRST116") {
      return null;
    }
    console.error("サブスクリプション取得エラー:", error);
    throw new Error("サブスクリプション情報の取得に失敗しました");
  }

  // データベースのカラム名（スネークケース）をキャメルケースに変換
  return {
    id: data.id,
    userId: data.user_id,
    stripeCustomerId: data.stripe_customer_id,
    stripeSubscriptionId: data.stripe_subscription_id,
    planType: data.plan_type as PlanType,
    status: data.status,
    currentPeriodStart: data.current_period_start
      ? new Date(data.current_period_start)
      : null,
    currentPeriodEnd: data.current_period_end
      ? new Date(data.current_period_end)
      : null,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
  };
}

/**
 * ユーザーのプランタイプを取得（簡易版）
 *
 * ビジネス上の役割：
 * - プランタイプだけが必要な場合に使用（全情報を取得するより軽量）
 * - サブスクリプションが見つからない場合は「free」を返す（新規ユーザー）
 *
 * @param supabase - Supabaseクライアント（認証済み）
 * @param userId - 対象ユーザーのID
 * @returns プランタイプ
 */
export async function getUserPlanType(
  supabase: SupabaseClient,
  userId: string
): Promise<PlanType> {
  const subscription = await getUserSubscription(supabase, userId);
  return subscription?.planType ?? "free";
}

/**
 * 今月の使用量レコードを取得または作成
 *
 * ビジネス上の役割：
 * - その月の使用量レコードがなければ新規作成（月初めや新規ユーザー）
 * - 既に存在すればそのレコードを返す
 *
 * @param supabase - Supabaseクライアント（認証済み）
 * @param userId - 対象ユーザーのID
 * @returns 使用量レコード
 */
async function getOrCreateUsageRecord(
  supabase: SupabaseClient,
  userId: string
): Promise<UsageTracking> {
  const periodStart = getCurrentPeriodStart();
  const periodStartString = formatDateForDatabase(periodStart);

  // まず既存のレコードを検索
  const { data: existingRecord, error: selectError } = await supabase
    .from("usage_tracking")
    .select("*")
    .eq("user_id", userId)
    .eq("period_start", periodStartString)
    .single();

  // レコードが見つかった場合はそれを返す
  if (existingRecord && !selectError) {
    return {
      id: existingRecord.id,
      userId: existingRecord.user_id,
      ocrCount: existingRecord.ocr_count,
      exportCount: existingRecord.export_count,
      aiAssistantCount: existingRecord.ai_assistant_count,
      periodStart: new Date(existingRecord.period_start),
      createdAt: new Date(existingRecord.created_at),
    };
  }

  // レコードが見つからない場合は新規作成
  const { data: newRecord, error: insertError } = await supabase
    .from("usage_tracking")
    .insert({
      user_id: userId,
      period_start: periodStartString,
      ocr_count: 0,
      export_count: 0,
      ai_assistant_count: 0,
    })
    .select()
    .single();

  if (insertError) {
    console.error("使用量レコード作成エラー:", insertError);
    throw new Error("使用量レコードの作成に失敗しました");
  }

  return {
    id: newRecord.id,
    userId: newRecord.user_id,
    ocrCount: newRecord.ocr_count,
    exportCount: newRecord.export_count,
    aiAssistantCount: newRecord.ai_assistant_count,
    periodStart: new Date(newRecord.period_start),
    createdAt: new Date(newRecord.created_at),
  };
}

// =============================================================================
// 使用量制限チェック
// =============================================================================

/**
 * 指定した機能の使用が許可されているかチェック
 *
 * ビジネス上の役割：
 * - OCR、出力、AIアシスタント使用前に、制限内かどうかを確認
 * - 有料プランユーザーは常に許可（無制限）
 * - 無料プランユーザーは月間上限内であれば許可
 *
 * 使用例：
 * ```typescript
 * const result = await checkUsageLimit(supabase, userId, 'ocr');
 * if (!result.allowed) {
 *   // 制限到達時のアップグレード誘導
 *   showUpgradeModal(result);
 * }
 * ```
 *
 * @param supabase - Supabaseクライアント（認証済み）
 * @param userId - 対象ユーザーのID
 * @param feature - チェック対象の機能
 * @returns 使用制限チェックの結果
 */
export async function checkUsageLimit(
  supabase: SupabaseClient,
  userId: string,
  feature: UsageFeature
): Promise<UsageLimitCheckResult> {
  // ユーザーのプランタイプを取得
  const planType = await getUserPlanType(supabase, userId);

  // 有料プランは常に許可（無制限）
  if (!isFreePlan(planType)) {
    return {
      allowed: true,
      currentUsage: 0,
      limit: Infinity,
      remaining: Infinity,
      planType,
    };
  }

  // 無料プランの場合、使用量をチェック
  const usageRecord = await getOrCreateUsageRecord(supabase, userId);
  const limit = getFeatureLimit(planType, feature);

  // 機能ごとの現在の使用回数を取得
  let currentUsage: number;
  switch (feature) {
    case "ocr":
      currentUsage = usageRecord.ocrCount;
      break;
    case "export":
      currentUsage = usageRecord.exportCount;
      break;
    case "ai_assistant":
      currentUsage = usageRecord.aiAssistantCount;
      break;
    default:
      currentUsage = 0;
  }

  const remaining = Math.max(0, limit - currentUsage);
  const allowed = currentUsage < limit;

  return {
    allowed,
    currentUsage,
    limit,
    remaining,
    planType,
  };
}

/**
 * 機能の使用回数をインクリメント（1増やす）
 *
 * ビジネス上の役割：
 * - 機能を使用した後に呼び出し、使用回数を記録
 * - 使用制限チェック→機能実行→インクリメントの順で使用
 *
 * 注意：
 * - checkUsageLimitで許可を確認してから呼び出すこと
 * - 有料プランでもカウントは行われる（将来の分析用）
 *
 * @param supabase - Supabaseクライアント（認証済み）
 * @param userId - 対象ユーザーのID
 * @param feature - インクリメント対象の機能
 */
export async function incrementUsage(
  supabase: SupabaseClient,
  userId: string,
  feature: UsageFeature
): Promise<void> {
  // 今月の使用量レコードを取得（なければ作成）
  const usageRecord = await getOrCreateUsageRecord(supabase, userId);

  // 機能に対応するカラム名を決定
  let columnName: string;
  switch (feature) {
    case "ocr":
      columnName = "ocr_count";
      break;
    case "export":
      columnName = "export_count";
      break;
    case "ai_assistant":
      columnName = "ai_assistant_count";
      break;
    default:
      throw new Error(`不明な機能タイプ: ${feature}`);
  }

  // 現在のカウントを取得
  let currentCount: number;
  switch (feature) {
    case "ocr":
      currentCount = usageRecord.ocrCount;
      break;
    case "export":
      currentCount = usageRecord.exportCount;
      break;
    case "ai_assistant":
      currentCount = usageRecord.aiAssistantCount;
      break;
    default:
      currentCount = 0;
  }

  // カウントを1増やして更新
  const { error } = await supabase
    .from("usage_tracking")
    .update({ [columnName]: currentCount + 1 })
    .eq("id", usageRecord.id);

  if (error) {
    console.error("使用量更新エラー:", error);
    throw new Error("使用量の更新に失敗しました");
  }
}

// =============================================================================
// 使用状況取得
// =============================================================================

/**
 * ユーザーの今月の使用状況を取得
 *
 * ビジネス上の役割：
 * - 設定画面などで、現在の使用状況を表示
 * - 無料プランユーザーに残り使用回数を知らせる
 *
 * @param supabase - Supabaseクライアント（認証済み）
 * @param userId - 対象ユーザーのID
 * @returns 今月の使用状況
 */
export async function getMonthlyUsage(
  supabase: SupabaseClient,
  userId: string
): Promise<MonthlyUsage> {
  // プランタイプと使用量を取得
  const planType = await getUserPlanType(supabase, userId);
  const usageRecord = await getOrCreateUsageRecord(supabase, userId);

  // プランに応じた上限を取得
  const limits = PLAN_LIMITS[planType];

  return {
    ocr: {
      used: usageRecord.ocrCount,
      limit: limits.ocrLimit,
      remaining: Math.max(0, limits.ocrLimit - usageRecord.ocrCount),
    },
    export: {
      used: usageRecord.exportCount,
      limit: limits.exportLimit,
      remaining: Math.max(0, limits.exportLimit - usageRecord.exportCount),
    },
    aiAssistant: {
      used: usageRecord.aiAssistantCount,
      limit: limits.aiAssistantLimit,
      remaining: Math.max(0, limits.aiAssistantLimit - usageRecord.aiAssistantCount),
    },
    periodStart: usageRecord.periodStart,
    planType,
  };
}

// =============================================================================
// サブスクリプション管理（サーバーサイド用）
// =============================================================================

/**
 * サブスクリプションを作成または更新
 *
 * ビジネス上の役割：
 * - Stripe Webhookから呼び出され、決済完了後にサブスクリプション情報を更新
 * - プランのアップグレード/ダウングレードを反映
 *
 * 注意：
 * - この関数はサーバーサイド（API Route）でのみ使用
 * - service_roleキーを持つSupabaseクライアントで呼び出すこと（RLSバイパス）
 *
 * @param supabase - Supabaseクライアント（service_role）
 * @param userId - 対象ユーザーのID
 * @param stripeCustomerId - StripeのCustomer ID
 * @param stripeSubscriptionId - StripeのSubscription ID
 * @param planType - 新しいプランタイプ
 * @param status - サブスクリプションの状態
 * @param currentPeriodStart - 契約期間の開始日
 * @param currentPeriodEnd - 契約期間の終了日
 */
export async function upsertSubscription(
  supabase: SupabaseClient,
  userId: string,
  stripeCustomerId: string,
  stripeSubscriptionId: string,
  planType: PlanType,
  status: "active" | "canceled" | "past_due" | "trialing",
  currentPeriodStart: Date,
  currentPeriodEnd: Date
): Promise<void> {
  const { error } = await supabase.from("subscriptions").upsert(
    {
      user_id: userId,
      stripe_customer_id: stripeCustomerId,
      stripe_subscription_id: stripeSubscriptionId,
      plan_type: planType,
      status,
      current_period_start: currentPeriodStart.toISOString(),
      current_period_end: currentPeriodEnd.toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: "user_id",
    }
  );

  if (error) {
    console.error("サブスクリプション更新エラー:", error);
    throw new Error("サブスクリプションの更新に失敗しました");
  }
}

/**
 * サブスクリプションを解約状態に更新
 *
 * ビジネス上の役割：
 * - Stripe Webhookから呼び出され、解約処理を反映
 * - プランは維持されるが、statusがcanceledになる
 * - current_period_endまでは機能を利用可能
 *
 * @param supabase - Supabaseクライアント（service_role）
 * @param stripeSubscriptionId - StripeのSubscription ID
 */
export async function cancelSubscription(
  supabase: SupabaseClient,
  stripeSubscriptionId: string
): Promise<void> {
  const { error } = await supabase
    .from("subscriptions")
    .update({
      status: "canceled",
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_subscription_id", stripeSubscriptionId);

  if (error) {
    console.error("サブスクリプション解約エラー:", error);
    throw new Error("サブスクリプションの解約処理に失敗しました");
  }
}

/**
 * サブスクリプションを無料プランに戻す
 *
 * ビジネス上の役割：
 * - 契約期間終了後に呼び出され、ユーザーを無料プランに戻す
 * - Stripe情報はクリアされる
 *
 * @param supabase - Supabaseクライアント（service_role）
 * @param stripeSubscriptionId - StripeのSubscription ID
 */
export async function revertToFreePlan(
  supabase: SupabaseClient,
  stripeSubscriptionId: string
): Promise<void> {
  const { error } = await supabase
    .from("subscriptions")
    .update({
      plan_type: "free",
      status: "active",
      stripe_subscription_id: null,
      current_period_start: null,
      current_period_end: null,
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_subscription_id", stripeSubscriptionId);

  if (error) {
    console.error("無料プラン戻しエラー:", error);
    throw new Error("無料プランへの戻し処理に失敗しました");
  }
}

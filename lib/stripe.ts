/**
 * Stripe決済クライアントと設定
 *
 * このファイルは、Stripe決済との連携に必要な設定とクライアントを提供します。
 *
 * 主な機能：
 * - Stripeクライアントの初期化
 * - プラン別の使用制限の定義
 * - Stripe Price ID（商品価格ID）の管理
 */

import Stripe from "stripe";

// =============================================================================
// 型定義
// =============================================================================

/**
 * プランの種類
 * - free: 無料プラン（制限あり）
 * - standard: スタンダードプラン（¥2,980/月）
 * - premium: プレミアムプラン（¥4,980/月）
 * - pro_yearly: 年額プロプラン（¥35,760/年）
 */
export type PlanType = "free" | "standard" | "premium" | "pro_yearly";

/**
 * 機能の使用制限を定義する型
 * Infinityは無制限を表す
 */
export interface PlanLimits {
  /** OCR（レシート読み取り）の月間使用上限 */
  ocrLimit: number;
  /** エクスポート（CSV/PDF出力）の月間使用上限 */
  exportLimit: number;
  /** AIアシスタントの月間使用上限 */
  aiAssistantLimit: number;
}

/**
 * 使用量追跡の対象となる機能の種類
 */
export type UsageFeature = "ocr" | "export" | "ai_assistant";

// =============================================================================
// プラン設定
// =============================================================================

/**
 * 各プランの使用制限
 *
 * ビジネス上の役割：
 * - 無料プランユーザーには機能制限を設け、有料プランへのアップグレードを促す
 * - 有料プランユーザーは全機能を無制限で使用可能
 *
 * 制限値の根拠：
 * - OCR 50回/月: 一般的な農家の月間レシート枚数をカバー
 * - 出力 3回/月: 月次報告用途を想定
 * - AI 10回/月: 基本的な質問対応を想定
 */
export const PLAN_LIMITS: Record<PlanType, PlanLimits> = {
  free: {
    ocrLimit: 50,
    exportLimit: 3,
    aiAssistantLimit: 10,
  },
  standard: {
    ocrLimit: Infinity,
    exportLimit: Infinity,
    aiAssistantLimit: Infinity,
  },
  premium: {
    ocrLimit: Infinity,
    exportLimit: Infinity,
    aiAssistantLimit: Infinity,
  },
  pro_yearly: {
    ocrLimit: Infinity,
    exportLimit: Infinity,
    aiAssistantLimit: Infinity,
  },
};

/**
 * Stripe Price ID（価格ID）の定義
 *
 * 注意：これらのIDはStripeダッシュボードで商品・価格を作成した際に発行されます。
 * 本番環境では実際のPrice IDに置き換えてください。
 *
 * 設定手順：
 * 1. Stripeダッシュボード（https://dashboard.stripe.com/products）にアクセス
 * 2. 「商品を追加」から各プランの商品を作成
 * 3. 価格設定で繰り返し請求（月額/年額）を選択
 * 4. 作成された price_xxx のIDをここに設定
 */
export const STRIPE_PRICE_IDS = {
  /** スタンダードプラン（月額¥2,980） */
  standard: process.env.STRIPE_PRICE_STANDARD_MONTHLY || "price_standard_monthly",
  /** プレミアムプラン（月額¥4,980） */
  premium: process.env.STRIPE_PRICE_PREMIUM_MONTHLY || "price_premium_monthly",
  /** 年額プロプラン（年額¥35,760） */
  pro_yearly: process.env.STRIPE_PRICE_PRO_YEARLY || "price_pro_yearly",
} as const;

/**
 * Price IDからプランタイプへのマッピング
 *
 * ビジネス上の役割：
 * - Webhook受信時にStripeから送られるPrice IDをプランタイプに変換
 * - サブスクリプション状態の更新に使用
 */
export const PRICE_ID_TO_PLAN: Record<string, PlanType> = {
  [STRIPE_PRICE_IDS.standard]: "standard",
  [STRIPE_PRICE_IDS.premium]: "premium",
  [STRIPE_PRICE_IDS.pro_yearly]: "pro_yearly",
};

/**
 * プランの表示情報
 *
 * ビジネス上の役割：
 * - 料金ページや設定画面でプラン情報を表示する際に使用
 * - ユーザーにわかりやすい名称と価格を提供
 */
export const PLAN_DISPLAY_INFO: Record<
  PlanType,
  {
    name: string;
    price: string;
    description: string;
    features: string[];
  }
> = {
  free: {
    name: "無料プラン",
    price: "¥0",
    description: "基本機能をお試しいただけます",
    features: [
      "OCRレシート読み取り（50回/月）",
      "データ出力（3回/月）",
      "AIアシスタント（10回/月）",
      "経費・売上管理",
    ],
  },
  standard: {
    name: "スタンダード",
    price: "¥2,980/月",
    description: "個人農家におすすめ",
    features: [
      "OCRレシート読み取り（無制限）",
      "データ出力（無制限）",
      "AIアシスタント（無制限）",
      "経費・売上管理",
      "詳細な分析レポート",
    ],
  },
  premium: {
    name: "プレミアム",
    price: "¥4,980/月",
    description: "法人・大規模農家向け",
    features: [
      "スタンダードの全機能",
      "優先サポート",
      "データ引継ぎサポート",
      "カスタムレポート",
    ],
  },
  pro_yearly: {
    name: "年額プロ",
    price: "¥35,760/年",
    description: "年払いで2ヶ月分お得",
    features: [
      "プレミアムの全機能",
      "年額払いで2ヶ月分お得",
      "長期契約特典",
    ],
  },
};

// =============================================================================
// Stripeクライアント
// =============================================================================

/**
 * Stripeクライアントのインスタンスを取得
 *
 * ビジネス上の役割：
 * - Stripe APIへのリクエストを送信するためのクライアント
 * - Checkout Session作成、顧客管理、Webhook検証などに使用
 *
 * 注意：
 * - サーバーサイドでのみ使用可能（Secret Keyを使用するため）
 * - クライアントサイドでは絶対に使用しないこと（セキュリティリスク）
 *
 * @throws Error - STRIPE_SECRET_KEY が設定されていない場合
 */
export function getStripeClient(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (!secretKey) {
    throw new Error(
      "Stripe環境変数が設定されていません。" +
        ".env.localファイルに STRIPE_SECRET_KEY を設定してください。" +
        "（Stripeダッシュボード > 開発者 > APIキーから取得できます）"
    );
  }

  // Stripeクライアントを作成して返す
  return new Stripe(secretKey, {
    // APIバージョンを明示的に指定（将来のバージョンアップ時の互換性のため）
    apiVersion: "2025-01-27.acacia",
    // TypeScript環境での型サポートを有効化
    typescript: true,
  });
}

/**
 * Stripeクライアントのシングルトンインスタンス
 *
 * ビジネス上の役割：
 * - 複数の場所でStripeクライアントを使い回す場合に便利
 * - APIリクエストのたびに新しいインスタンスを作成する必要がない
 *
 * 注意：
 * - 環境変数が設定されていない場合はnullになる
 * - 使用前に必ず null チェックを行うか、getStripeClient() を使用すること
 */
export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2025-01-27.acacia",
      typescript: true,
    })
  : null;

// =============================================================================
// ヘルパー関数
// =============================================================================

/**
 * プランが無料プランかどうかを判定
 *
 * @param planType - 判定対象のプランタイプ
 * @returns 無料プランの場合はtrue
 */
export function isFreePlan(planType: PlanType): boolean {
  return planType === "free";
}

/**
 * プランが有料プランかどうかを判定
 *
 * @param planType - 判定対象のプランタイプ
 * @returns 有料プランの場合はtrue
 */
export function isPaidPlan(planType: PlanType): boolean {
  return planType !== "free";
}

/**
 * 指定した機能の使用上限を取得
 *
 * @param planType - プランタイプ
 * @param feature - 機能の種類
 * @returns その機能の月間使用上限
 */
export function getFeatureLimit(planType: PlanType, feature: UsageFeature): number {
  const limits = PLAN_LIMITS[planType];

  switch (feature) {
    case "ocr":
      return limits.ocrLimit;
    case "export":
      return limits.exportLimit;
    case "ai_assistant":
      return limits.aiAssistantLimit;
    default:
      return 0;
  }
}

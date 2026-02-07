/**
 * 料金プラン比較テーブルコンポーネント
 *
 * ビジネス上の役割:
 * 全プランを並べて比較できるようにし、ユーザーが最適なプランを選びやすくする
 * - 4つのプランカードを横並びで表示
 * - スマホでは縦並びにレスポンシブ対応
 * - ログイン中のユーザーには現在のプラン表示
 */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PricingCard } from "./PricingCard";
import { PLAN_DISPLAY_INFO, type PlanType } from "@/lib/stripe";

/**
 * 料金テーブルのプロパティ型
 */
interface PricingTableProps {
  /** ログイン中のユーザーの現在のプランタイプ（未ログインの場合はnull） */
  currentPlanType?: PlanType | null;
  /** ユーザーがログインしているか */
  isLoggedIn?: boolean;
}

/**
 * プラン選択順序
 * 表示順序を制御するための配列
 */
const PLAN_ORDER: PlanType[] = ["free", "standard", "premium", "pro_yearly"];

/**
 * 料金プラン比較テーブル
 */
export function PricingTable({
  currentPlanType = null,
  isLoggedIn = false,
}: PricingTableProps) {
  const router = useRouter();

  // ローディング中のプランを管理
  const [loadingPlan, setLoadingPlan] = useState<PlanType | null>(null);

  /**
   * プラン選択時の処理
   *
   * ビジネスロジック:
   * - 無料プラン: ログインページまたはダッシュボードへ誘導
   * - 有料プラン: Stripe Checkoutセッションを作成してリダイレクト
   */
  async function handleSelectPlan(planType: PlanType) {
    // 無料プランの場合
    if (planType === "free") {
      if (isLoggedIn) {
        // 既にログイン済みならダッシュボードへ
        router.push("/dashboard");
      } else {
        // 未ログインなら新規登録へ
        router.push("/signup");
      }
      return;
    }

    // 有料プランの場合はCheckoutセッションを作成
    try {
      setLoadingPlan(planType);

      // 未ログインの場合はログインページへ
      if (!isLoggedIn) {
        router.push("/login?redirect=pricing");
        return;
      }

      // Checkout Session作成APIを呼び出し
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ planType }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "決済処理の開始に失敗しました");
      }

      const { url } = await response.json();

      // Stripe Checkoutページへリダイレクト
      if (url) {
        window.location.href = url;
      }
    } catch (error) {
      console.error("プラン選択エラー:", error);
      alert(
        error instanceof Error
          ? error.message
          : "プラン選択中にエラーが発生しました"
      );
    } finally {
      setLoadingPlan(null);
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {PLAN_ORDER.map((planType) => {
        const planInfo = PLAN_DISPLAY_INFO[planType];
        const isCurrentPlan = currentPlanType === planType;
        // スタンダードプランをおすすめとして強調
        const isRecommended = planType === "standard";

        return (
          <PricingCard
            key={planType}
            planType={planType}
            name={planInfo.name}
            price={planInfo.price}
            description={planInfo.description}
            features={planInfo.features}
            isCurrentPlan={isCurrentPlan}
            isRecommended={isRecommended}
            isLoading={loadingPlan === planType}
            onSelect={() => handleSelectPlan(planType)}
          />
        );
      })}
    </div>
  );
}

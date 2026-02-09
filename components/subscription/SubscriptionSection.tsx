/**
 * サブスクリプション管理セクション
 *
 * ビジネス上の役割:
 * 設定画面でユーザーのプラン情報と使用状況を表示し、
 * プラン変更や解約への導線を提供する
 */

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Crown,
  CreditCard,
  ExternalLink,
  Loader2,
  RefreshCw,
  Sparkles,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UsageDisplay } from "./UsageDisplay";
import { createSupabaseClient } from "@/lib/supabase/client";
import { getUserSubscription, type Subscription } from "@/lib/subscription";
import { PLAN_DISPLAY_INFO, type PlanType } from "@/lib/stripe";

/**
 * セクションのプロパティ型
 */
interface SubscriptionSectionProps {
  /** ユーザーID */
  userId: string;
}

/**
 * プランごとのアイコンを取得
 */
function getPlanIcon(planType: PlanType) {
  switch (planType) {
    case "free":
      return <Sparkles className="h-5 w-5" />;
    case "standard":
      return <Star className="h-5 w-5" />;
    case "premium":
      return <Crown className="h-5 w-5" />;
    case "pro_yearly":
      return <Crown className="h-5 w-5" />;
    default:
      return <Sparkles className="h-5 w-5" />;
  }
}

/**
 * ステータスに応じたバッジを取得
 */
function getStatusBadge(status: Subscription["status"]) {
  switch (status) {
    case "active":
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          有効
        </span>
      );
    case "canceled":
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
          解約予定
        </span>
      );
    case "past_due":
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
          支払い遅延
        </span>
      );
    case "trialing":
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          トライアル中
        </span>
      );
    default:
      return null;
  }
}

/**
 * サブスクリプション管理セクション
 */
export function SubscriptionSection({ userId }: SubscriptionSectionProps) {
  const router = useRouter();

  // サブスクリプション情報
  const [subscription, setSubscription] = useState<Subscription | null>(null);

  // ローディング状態
  const [isLoading, setIsLoading] = useState(true);

  // ポータル遷移中の状態
  const [isPortalLoading, setIsPortalLoading] = useState(false);

  // エラー状態
  const [error, setError] = useState<string | null>(null);

  /**
   * サブスクリプション情報を取得
   */
  async function fetchSubscription() {
    try {
      setIsLoading(true);
      setError(null);

      const supabase = createSupabaseClient();
      const sub = await getUserSubscription(supabase, userId);

      setSubscription(sub);
    } catch (err) {
      console.error("サブスクリプション取得エラー:", err);
      setError("サブスクリプション情報の取得に失敗しました");
    } finally {
      setIsLoading(false);
    }
  }

  // コンポーネントマウント時にデータ取得
  useEffect(() => {
    fetchSubscription();
  }, [userId]);

  /**
   * カスタマーポータルへ遷移
   *
   * ビジネスロジック:
   * - Stripeのカスタマーポータルでプラン変更・解約・支払い方法変更が可能
   * - 有料プランのユーザーのみ利用可能
   */
  async function handleOpenPortal() {
    try {
      setIsPortalLoading(true);

      const response = await fetch("/api/stripe/portal", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "ポータルの開始に失敗しました");
      }

      const { portalUrl } = await response.json();

      // Stripeカスタマーポータルへリダイレクト
      if (portalUrl) {
        window.location.href = portalUrl;
      }
    } catch (err) {
      console.error("ポータル遷移エラー:", err);
      alert(
        err instanceof Error
          ? err.message
          : "カスタマーポータルへの遷移に失敗しました"
      );
    } finally {
      setIsPortalLoading(false);
    }
  }

  /**
   * 料金ページへ遷移
   */
  function handleViewPricing() {
    router.push("/pricing");
  }

  // 現在のプランタイプ（サブスクリプションがない場合はfree）
  const currentPlanType: PlanType = subscription?.planType ?? "free";
  const planInfo = PLAN_DISPLAY_INFO[currentPlanType];

  // ローディング中
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2 text-lg">
            <CreditCard className="h-5 w-5 text-green-600" />
            プランと使用状況
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-green-600" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // エラー時
  if (error) {
    return (
      <Card>
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2 text-lg">
            <CreditCard className="h-5 w-5 text-green-600" />
            プランと使用状況
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="text-center py-4">
            <p className="text-sm text-red-600 mb-4">{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchSubscription}
              className="gap-1"
            >
              <RefreshCw className="h-4 w-4" />
              再読み込み
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle className="flex items-center gap-2 text-lg">
          <CreditCard className="h-5 w-5 text-green-600" />
          プランと使用状況
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6 space-y-6">
        {/* 現在のプラン表示 */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="p-2 bg-green-100 rounded-lg text-green-600">
                {getPlanIcon(currentPlanType)}
              </span>
              <div>
                <h4 className="font-semibold text-gray-900">{planInfo.name}</h4>
                <p className="text-sm text-gray-500">{planInfo.price}</p>
              </div>
            </div>
            {subscription && getStatusBadge(subscription.status)}
          </div>

          {/* 契約期間（有料プランの場合） */}
          {subscription?.currentPeriodEnd && currentPlanType !== "free" && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <p className="text-xs text-gray-500">
                {subscription.status === "canceled" ? (
                  <>
                    解約予定日:{" "}
                    {subscription.currentPeriodEnd.toLocaleDateString("ja-JP")}
                    <br />
                    <span className="text-amber-600">
                      この日まで現在のプランの機能をご利用いただけます
                    </span>
                  </>
                ) : (
                  <>
                    次回更新日:{" "}
                    {subscription.currentPeriodEnd.toLocaleDateString("ja-JP")}
                  </>
                )}
              </p>
            </div>
          )}
        </div>

        {/* 使用状況表示 */}
        <UsageDisplay userId={userId} />

        {/* アクションボタン */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* 有料プランの場合はカスタマーポータルへの導線 */}
          {currentPlanType !== "free" && subscription?.stripeCustomerId && (
            <Button
              variant="outline"
              onClick={handleOpenPortal}
              disabled={isPortalLoading}
              className="flex-1 gap-2"
            >
              {isPortalLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ExternalLink className="h-4 w-4" />
              )}
              プラン管理・支払い設定
            </Button>
          )}

          {/* 料金ページへの導線 */}
          <Button
            onClick={handleViewPricing}
            className={
              currentPlanType === "free"
                ? "flex-1 bg-green-600 hover:bg-green-700"
                : "flex-1"
            }
            variant={currentPlanType === "free" ? "default" : "outline"}
          >
            {currentPlanType === "free"
              ? "有料プランにアップグレード"
              : "プラン一覧を見る"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

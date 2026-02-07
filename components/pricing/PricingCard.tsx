/**
 * プランカードコンポーネント
 *
 * ビジネス上の役割:
 * 各料金プランの詳細を視覚的にわかりやすく表示するカード
 * - プラン名、価格、説明、機能一覧を表示
 * - 現在のプランの場合はバッジを表示
 * - プラン選択ボタンを配置
 */

"use client";

import { Check, Crown, Sparkles, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import type { PlanType } from "@/lib/stripe";
import { cn } from "@/lib/utils";

/**
 * プランカードのプロパティ型
 */
interface PricingCardProps {
  /** プランタイプ（free, standard, premium, pro_yearly） */
  planType: PlanType;
  /** プラン名（表示用） */
  name: string;
  /** 価格（表示用テキスト） */
  price: string;
  /** プランの説明文 */
  description: string;
  /** 機能一覧 */
  features: string[];
  /** 現在このプランに加入しているか */
  isCurrentPlan?: boolean;
  /** おすすめプランとしてハイライトするか */
  isRecommended?: boolean;
  /** 選択ボタンがクリックされた時のコールバック */
  onSelect?: () => void;
  /** ボタンが無効かどうか */
  isLoading?: boolean;
}

/**
 * プランごとのアイコンを取得
 * 各プランに合わせた視覚的な識別子を提供
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
      return null;
  }
}

/**
 * プランカードコンポーネント
 */
export function PricingCard({
  planType,
  name,
  price,
  description,
  features,
  isCurrentPlan = false,
  isRecommended = false,
  onSelect,
  isLoading = false,
}: PricingCardProps) {
  // おすすめプランか現在のプランかで、強調表示を切り替え
  const isHighlighted = isRecommended && !isCurrentPlan;

  return (
    <Card
      className={cn(
        "relative flex flex-col transition-all duration-200 hover:shadow-lg",
        // おすすめプランの場合は緑のボーダーで強調
        isHighlighted && "border-green-500 border-2 shadow-md",
        // 現在のプランの場合は薄い緑背景
        isCurrentPlan && "bg-green-50/50 border-green-200"
      )}
    >
      {/* おすすめバッジ */}
      {isHighlighted && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="bg-green-600 text-white text-xs font-semibold px-3 py-1 rounded-full">
            おすすめ
          </span>
        </div>
      )}

      {/* 現在のプランバッジ */}
      {isCurrentPlan && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="bg-gray-600 text-white text-xs font-semibold px-3 py-1 rounded-full">
            現在のプラン
          </span>
        </div>
      )}

      <CardHeader className="text-center pt-8">
        {/* プランアイコンと名前 */}
        <div className="flex items-center justify-center gap-2 mb-2">
          <span
            className={cn(
              "p-2 rounded-full",
              isHighlighted ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-600"
            )}
          >
            {getPlanIcon(planType)}
          </span>
        </div>
        <h3 className="text-xl font-bold text-gray-900">{name}</h3>
        <p className="text-sm text-gray-500">{description}</p>

        {/* 価格表示 */}
        <div className="mt-4">
          <span className="text-3xl font-bold text-gray-900">{price}</span>
          {planType !== "free" && planType !== "pro_yearly" && (
            <span className="text-gray-500 text-sm ml-1">（税込）</span>
          )}
          {planType === "pro_yearly" && (
            <span className="text-gray-500 text-sm ml-1">（税込・年額）</span>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1">
        {/* 機能一覧 */}
        <ul className="space-y-3">
          {features.map((feature, index) => (
            <li key={index} className="flex items-start gap-2">
              <Check className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
              <span className="text-sm text-gray-600">{feature}</span>
            </li>
          ))}
        </ul>
      </CardContent>

      <CardFooter className="pt-4">
        {/* 選択ボタン */}
        {isCurrentPlan ? (
          <Button
            className="w-full bg-gray-400 hover:bg-gray-400 cursor-not-allowed"
            disabled
          >
            利用中
          </Button>
        ) : planType === "free" ? (
          <Button
            className="w-full bg-gray-200 text-gray-700 hover:bg-gray-300"
            variant="outline"
            onClick={onSelect}
            disabled={isLoading}
          >
            {isLoading ? "処理中..." : "無料で始める"}
          </Button>
        ) : (
          <Button
            className={cn(
              "w-full",
              isHighlighted
                ? "bg-green-600 hover:bg-green-700"
                : "bg-green-500 hover:bg-green-600"
            )}
            onClick={onSelect}
            disabled={isLoading}
          >
            {isLoading ? "処理中..." : "このプランを選ぶ"}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}

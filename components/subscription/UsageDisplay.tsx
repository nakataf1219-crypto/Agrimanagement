/**
 * 使用状況表示コンポーネント
 *
 * ビジネス上の役割:
 * ユーザーが今月の機能使用状況を確認できる
 * - OCR、エクスポート、AIアシスタントの使用回数と残り回数を表示
 * - 無料プランユーザーには制限に近づいている場合に警告表示
 * - 有料プランユーザーには「無制限」を表示
 */

"use client";

import { useEffect, useState } from "react";
import { Camera, Download, MessageSquare, RefreshCw } from "lucide-react";
import { createSupabaseClient } from "@/lib/supabase/client";
import { getMonthlyUsage, type MonthlyUsage } from "@/lib/subscription";
import { cn } from "@/lib/utils";

/**
 * 使用状況表示のプロパティ型
 */
interface UsageDisplayProps {
  /** ユーザーID */
  userId: string;
}

/**
 * 使用状況アイテムのプロパティ型
 */
interface UsageItemProps {
  /** 機能名 */
  label: string;
  /** アイコン */
  icon: React.ReactNode;
  /** 使用回数 */
  used: number;
  /** 上限値（Infinityは無制限） */
  limit: number;
  /** 残り回数 */
  remaining: number;
}

/**
 * 個別の使用状況アイテム表示
 */
function UsageItem({ label, icon, used, limit, remaining }: UsageItemProps) {
  // 無制限かどうか
  const isUnlimited = !isFinite(limit);

  // 使用率（警告表示の判定に使用）
  const usagePercentage = isUnlimited ? 0 : (used / limit) * 100;

  // 残り少ない（80%以上使用）場合は警告色
  const isWarning = usagePercentage >= 80 && !isUnlimited;

  // 制限に達した場合は赤色
  const isExhausted = remaining === 0 && !isUnlimited;

  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
      {/* 機能名とアイコン */}
      <div className="flex items-center gap-3">
        <span className="p-2 bg-gray-100 rounded-lg text-gray-600">
          {icon}
        </span>
        <span className="text-sm font-medium text-gray-700">{label}</span>
      </div>

      {/* 使用状況 */}
      <div className="text-right">
        {isUnlimited ? (
          // 無制限の場合
          <span className="text-sm font-semibold text-green-600">無制限</span>
        ) : (
          // 制限ありの場合
          <div>
            <span
              className={cn(
                "text-sm font-semibold",
                isExhausted
                  ? "text-red-600"
                  : isWarning
                    ? "text-amber-600"
                    : "text-gray-900"
              )}
            >
              {used} / {limit}
            </span>
            <span className="text-xs text-gray-500 block">
              残り {remaining} 回
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * 使用状況表示メインコンポーネント
 */
export function UsageDisplay({ userId }: UsageDisplayProps) {
  // 使用状況データ
  const [usage, setUsage] = useState<MonthlyUsage | null>(null);

  // ローディング状態
  const [isLoading, setIsLoading] = useState(true);

  // エラー状態
  const [error, setError] = useState<string | null>(null);

  /**
   * 使用状況データを取得
   */
  async function fetchUsage() {
    try {
      setIsLoading(true);
      setError(null);

      const supabase = createSupabaseClient();
      const monthlyUsage = await getMonthlyUsage(supabase, userId);

      setUsage(monthlyUsage);
    } catch (err) {
      console.error("使用状況取得エラー:", err);
      setError("使用状況の取得に失敗しました");
    } finally {
      setIsLoading(false);
    }
  }

  // コンポーネントマウント時にデータ取得
  useEffect(() => {
    fetchUsage();
  }, [userId]);

  // ローディング中
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg p-4 border border-gray-200">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-200 rounded w-1/3" />
          <div className="h-10 bg-gray-100 rounded" />
          <div className="h-10 bg-gray-100 rounded" />
          <div className="h-10 bg-gray-100 rounded" />
        </div>
      </div>
    );
  }

  // エラー時
  if (error || !usage) {
    return (
      <div className="bg-white rounded-lg p-4 border border-red-200">
        <p className="text-sm text-red-600">{error || "データを取得できませんでした"}</p>
        <button
          onClick={fetchUsage}
          className="mt-2 text-sm text-green-600 hover:text-green-700 flex items-center gap-1"
        >
          <RefreshCw className="h-3 w-3" />
          再読み込み
        </button>
      </div>
    );
  }

  // 今月の期間表示
  const periodMonth = usage.periodStart.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
  });

  return (
    <div className="bg-white rounded-lg p-4 border border-gray-200">
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-semibold text-gray-900">
          今月の使用状況
        </h4>
        <span className="text-xs text-gray-500">{periodMonth}</span>
      </div>

      {/* 使用状況リスト */}
      <div>
        <UsageItem
          label="レシート読み取り（OCR）"
          icon={<Camera className="h-4 w-4" />}
          used={usage.ocr.used}
          limit={usage.ocr.limit}
          remaining={usage.ocr.remaining}
        />
        <UsageItem
          label="データエクスポート"
          icon={<Download className="h-4 w-4" />}
          used={usage.export.used}
          limit={usage.export.limit}
          remaining={usage.export.remaining}
        />
        <UsageItem
          label="AIアシスタント"
          icon={<MessageSquare className="h-4 w-4" />}
          used={usage.aiAssistant.used}
          limit={usage.aiAssistant.limit}
          remaining={usage.aiAssistant.remaining}
        />
      </div>

      {/* 無料プランの場合はアップグレード誘導 */}
      {usage.planType === "free" && (
        <div className="mt-4 pt-3 border-t border-gray-100">
          <p className="text-xs text-gray-500">
            制限を解除するには、有料プランへのアップグレードをご検討ください。
          </p>
        </div>
      )}
    </div>
  );
}

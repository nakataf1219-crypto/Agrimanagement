"use client";

import { TrendingUp, TrendingDown, Wallet } from "lucide-react";
import { KPICard } from "./KPICard";
import { LoadingKPICards } from "./LoadingKPICards";

/**
 * KPIデータの型定義
 */
interface KPIData {
  /** 今月の売上総額 */
  income: number;
  /** 今月の経費総額 */
  expenses: number;
  /** 営業利益（売上 - 経費） */
  profit: number;
}

/**
 * KPIセクションのプロパティ
 */
interface KPISectionProps {
  /** KPIデータ */
  kpiData: KPIData;
  /** データ読み込み中かどうか */
  loading: boolean;
  /** 金額を通貨形式にフォーマットする関数 */
  formatCurrency: (amount: number) => string;
}

/**
 * KPIセクションコンポーネント
 * 
 * ビジネス上の役割:
 * ダッシュボードのメイン部分。今月の経営状況を
 * 売上・経費・利益の3つの指標で一目で確認できる
 * 
 * 表示内容:
 * - 今月の売上（緑色）
 * - 今月の経費（赤色）
 * - 営業利益（黒字なら緑、赤字なら赤）
 */
export function KPISection({
  kpiData,
  loading,
  formatCurrency,
}: KPISectionProps) {
  // ローディング中はスケルトン表示
  if (loading) {
    return <LoadingKPICards />;
  }

  // 営業利益の色を利益の正負で決定
  const profitColorScheme = kpiData.profit >= 0 ? "green" : "red";
  const profitStatusText = kpiData.profit >= 0 ? "黒字" : "赤字";
  const profitIconColorClass = kpiData.profit >= 0 ? "text-green-600" : "text-red-600";

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* 今月の売上カード */}
      <KPICard
        title="今月の売上"
        formattedValue={formatCurrency(kpiData.income)}
        description="今月の売上総額"
        colorScheme="green"
        icon={<TrendingUp className="h-5 w-5 text-green-600" />}
      />

      {/* 今月の経費カード */}
      <KPICard
        title="今月の経費"
        formattedValue={formatCurrency(kpiData.expenses)}
        description="今月の経費総額"
        colorScheme="red"
        icon={<TrendingDown className="h-5 w-5 text-red-600" />}
      />

      {/* 営業利益カード */}
      <KPICard
        title="営業利益"
        formattedValue={formatCurrency(kpiData.profit)}
        description={profitStatusText}
        colorScheme={profitColorScheme}
        icon={<Wallet className={`h-5 w-5 ${profitIconColorClass}`} />}
      />
    </div>
  );
}

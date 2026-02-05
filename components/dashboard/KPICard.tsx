"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ReactNode } from "react";

/**
 * KPIカードのカラースキーム
 * 
 * green: 売上や黒字など、ポジティブな値に使用
 * red: 経費や赤字など、注意が必要な値に使用
 */
type ColorScheme = "green" | "red";

/**
 * KPIカードのプロパティ
 */
interface KPICardProps {
  /** カードのタイトル（例：「今月の売上」） */
  title: string;
  /** 表示する金額（フォーマット済みの文字列） */
  formattedValue: string;
  /** カード下部に表示する説明文 */
  description: string;
  /** 色のテーマ（green または red） */
  colorScheme: ColorScheme;
  /** カード右上に表示するアイコン */
  icon: ReactNode;
}

/**
 * 各カラースキームに対応するCSSクラスを定義
 * 
 * border: 左側のボーダーカラー
 * background: アイコン背景色
 * text: テキストカラー
 */
const colorClasses: Record<ColorScheme, { border: string; background: string; text: string }> = {
  green: {
    border: "border-l-green-500",
    background: "bg-green-100",
    text: "text-green-600",
  },
  red: {
    border: "border-l-red-500",
    background: "bg-red-100",
    text: "text-red-600",
  },
};

/**
 * KPIカードコンポーネント
 * 
 * ビジネス上の役割:
 * ダッシュボードで売上・経費・利益などの重要指標を
 * 視覚的にわかりやすく表示するためのカード
 * 
 * 使用例:
 * - 今月の売上総額を緑色で表示
 * - 今月の経費総額を赤色で表示
 * - 営業利益を黒字/赤字に応じた色で表示
 */
export function KPICard({
  title,
  formattedValue,
  description,
  colorScheme,
  icon,
}: KPICardProps) {
  const colors = colorClasses[colorScheme];

  return (
    <Card className={`border-l-4 ${colors.border} shadow-md`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-gray-700">{title}</CardTitle>
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-lg ${colors.background}`}
          >
            {icon}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className={`text-3xl font-bold ${colors.text} mb-2`}>
          {formattedValue}
        </div>
        <CardDescription>{description}</CardDescription>
      </CardContent>
    </Card>
  );
}

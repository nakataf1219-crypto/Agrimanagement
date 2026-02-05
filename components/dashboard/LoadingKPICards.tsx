"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

/**
 * ローディング中のKPIカード（スケルトン表示）
 * 
 * ビジネス上の役割:
 * データ取得中にユーザーに「読み込み中」であることを
 * 視覚的に伝え、画面がフリーズしていないことを示す
 * 
 * 表示内容:
 * - グレーのアニメーション付きプレースホルダー
 * - 実際のKPIカードと同じレイアウト
 */
export function LoadingKPICards() {
  // 3つのスケルトンカードを表示（売上・経費・利益に対応）
  const skeletonCount = 3;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {Array.from({ length: skeletonCount }).map((_, index) => (
        <Card key={index} className="border-l-4 shadow-md animate-pulse">
          <CardHeader>
            <div className="flex items-center justify-between">
              {/* タイトル部分のスケルトン */}
              <CardTitle className="text-gray-300 bg-gray-200 h-6 w-24 rounded" />
              {/* アイコン部分のスケルトン */}
              <div className="h-8 w-8 bg-gray-200 rounded-lg" />
            </div>
          </CardHeader>
          <CardContent>
            {/* 金額部分のスケルトン */}
            <div className="h-10 bg-gray-200 rounded mb-2" />
            {/* 説明文部分のスケルトン */}
            <div className="h-4 bg-gray-200 rounded w-20" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

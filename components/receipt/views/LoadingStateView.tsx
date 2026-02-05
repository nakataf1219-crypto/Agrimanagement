"use client";

/**
 * ローディング状態のビューコンポーネント
 *
 * ビジネス上の役割:
 * - レシート画像をOCR解析中に表示される画面
 * - ユーザーに処理中であることを明確に伝える
 */

import { Loader2 } from "lucide-react";

/**
 * コンポーネントのプロパティ
 */
interface LoadingStateViewProps {
  imagePreview: string | null;  // 撮影した画像のプレビュー（Base64）
}

export function LoadingStateView({ imagePreview }: LoadingStateViewProps) {
  return (
    <div className="flex flex-col gap-4 items-center justify-center flex-1">
      {imagePreview && (
        <ImageWithLoadingOverlay imageSource={imagePreview} />
      )}
    </div>
  );
}

// ===== サブコンポーネント =====

/**
 * 画像プレビューとローディングオーバーレイ
 * 撮影した画像の上にローディングインジケーターを表示
 */
interface ImageWithLoadingOverlayProps {
  imageSource: string;
}

function ImageWithLoadingOverlay({ imageSource }: ImageWithLoadingOverlayProps) {
  return (
    <div className="w-full max-w-sm aspect-[3/4] rounded-xl overflow-hidden relative">
      {/* 背景画像 */}
      <img
        src={imageSource}
        alt="レシート"
        className="w-full h-full object-cover"
      />

      {/* 半透明オーバーレイとスピナー */}
      <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center">
        <Loader2 className="w-12 h-12 text-white animate-spin mb-4" />
        <p className="text-white text-lg font-medium">解析中...</p>
        <p className="text-white/70 text-sm">レシートを読み取っています</p>
      </div>
    </div>
  );
}

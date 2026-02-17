"use client";

/**
 * ローディング状態のビューコンポーネント
 *
 * ビジネス上の役割:
 * - レシート画像をOCR解析中に表示される画面
 * - ユーザーに処理中であることを明確に伝える
 * - 段階的なメッセージ表示で体感待ち時間を短縮
 */

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";

/**
 * コンポーネントのプロパティ
 */
interface LoadingStateViewProps {
  imagePreview: string | null;  // 撮影した画像のプレビュー（Base64）
}

/**
 * ローディング中に段階的に表示するメッセージ
 * ユーザーに「ちゃんと処理が進んでいる」と感じてもらうための工夫
 */
const PROGRESS_MESSAGES = [
  { text: "画像を解析中...", subText: "レシートを読み取っています" },
  { text: "文字を認識中...", subText: "日付や金額を探しています" },
  { text: "データを整理中...", subText: "もう少しお待ちください" },
];

export function LoadingStateView({ imagePreview }: LoadingStateViewProps) {
  // 現在表示中のメッセージのインデックス
  const [messageIndex, setMessageIndex] = useState(0);

  // 2秒ごとにメッセージを切り替える
  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((previousIndex) =>
        previousIndex < PROGRESS_MESSAGES.length - 1 ? previousIndex + 1 : previousIndex
      );
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const currentMessage = PROGRESS_MESSAGES[messageIndex];

  return (
    <div className="flex flex-col gap-4 items-center justify-center flex-1">
      {imagePreview && (
        <ImageWithLoadingOverlay
          imageSource={imagePreview}
          mainText={currentMessage.text}
          subText={currentMessage.subText}
        />
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
  mainText: string;
  subText: string;
}

function ImageWithLoadingOverlay({ imageSource, mainText, subText }: ImageWithLoadingOverlayProps) {
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
        <p className="text-white text-lg font-medium">{mainText}</p>
        <p className="text-white/70 text-sm">{subText}</p>
      </div>
    </div>
  );
}

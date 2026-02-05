"use client";

/**
 * エラー状態のビューコンポーネント
 *
 * ビジネス上の役割:
 * - OCR解析が失敗した時に表示されるエラー画面
 * - ユーザーに「再撮影」または「手動入力」の選択肢を提供
 * - エラーメッセージを分かりやすく表示
 */

import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * コンポーネントのプロパティ
 */
interface ErrorStateViewProps {
  errorMessage: string | null;  // エラーメッセージ
  onRetry: () => void;          // 再撮影ボタンクリック時
  onManualEntry: () => void;    // 手動入力ボタンクリック時
}

export function ErrorStateView({
  errorMessage,
  onRetry,
  onManualEntry,
}: ErrorStateViewProps) {
  return (
    <div className="flex flex-col gap-4 items-center justify-center flex-1">
      {/* エラーアイコンとメッセージ */}
      <ErrorIcon />

      {/* エラー詳細 */}
      <ErrorDescription message={errorMessage} />

      {/* アクションボタン */}
      <ActionButtons onRetry={onRetry} onManualEntry={onManualEntry} />
    </div>
  );
}

// ===== サブコンポーネント =====

/**
 * エラーアイコン
 * 赤いアラートアイコンとメッセージ
 */
function ErrorIcon() {
  return (
    <div className="flex flex-col items-center gap-2 text-red-500">
      <AlertCircle className="w-12 h-12" />
      <span className="font-medium">読み取りに失敗しました</span>
    </div>
  );
}

/**
 * エラー詳細説明
 * 何が起きたかをユーザーに伝える
 */
interface ErrorDescriptionProps {
  message: string | null;
}

function ErrorDescription({ message }: ErrorDescriptionProps) {
  const defaultMessage =
    "レシートを読み取れませんでした。再度撮影するか、手動で入力してください。";

  return (
    <p className="text-sm text-gray-500 text-center max-w-xs">
      {message || defaultMessage}
    </p>
  );
}

/**
 * アクションボタン
 * 再撮影・手動入力の2つの選択肢
 */
interface ActionButtonsProps {
  onRetry: () => void;
  onManualEntry: () => void;
}

function ActionButtons({ onRetry, onManualEntry }: ActionButtonsProps) {
  return (
    <div className="flex flex-col gap-2 w-full max-w-sm mt-4">
      <Button
        onClick={onRetry}
        className="w-full h-12 bg-green-600 hover:bg-green-700"
      >
        再撮影する
      </Button>
      <Button
        onClick={onManualEntry}
        variant="outline"
        className="w-full"
      >
        手動で入力する
      </Button>
    </div>
  );
}

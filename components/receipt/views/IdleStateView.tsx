"use client";

/**
 * 初期状態のビューコンポーネント
 *
 * ビジネス上の役割:
 * - レシートスキャナーを開いた時に最初に表示される画面
 * - 「撮影する」「画像を選択」ボタンでレシート画像を取得
 * - 「手動で入力する」リンクでOCRをスキップして経費フォームへ
 */

import { Camera, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * コンポーネントのプロパティ
 */
interface IdleStateViewProps {
  onCameraClick: () => void;    // カメラ撮影ボタンクリック時
  onFileClick: () => void;      // 画像選択ボタンクリック時
  onManualEntry: () => void;    // 手動入力リンククリック時
}

export function IdleStateView({
  onCameraClick,
  onFileClick,
  onManualEntry,
}: IdleStateViewProps) {
  return (
    <div className="flex flex-col gap-4 items-center justify-center flex-1">
      {/* 画像プレビューエリア（撮影前のプレースホルダー） */}
      <CameraPlaceholder />

      {/* 撮影・選択ボタン */}
      <ActionButtonGroup
        onCameraClick={onCameraClick}
        onFileClick={onFileClick}
      />

      {/* 手動入力リンク */}
      <ManualEntryLink onClick={onManualEntry} />
    </div>
  );
}

// ===== サブコンポーネント =====

/**
 * カメラプレースホルダー
 * 撮影前の状態を示すダミー領域
 */
function CameraPlaceholder() {
  return (
    <div className="w-full max-w-sm aspect-[3/4] bg-gray-100 rounded-xl flex items-center justify-center border-2 border-dashed border-gray-300">
      <div className="text-center text-gray-400">
        <Camera className="w-16 h-16 mx-auto mb-2" />
        <p className="text-sm">レシートを撮影してください</p>
      </div>
    </div>
  );
}

/**
 * アクションボタングループ
 * 撮影・画像選択の2つのボタン
 */
interface ActionButtonGroupProps {
  onCameraClick: () => void;
  onFileClick: () => void;
}

function ActionButtonGroup({ onCameraClick, onFileClick }: ActionButtonGroupProps) {
  return (
    <div className="flex gap-4 w-full max-w-sm">
      <Button
        onClick={onCameraClick}
        className="flex-1 h-14 bg-green-600 hover:bg-green-700"
      >
        <Camera className="w-5 h-5 mr-2" />
        撮影する
      </Button>
      <Button
        onClick={onFileClick}
        variant="outline"
        className="flex-1 h-14"
      >
        <ImageIcon className="w-5 h-5 mr-2" />
        画像を選択
      </Button>
    </div>
  );
}

/**
 * 手動入力リンク
 * OCRをスキップして経費フォームに直接遷移
 */
interface ManualEntryLinkProps {
  onClick: () => void;
}

function ManualEntryLink({ onClick }: ManualEntryLinkProps) {
  return (
    <button
      onClick={onClick}
      className="text-sm text-gray-500 hover:text-gray-700 underline mt-2"
    >
      手動で入力する
    </button>
  );
}

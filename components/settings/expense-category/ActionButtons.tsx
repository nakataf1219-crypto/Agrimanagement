/**
 * アクションボタンコンポーネント
 *
 * ビジネス上の役割:
 * 「科目を追加」と「初期リセット」の2つの主要操作を提供する
 * - 科目追加: ユーザーが独自の勘定科目を登録したい時
 * - 初期リセット: 科目をデフォルト状態に戻したい時
 */

import { Button } from "@/components/ui/button";
import { Loader2, Plus, RotateCcw } from "lucide-react";

interface ActionButtonsProps {
  /** 追加ボタンクリック時のコールバック */
  onAddClick: () => void;
  /** リセットボタンクリック時のコールバック */
  onResetClick: () => void;
  /** 追加フォームが表示中かどうか（表示中は追加ボタンを無効化） */
  isAdding: boolean;
  /** リセット処理中かどうか */
  isResetting: boolean;
}

export function ActionButtons({
  onAddClick,
  onResetClick,
  isAdding,
  isResetting,
}: ActionButtonsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {/* 科目追加ボタン */}
      <Button
        onClick={onAddClick}
        disabled={isAdding}
        className="bg-green-600 hover:bg-green-700"
      >
        <Plus className="h-4 w-4 mr-1" />
        科目を追加
      </Button>

      {/* 初期リセットボタン */}
      <Button
        onClick={onResetClick}
        disabled={isResetting}
        variant="outline"
        className="border-green-600 text-green-600 hover:bg-green-50"
      >
        {isResetting ? (
          <>
            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            リセット中...
          </>
        ) : (
          <>
            <RotateCcw className="h-4 w-4 mr-1" />
            初期リセット
          </>
        )}
      </Button>
    </div>
  );
}

/**
 * 勘定科目テーブルの1行を表示するコンポーネント
 *
 * ビジネス上の役割:
 * 各勘定科目の表示と編集・削除操作を提供する
 * - 通常モード: 科目名と区分を表示、編集・削除ボタン
 * - 編集モード: インライン編集用のフォーム
 */

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TableCell, TableRow } from "@/components/ui/table";
import { Loader2, Pencil, Trash2, Check, X } from "lucide-react";
import type { ExpenseCategory, EditState, EditStateHandlers } from "./types";

/**
 * 区分の表示名を取得
 * fixed → 固定費、variable → 変動費
 */
const getCategoryTypeLabel = (categoryType: string): string => {
  return categoryType === "fixed" ? "固定費" : "変動費";
};

interface CategoryTableRowProps {
  /** 表示する勘定科目データ */
  category: ExpenseCategory;
  /** この行が編集中かどうか */
  isEditing: boolean;
  /** 編集中の状態（科目名・区分） */
  editState: EditState;
  /** 編集状態を変更するハンドラー */
  onEditChange: EditStateHandlers;
  /** 編集開始時のコールバック */
  onStartEdit: () => void;
  /** 編集キャンセル時のコールバック */
  onCancelEdit: () => void;
  /** 更新保存時のコールバック */
  onUpdate: () => void;
  /** 削除時のコールバック */
  onDelete: () => void;
  /** 編集保存中かどうか */
  isSavingEdit: boolean;
  /** この行が削除処理中かどうか */
  isDeleting: boolean;
}

export function CategoryTableRow({
  category,
  isEditing,
  editState,
  onEditChange,
  onStartEdit,
  onCancelEdit,
  onUpdate,
  onDelete,
  isSavingEdit,
  isDeleting,
}: CategoryTableRowProps) {
  // 編集モードの表示
  if (isEditing) {
    return (
      <TableRow>
        {/* 科目名の編集フィールド - モバイルでも入力しやすいサイズ */}
        <TableCell className="min-w-[120px]">
          <Input
            type="text"
            value={editState.name}
            onChange={(event) => onEditChange.setName(event.target.value)}
            className="h-9 text-base"
          />
        </TableCell>

        {/* 区分の選択フィールド - モバイルでもタップしやすく */}
        <TableCell>
          <select
            value={editState.categoryType}
            onChange={(event) =>
              onEditChange.setCategoryType(
                event.target.value as "fixed" | "variable"
              )
            }
            className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
          >
            <option value="fixed">固定費</option>
            <option value="variable">変動費</option>
          </select>
        </TableCell>

        {/* 操作ボタン: 保存とキャンセル - タップしやすいサイズ */}
        <TableCell className="text-right">
          <div className="flex justify-end gap-1">
            <Button
              size="sm"
              onClick={onUpdate}
              disabled={isSavingEdit}
              className="h-9 w-9 p-0 bg-green-600 hover:bg-green-700"
            >
              {isSavingEdit ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={onCancelEdit}
              className="h-9 w-9 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </TableCell>
      </TableRow>
    );
  }

  // 通常モードの表示（閲覧モード）
  return (
    <TableRow>
      {/* 科目名 - モバイルでも読みやすいフォントサイズ */}
      <TableCell className="font-medium min-w-[120px]">{category.name}</TableCell>

      {/* 区分バッジ: 固定費=青、変動費=オレンジ */}
      <TableCell>
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap ${
            category.categoryType === "fixed"
              ? "bg-blue-100 text-blue-800"
              : "bg-orange-100 text-orange-800"
          }`}
        >
          {getCategoryTypeLabel(category.categoryType)}
        </span>
      </TableCell>

      {/* 操作ボタン: 編集と削除 - モバイルでタップしやすいサイズ(44x44px推奨) */}
      <TableCell className="text-right">
        <div className="flex justify-end gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={onStartEdit}
            className="h-9 w-9 p-0 text-gray-500 hover:text-green-600 active:bg-green-50"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={onDelete}
            disabled={isDeleting}
            className="h-9 w-9 p-0 text-gray-500 hover:text-red-600 active:bg-red-50"
          >
            {isDeleting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

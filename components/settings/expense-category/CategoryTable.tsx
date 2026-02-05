/**
 * 勘定科目一覧テーブルコンポーネント
 *
 * ビジネス上の役割:
 * 登録済みの勘定科目を一覧表示し、編集・削除操作を提供する
 */

import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CategoryTableRow } from "./CategoryTableRow";
import type { ExpenseCategory, EditState, EditStateHandlers } from "./types";

interface CategoryTableProps {
  /** 勘定科目の一覧 */
  categories: ExpenseCategory[];
  /** 現在編集中の科目ID（nullなら編集モードでない） */
  editingId: string | null;
  /** 編集中の状態（科目名・区分） */
  editState: EditState;
  /** 編集状態を変更するハンドラー */
  onEditChange: EditStateHandlers;
  /** 編集開始時のコールバック */
  onStartEdit: (category: ExpenseCategory) => void;
  /** 編集キャンセル時のコールバック */
  onCancelEdit: () => void;
  /** 更新保存時のコールバック */
  onUpdateCategory: () => void;
  /** 削除時のコールバック */
  onDeleteCategory: (categoryId: string) => void;
  /** 編集保存中かどうか */
  isSavingEdit: boolean;
  /** 現在削除処理中の科目ID */
  deletingId: string | null;
}

export function CategoryTable({
  categories,
  editingId,
  editState,
  onEditChange,
  onStartEdit,
  onCancelEdit,
  onUpdateCategory,
  onDeleteCategory,
  isSavingEdit,
  deletingId,
}: CategoryTableProps) {
  return (
    // overflow-x-auto: スマホで横幅が足りない場合に横スクロール可能にする
    <div className="border rounded-lg overflow-hidden overflow-x-auto">
      <Table className="min-w-[320px]">
        {/* テーブルヘッダー */}
        <TableHeader>
          <TableRow className="bg-gray-50">
            {/* 科目名: モバイルでは最小幅を設定して読みやすく */}
            <TableHead className="font-semibold min-w-[120px]">科目名</TableHead>
            {/* 区分: 固定幅で一貫した表示 */}
            <TableHead className="font-semibold w-20 sm:w-24">区分</TableHead>
            {/* 操作: 右寄せで固定幅 */}
            <TableHead className="font-semibold w-20 sm:w-24 text-right">
              操作
            </TableHead>
          </TableRow>
        </TableHeader>

        {/* テーブルボディ: 各科目を行として表示 */}
        <TableBody>
          {categories.map((category) => (
            <CategoryTableRow
              key={category.id}
              category={category}
              isEditing={editingId === category.id}
              editState={editState}
              onEditChange={onEditChange}
              onStartEdit={() => onStartEdit(category)}
              onCancelEdit={onCancelEdit}
              onUpdate={onUpdateCategory}
              onDelete={() => onDeleteCategory(category.id)}
              isSavingEdit={isSavingEdit}
              isDeleting={deletingId === category.id}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

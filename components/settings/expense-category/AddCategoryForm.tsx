/**
 * 新規勘定科目追加フォームコンポーネント
 *
 * ビジネス上の役割:
 * ユーザーが新しい勘定科目を登録するためのフォーム
 * - 科目名を入力
 * - 固定費か変動費かを選択
 * - 追加またはキャンセルを実行
 */

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Check, X } from "lucide-react";

interface AddCategoryFormProps {
  /** 入力中の科目名 */
  name: string;
  /** 選択中の区分（固定費/変動費） */
  categoryType: "fixed" | "variable";
  /** 保存処理中かどうか */
  isSaving: boolean;
  /** 科目名が変更された時のコールバック */
  onNameChange: (name: string) => void;
  /** 区分が変更された時のコールバック */
  onCategoryTypeChange: (categoryType: "fixed" | "variable") => void;
  /** 追加ボタンクリック時のコールバック */
  onSubmit: () => void;
  /** キャンセルボタンクリック時のコールバック */
  onCancel: () => void;
}

export function AddCategoryForm({
  name,
  categoryType,
  isSaving,
  onNameChange,
  onCategoryTypeChange,
  onSubmit,
  onCancel,
}: AddCategoryFormProps) {
  return (
    <div className="p-4 bg-gray-50 rounded-lg border space-y-3">
      <h4 className="font-medium text-gray-900">新しい勘定科目</h4>

      {/* 入力フィールド: 科目名と区分 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* 科目名入力 */}
        <div className="space-y-1">
          <Label htmlFor="newCategoryName">科目名</Label>
          <Input
            id="newCategoryName"
            type="text"
            placeholder="例：肥料費"
            value={name}
            onChange={(event) => onNameChange(event.target.value)}
          />
        </div>

        {/* 区分選択: 固定費または変動費 */}
        <div className="space-y-1">
          <Label htmlFor="newCategoryType">区分</Label>
          <select
            id="newCategoryType"
            value={categoryType}
            onChange={(event) =>
              onCategoryTypeChange(event.target.value as "fixed" | "variable")
            }
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
          >
            <option value="fixed">固定費</option>
            <option value="variable">変動費</option>
          </select>
        </div>
      </div>

      {/* 操作ボタン: 追加とキャンセル */}
      <div className="flex gap-2">
        <Button
          onClick={onSubmit}
          disabled={isSaving}
          className="bg-green-600 hover:bg-green-700"
        >
          {isSaving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Check className="h-4 w-4" />
          )}
          <span className="ml-1">追加</span>
        </Button>

        <Button onClick={onCancel} variant="outline">
          <X className="h-4 w-4" />
          <span className="ml-1">キャンセル</span>
        </Button>
      </div>
    </div>
  );
}

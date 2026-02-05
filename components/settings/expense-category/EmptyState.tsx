/**
 * 勘定科目が空の状態を表示するコンポーネント
 *
 * ビジネス上の役割:
 * まだ勘定科目が登録されていない場合に、
 * 次のアクション（追加 or リセット）を案内する
 */

import { Tags } from "lucide-react";

export function EmptyState() {
  return (
    <div className="text-center py-8 text-gray-500">
      <Tags className="h-12 w-12 mx-auto mb-2 text-gray-300" />
      <p>勘定科目が登録されていません</p>
      <p className="text-sm mt-1">
        「科目を追加」または「初期リセット」でデフォルトの科目を登録してください
      </p>
    </div>
  );
}

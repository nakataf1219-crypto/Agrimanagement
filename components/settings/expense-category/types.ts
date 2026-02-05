/**
 * 勘定科目管理で使用する型定義
 *
 * ビジネス上の役割:
 * 勘定科目に関するデータ構造を定義し、コンポーネント間で共有する
 */

/**
 * 勘定科目のデータ型
 * データベースの expense_categories テーブルに対応
 */
export interface ExpenseCategory {
  /** 一意識別子 */
  id: string;
  /** この科目を所有するユーザーID */
  userId: string;
  /** 科目名（例：肥料費、人件費） */
  name: string;
  /** 区分: 固定費 or 変動費 */
  categoryType: "fixed" | "variable";
  /** 表示順序（並び替え用） */
  displayOrder: number;
  /** 有効フラグ（falseは論理削除された状態） */
  isActive: boolean;
}

/**
 * 編集中の状態を表す型
 */
export interface EditState {
  /** 編集中の科目名 */
  name: string;
  /** 編集中の区分 */
  categoryType: "fixed" | "variable";
}

/**
 * 編集状態を変更するためのコールバック
 */
export interface EditStateHandlers {
  /** 科目名を更新する */
  setName: (name: string) => void;
  /** 区分を更新する */
  setCategoryType: (categoryType: "fixed" | "variable") => void;
}

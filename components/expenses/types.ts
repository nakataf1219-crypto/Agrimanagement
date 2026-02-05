/**
 * 経費登録フォームで使用する型定義
 * 
 * このファイルには経費登録に関連する全ての型を集約しています。
 * 他のコンポーネントやフックからインポートして使用します。
 */

/**
 * 勘定科目マスタの型
 * expense_categories テーブルから取得するデータの構造
 */
export interface ExpenseCategory {
  id: string;           // 科目の一意ID
  name: string;         // 科目名（例：肥料費、農薬費）
  category_type: string; // 区分（fixed: 固定費 / variable: 変動費）
}

/**
 * フォームの入力データの型
 * フォームの各フィールドの値を管理するために使用
 */
export interface ExpenseFormData {
  date: string;         // 日付（YYYY-MM-DD形式）
  categoryId: string;   // 選択した科目のID
  categoryName: string; // 選択した科目名（DBのcategoryカラムに保存）
  amount: string;       // 金額（入力時は文字列、保存時に数値に変換）
  description: string;  // 摘要/メモ
}

/**
 * useExpenseForm カスタムフックの戻り値の型
 * フォームの状態とハンドラーをまとめて返す
 */
export interface UseExpenseFormReturn {
  // === 状態 ===
  formData: ExpenseFormData;           // フォームの入力値
  loading: boolean;                    // 送信中フラグ
  error: string | null;                // エラーメッセージ
  success: boolean;                    // 登録成功フラグ
  isOcrFilled: boolean;                // OCRから自動入力されたかどうか
  expenseCategories: ExpenseCategory[]; // 勘定科目マスタのリスト
  categoriesLoading: boolean;          // 勘定科目の読み込み中フラグ
  ocrSuggestedCategory: string | null; // OCRで推測された科目名
  
  // === イベントハンドラー ===
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  handleCategorySelect: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
}

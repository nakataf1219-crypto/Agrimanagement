/**
 * フォームのメッセージ表示コンポーネント
 * 
 * エラーメッセージと成功メッセージの表示を担当
 * - エラー: 赤背景でエラー内容を表示
 * - 成功: 緑背景でチェックマーク付きメッセージを表示
 */

import { CheckCircle } from "lucide-react";

/**
 * FormMessagesコンポーネントのプロパティ
 */
interface FormMessagesProps {
  /** エラーメッセージ（null の場合は非表示） */
  error: string | null;
  /** 成功フラグ（true の場合は成功メッセージを表示） */
  success: boolean;
}

/**
 * フォームメッセージのメインコンポーネント
 * 
 * エラーと成功の両方を管理し、状態に応じて表示を切り替える
 */
export function FormMessages({ error, success }: FormMessagesProps) {
  return (
    <>
      {error && <ErrorMessage message={error} />}
      {success && <SuccessMessage />}
    </>
  );
}

// ============================================================
// 以下、内部で使用するサブコンポーネント
// ============================================================

/**
 * エラーメッセージ表示
 * 赤い背景色でエラー内容をユーザーに通知
 */
function ErrorMessage({ message }: { message: string }) {
  return (
    <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
      {message}
    </div>
  );
}

/**
 * 成功メッセージ表示
 * 緑の背景色とチェックマークで登録成功を通知
 * ダッシュボードへの遷移を予告
 */
function SuccessMessage() {
  return (
    <div className="p-3 bg-green-50 border border-green-200 rounded-md text-green-700 text-sm flex items-center gap-2">
      <CheckCircle className="w-4 h-4" />
      経費を登録しました。トップページに戻ります...
    </div>
  );
}

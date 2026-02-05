/**
 * メッセージアラートコンポーネント
 *
 * ビジネス上の役割:
 * 操作の成功・失敗をユーザーにフィードバックする
 * 緑色=成功、赤色=エラー で直感的にわかるようにする
 */

interface MessageAlertsProps {
  /** 成功時に表示するメッセージ（nullの場合は非表示） */
  successMessage: string | null;
  /** エラー時に表示するメッセージ（nullの場合は非表示） */
  errorMessage: string | null;
}

export function MessageAlerts({
  successMessage,
  errorMessage,
}: MessageAlertsProps) {
  // どちらもない場合は何も表示しない
  if (!successMessage && !errorMessage) {
    return null;
  }

  return (
    <>
      {/* 成功メッセージ: 緑色の背景で表示 */}
      {successMessage && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-md text-green-700 text-sm">
          {successMessage}
        </div>
      )}

      {/* エラーメッセージ: 赤色の背景で表示 */}
      {errorMessage && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
          {errorMessage}
        </div>
      )}
    </>
  );
}

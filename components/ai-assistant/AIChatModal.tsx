"use client";

/**
 * AIチャットモーダルコンポーネント
 *
 * ビジネス上の役割:
 * - 画面下部からスライドアップするチャット画面
 * - ユーザーが経営に関する質問を入力し、AIが回答
 * - 会話履歴を保持して、文脈のある対話が可能
 *
 * スマホ対応:
 * - 画面の90%の高さを使用（下からスライドアップ）
 * - 入力欄は画面下部に固定（キーボード表示時も使いやすい）
 * - タップしやすいボタンサイズ（44px以上）
 * - クイック質問ボタンで入力の手間を省略
 */

import { useState } from "react";
import { Bot, Send, Loader2, Trash2, Sparkles } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useAIChat } from "./hooks/useAIChat";
import ChatMessage from "./ChatMessage";

/**
 * コンポーネントのプロパティ
 */
interface AIChatModalProps {
  /** モーダルの開閉状態 */
  isOpen: boolean;
  /** モーダルを閉じる時のコールバック */
  onClose: () => void;
}

/**
 * クイック質問の定義
 * ユーザーがワンタップで質問できるプリセット
 */
const QUICK_QUESTIONS = [
  { label: "今月の経営状況", message: "今月の経営状況を分析してください" },
  { label: "コスト削減", message: "経費を削減するためのアドバイスをください" },
  { label: "経費の多い科目", message: "経費が多いカテゴリはどれですか？改善点を教えてください" },
  { label: "売上向上", message: "売上を向上させるためのアドバイスをください" },
];

export default function AIChatModal({ isOpen, onClose }: AIChatModalProps) {
  // チャット状態管理フック
  const {
    messages,
    isSending,
    errorMessage,
    sendMessage,
    clearChat,
    messagesEndRef,
  } = useAIChat();

  // 入力テキストの状態
  const [inputText, setInputText] = useState("");

  /**
   * メッセージ送信処理
   * 入力欄のテキストをAPIに送信
   */
  const handleSendMessage = async () => {
    if (!inputText.trim() || isSending) return;

    const messageToSend = inputText;
    setInputText(""); // 入力欄をクリア
    await sendMessage(messageToSend);
  };

  /**
   * Enterキーで送信（Shift+Enterは改行）
   */
  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  /**
   * クイック質問をタップした時の処理
   */
  const handleQuickQuestion = async (questionMessage: string) => {
    if (isSending) return;
    await sendMessage(questionMessage);
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="bottom" className="h-[90vh] rounded-t-3xl flex flex-col p-0">
        {/* ヘッダー */}
        <SheetHeader className="text-left px-4 pt-4 pb-2 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                <Bot className="w-4 h-4 text-purple-600" />
              </div>
              <div>
                <SheetTitle className="text-lg">AIアシスタント</SheetTitle>
                <SheetDescription className="text-xs">
                  経営データに基づいてアドバイスします
                </SheetDescription>
              </div>
            </div>
            {/* チャットクリアボタン */}
            {messages.length > 0 && (
              <Button
                onClick={clearChat}
                variant="ghost"
                size="sm"
                className="text-gray-400 hover:text-gray-600 min-h-[44px]"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </SheetHeader>

        {/* メッセージエリア */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {/* メッセージがない場合: ウェルカム画面 */}
          {messages.length === 0 && (
            <WelcomeView
              onQuickQuestion={handleQuickQuestion}
              isSending={isSending}
            />
          )}

          {/* メッセージ一覧 */}
          {messages.map((message) => (
            <ChatMessage key={message.id} message={message} />
          ))}

          {/* AI回答中のローディング表示 */}
          {isSending && <TypingIndicator />}

          {/* エラーメッセージ */}
          {errorMessage && <ErrorBanner message={errorMessage} />}

          {/* 自動スクロール用のアンカー */}
          <div ref={messagesEndRef} />
        </div>

        {/* 入力エリア（画面下部に固定） */}
        <div className="flex-shrink-0 border-t border-gray-200 bg-white px-4 py-3 safe-area-bottom">
          <div className="flex items-end gap-2">
            {/* テキスト入力欄 */}
            <textarea
              value={inputText}
              onChange={(event) => setInputText(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="経営について質問してください..."
              rows={1}
              className="flex-1 resize-none rounded-2xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent min-h-[44px] max-h-[120px]"
              disabled={isSending}
            />

            {/* 送信ボタン */}
            <Button
              onClick={handleSendMessage}
              disabled={!inputText.trim() || isSending}
              size="sm"
              className="rounded-full w-11 h-11 p-0 bg-green-600 hover:bg-green-700 flex-shrink-0"
            >
              {isSending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ===== サブコンポーネント =====

/**
 * ウェルカム画面
 * チャット開始前に表示される初期画面
 * クイック質問ボタンで簡単に会話を始められる
 */
function WelcomeView({
  onQuickQuestion,
  isSending,
}: {
  onQuickQuestion: (message: string) => void;
  isSending: boolean;
}) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-6 py-8">
      {/* AIアイコン */}
      <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center">
        <Sparkles className="w-8 h-8 text-purple-500" />
      </div>

      {/* 説明テキスト */}
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-800 mb-1">
          経営のことを聞いてみましょう
        </h3>
        <p className="text-sm text-gray-500 max-w-xs">
          あなたの売上・経費データをもとに、AIが経営アドバイスをします
        </p>
      </div>

      {/* クイック質問ボタン */}
      <div className="w-full max-w-sm space-y-2">
        <p className="text-xs text-gray-400 text-center mb-2">
          よくある質問
        </p>
        {QUICK_QUESTIONS.map((question) => (
          <button
            key={question.label}
            onClick={() => onQuickQuestion(question.message)}
            disabled={isSending}
            className="w-full text-left px-4 py-3 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 active:bg-gray-100 transition-colors text-sm text-gray-700 disabled:opacity-50 min-h-[44px]"
          >
            <span className="text-purple-500 mr-2">💡</span>
            {question.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * AI入力中インジケーター
 * AIが回答を生成中であることを示すアニメーション
 */
function TypingIndicator() {
  return (
    <div className="flex gap-2">
      <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
        <Bot className="w-4 h-4 text-purple-600" />
      </div>
      <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
        <div className="flex gap-1.5">
          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
        </div>
      </div>
    </div>
  );
}

/**
 * エラーバナー
 * API呼び出しに失敗した場合のエラー表示
 */
function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="mx-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
      <strong>エラー:</strong> {message}
    </div>
  );
}

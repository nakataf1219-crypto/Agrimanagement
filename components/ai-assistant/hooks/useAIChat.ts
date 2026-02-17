"use client";

/**
 * AIチャットの状態管理フック
 *
 * ビジネス上の役割:
 * - チャットメッセージの送受信を管理
 * - 会話履歴を保持してコンテキストを維持
 * - ローディング・エラー状態を管理
 *
 * UIコンポーネントは「見た目」に集中し、
 * このフックが「ロジック」を担当する
 */

import { useState, useRef, useCallback } from "react";

// =============================================================================
// 型定義
// =============================================================================

/** チャットメッセージの型 */
export interface ChatMessage {
  /** メッセージの一意ID */
  id: string;
  /** 送信者（user: ユーザー, assistant: AI） */
  role: "user" | "assistant";
  /** メッセージ本文 */
  content: string;
  /** 送信日時 */
  timestamp: Date;
}

/** フックの戻り値の型 */
export interface UseAIChatReturn {
  /** チャットメッセージの配列 */
  messages: ChatMessage[];
  /** メッセージ送信中かどうか */
  isSending: boolean;
  /** エラーメッセージ */
  errorMessage: string | null;
  /** メッセージ送信関数 */
  sendMessage: (userMessage: string) => Promise<void>;
  /** チャット履歴をクリア */
  clearChat: () => void;
  /** メッセージ一覧の末尾への参照（自動スクロール用） */
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
}

// =============================================================================
// フック本体
// =============================================================================

/**
 * AIチャットのカスタムフック
 *
 * @returns チャットの状態とアクション
 */
export function useAIChat(): UseAIChatReturn {
  // チャットメッセージの配列
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  // 送信中フラグ
  const [isSending, setIsSending] = useState(false);
  // エラーメッセージ
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // メッセージ末尾への参照（自動スクロール用）
  const messagesEndRef = useRef<HTMLDivElement>(null);

  /**
   * 一意なメッセージIDを生成
   */
  const generateMessageId = (): string => {
    return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  };

  /**
   * メッセージ一覧の末尾にスクロール
   * 新しいメッセージが追加された時に自動で下にスクロール
   */
  const scrollToBottom = useCallback(() => {
    // 少し遅延させてDOMの更新を待つ
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  }, []);

  /**
   * メッセージを送信してAIの回答を取得
   *
   * ビジネス上の流れ:
   * 1. ユーザーのメッセージを画面に表示
   * 2. AIアシスタントAPIにメッセージと会話履歴を送信
   * 3. AIの回答を受け取って画面に表示
   *
   * @param userMessage - ユーザーが入力したメッセージ
   */
  const sendMessage = useCallback(
    async (userMessage: string) => {
      // 空メッセージは送信しない
      if (!userMessage.trim()) return;

      // エラーをクリア
      setErrorMessage(null);

      // ユーザーメッセージを追加
      const userChatMessage: ChatMessage = {
        id: generateMessageId(),
        role: "user",
        content: userMessage.trim(),
        timestamp: new Date(),
      };

      setMessages((previousMessages) => [...previousMessages, userChatMessage]);
      scrollToBottom();

      // API呼び出し
      setIsSending(true);

      try {
        // 会話履歴をAPI用の形式に変換（直近の会話を送信）
        const conversationHistory = messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        }));

        const response = await fetch("/api/ai-assistant", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: userMessage.trim(),
            conversationHistory,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "AIからの回答取得に失敗しました");
        }

        // AIの回答をメッセージに追加
        const assistantChatMessage: ChatMessage = {
          id: generateMessageId(),
          role: "assistant",
          content: data.message,
          timestamp: new Date(),
        };

        setMessages((previousMessages) => [
          ...previousMessages,
          assistantChatMessage,
        ]);
        scrollToBottom();
      } catch (error: unknown) {
        const message =
          error instanceof Error
            ? error.message
            : "メッセージの送信に失敗しました";
        setErrorMessage(message);
      } finally {
        setIsSending(false);
      }
    },
    [messages, scrollToBottom]
  );

  /**
   * チャット履歴をクリア
   * 新しい会話を始める時に使用
   */
  const clearChat = useCallback(() => {
    setMessages([]);
    setErrorMessage(null);
  }, []);

  return {
    messages,
    isSending,
    errorMessage,
    sendMessage,
    clearChat,
    messagesEndRef,
  };
}

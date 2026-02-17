"use client";

/**
 * チャットメッセージ表示コンポーネント
 *
 * ビジネス上の役割:
 * - ユーザーとAIのメッセージを吹き出し形式で表示
 * - ユーザーメッセージは右寄せ（緑色）
 * - AIメッセージは左寄せ（白色）
 *
 * スマホ対応:
 * - 吹き出しの最大幅を制限して読みやすく
 * - テキストは折り返し表示
 */

import { Bot, User } from "lucide-react";
import type { ChatMessage as ChatMessageType } from "./hooks/useAIChat";

/**
 * コンポーネントのプロパティ
 */
interface ChatMessageProps {
  /** 表示するメッセージ */
  message: ChatMessageType;
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user";

  return (
    <div
      className={`flex gap-2 ${isUser ? "flex-row-reverse" : "flex-row"}`}
    >
      {/* アバターアイコン */}
      <MessageAvatar isUser={isUser} />

      {/* メッセージ吹き出し */}
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
          isUser
            ? "bg-green-600 text-white rounded-tr-sm"
            : "bg-white border border-gray-200 text-gray-800 rounded-tl-sm shadow-sm"
        }`}
      >
        {/* メッセージ本文 */}
        <MessageContent content={message.content} isUser={isUser} />

        {/* 送信時刻 */}
        <MessageTimestamp timestamp={message.timestamp} isUser={isUser} />
      </div>
    </div>
  );
}

// ===== サブコンポーネント =====

/**
 * アバターアイコン
 * ユーザーは緑の人物アイコン、AIは紫のボットアイコン
 */
function MessageAvatar({ isUser }: { isUser: boolean }) {
  return (
    <div
      className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
        isUser ? "bg-green-100" : "bg-purple-100"
      }`}
    >
      {isUser ? (
        <User className="w-4 h-4 text-green-600" />
      ) : (
        <Bot className="w-4 h-4 text-purple-600" />
      )}
    </div>
  );
}

/**
 * メッセージ本文
 * 改行を保持して表示（AIの回答は箇条書きを含むことが多い）
 */
function MessageContent({
  content,
  isUser,
}: {
  content: string;
  isUser: boolean;
}) {
  return (
    <p
      className={`text-sm whitespace-pre-wrap leading-relaxed ${
        isUser ? "text-white" : "text-gray-800"
      }`}
    >
      {content}
    </p>
  );
}

/**
 * 送信時刻
 * 小さなテキストで時刻を表示
 */
function MessageTimestamp({
  timestamp,
  isUser,
}: {
  timestamp: Date;
  isUser: boolean;
}) {
  const timeString = timestamp.toLocaleTimeString("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <p
      className={`text-[10px] mt-1 ${
        isUser ? "text-white/70 text-right" : "text-gray-400"
      }`}
    >
      {timeString}
    </p>
  );
}

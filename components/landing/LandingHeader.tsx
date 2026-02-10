"use client";

import Link from "next/link";
import { Leaf } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * ランディングページ用ヘッダーコンポーネント
 *
 * ビジネス上の役割：
 * - サービス名とブランドイメージを最初に見せて、「何のサービスか」をすぐに伝える
 * - 「ログイン」「無料登録」ボタンから、すぐに操作を開始してもらう入口になる
 */
export function LandingHeader() {
  return (
    <header className="w-full border-b bg-white/70 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        {/* 左側：ロゴとサービス名 */}
        <Link
          href="/"
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          <Leaf className="h-7 w-7 text-green-600" />
          <span className="text-lg font-bold text-green-700">
            AgriManagement
          </span>
        </Link>

        {/* 右側：ログイン / 新規登録ボタン */}
        <nav className="flex items-center gap-3 text-sm">
          <Link href="/login">
            <Button
              variant="ghost"
              className="text-gray-700 hover:bg-green-50 hover:text-green-700"
            >
              ログイン
            </Button>
          </Link>
          <Link href="/signup">
            <Button className="bg-green-600 text-white hover:bg-green-700">
              無料で始める
            </Button>
          </Link>
        </nav>
      </div>
    </header>
  );
}


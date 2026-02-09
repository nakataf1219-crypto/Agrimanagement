"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Settings, LogOut, Leaf, User as UserIcon } from "lucide-react";
import type { User } from "@supabase/supabase-js";

/**
 * ダッシュボードヘッダーのプロパティ
 */
interface DashboardHeaderProps {
  /** ログイン中のユーザー情報（nullの場合は未ログイン） */
  currentUser: User | null;
  /** ログアウト処理を実行する関数 */
  onLogout: () => void;
  /** ログアウト処理中かどうか */
  isLoggingOut: boolean;
}

/**
 * ダッシュボードのヘッダーコンポーネント
 * 
 * ビジネス上の役割:
 * - アプリのブランド（AgriManagement）を表示
 * - ログインユーザーのメールアドレスを表示
 * - 設定画面やログアウトへのアクセスを提供
 */
export function DashboardHeader({
  currentUser,
  onLogout,
  isLoggingOut,
}: DashboardHeaderProps) {
  return (
    <header className="bg-green-600 text-white shadow-md">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* ロゴ・ブランド表示 */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Leaf className="h-6 w-6" />
              <span className="text-xl font-bold">AgriManagement</span>
            </div>
          </div>

          {/* 右側のボタン群 */}
          <div className="flex items-center gap-2">
            {/* ログインユーザー情報を表示 */}
            {currentUser && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-white/10 rounded-lg mr-2">
                <UserIcon className="h-4 w-4" />
                <span className="text-sm">{currentUser.email}</span>
              </div>
            )}

            {/* プランボタン（料金プラン画面へのリンク） */}
            <Link href="/pricing">
              <Button
                variant="ghost"
                className="text-white hover:bg-white/10 border border-white/30"
              >
                プラン
              </Button>
            </Link>

            {/* 設定ボタン（/settingsページへのリンク） */}
            <Link href="/settings">
              <Button
                variant="ghost"
                className="text-white hover:bg-white/10 border border-white/30"
              >
                <Settings className="h-4 w-4 mr-2" />
                設定
              </Button>
            </Link>

            {/* ログアウトボタン */}
            <Button
              variant="ghost"
              className="text-white hover:bg-white/10 border border-white/30"
              onClick={onLogout}
              disabled={isLoggingOut}
            >
              <LogOut className="h-4 w-4 mr-2" />
              {isLoggingOut ? "ログアウト中..." : "ログアウト"}
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}

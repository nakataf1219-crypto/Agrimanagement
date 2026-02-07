"use client";

/**
 * 設定ページ
 *
 * ビジネス上の役割:
 * ユーザーが農場情報（農場名、代表者名）と勘定科目を管理できる画面
 * これらの設定は帳票出力や経費登録時に使用される
 */

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createSupabaseClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

// UIコンポーネント
import { Button } from "@/components/ui/button";
import { ArrowLeft, Leaf, Loader2 } from "lucide-react";

// 設定画面専用コンポーネント
import {
  UserProfileSection,
  ExpenseCategorySection,
} from "@/components/settings";

// サブスクリプション管理コンポーネント
import { SubscriptionSection } from "@/components/subscription";

// 下部ナビゲーション
import BottomNav from "@/components/BottomNav";

/**
 * 設定ページのメインコンポーネント
 *
 * 処理の流れ:
 * 1. ユーザー認証を確認
 * 2. 未ログインの場合はログイン画面へリダイレクト
 * 3. ログイン済みの場合は設定画面を表示
 */
export default function SettingsPage() {
  const router = useRouter();

  // ユーザー情報
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // ローディング状態
  const [isLoading, setIsLoading] = useState(true);

  // エラー状態
  const [error, setError] = useState<string | null>(null);

  /**
   * コンポーネントマウント時にユーザー認証を確認
   */
  useEffect(() => {
    const checkAuth = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const supabase = createSupabaseClient();

        // ログインユーザー情報を取得
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) {
          console.error("認証エラー:", userError);
          // 認証エラーの場合はログイン画面へ
          router.push("/login");
          return;
        }

        if (!user) {
          // 未ログインの場合はログイン画面へ
          router.push("/login");
          return;
        }

        setCurrentUser(user);
      } catch (err) {
        console.error("認証確認エラー:", err);
        setError("認証の確認に失敗しました");
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  // ローディング中の表示
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-green-600 mx-auto mb-4" />
          <p className="text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  // エラー表示
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-700 max-w-md mx-auto">
            <p>{error}</p>
            <Button
              onClick={() => router.push("/login")}
              className="mt-4 bg-green-600 hover:bg-green-700"
            >
              ログイン画面へ
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // 未ログイン（リダイレクト中）
  if (!currentUser) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* ヘッダー */}
      <header className="bg-green-600 text-white shadow-md">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* 戻るボタン + タイトル */}
            <div className="flex items-center gap-3">
              <Link href="/dashboard">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white hover:bg-white/10 -ml-2"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div className="flex items-center gap-2">
                <Leaf className="h-6 w-6" />
                <span className="text-xl font-bold">設定</span>
              </div>
            </div>

            {/* ユーザー情報 */}
            <div className="text-sm text-white/80">{currentUser.email}</div>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 max-w-2xl">
        <div className="space-y-6">
          {/* プランと使用状況セクション */}
          <SubscriptionSection userId={currentUser.id} />

          {/* 農場情報セクション */}
          <UserProfileSection userId={currentUser.id} />

          {/* 勘定科目管理セクション */}
          <ExpenseCategorySection userId={currentUser.id} />
        </div>
      </main>

      {/* 下部ナビゲーション */}
      <BottomNav />
    </div>
  );
}

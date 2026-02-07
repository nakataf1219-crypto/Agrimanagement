"use client";

/**
 * ログイン画面
 *
 * ビジネス上の役割：
 * - ユーザーがメールアドレスとパスワードでシステムにログインする
 * - ログイン成功後、ダッシュボード（または元々アクセスしようとしていたページ）に遷移
 */

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseClient } from "@/lib/supabase/client";
import { AuthHeader } from "@/components/auth/AuthHeader";
import { LoginForm } from "@/components/auth/LoginForm";

/**
 * ログインページの内部コンポーネント
 * useSearchParams を使用するため、Suspense でラップする必要がある
 */
function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // ログイン後にリダイレクトするURL（元々アクセスしようとしていたページ）
  const redirectTo = searchParams.get("redirectTo") || "/dashboard";

  // フォームの状態管理
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  /**
   * ログインフォームの送信処理
   *
   * ビジネスロジック：
   * 1. メールアドレスとパスワードでSupabaseに認証リクエスト
   * 2. 成功すればダッシュボードへ遷移
   * 3. 失敗すればエラーメッセージを表示
   */
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Supabaseクライアントを作成
      const supabase = createSupabaseClient();

      // メールアドレスとパスワードでログイン
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (authError) {
        // 認証エラーの場合、日本語でエラーメッセージを表示
        if (authError.message.includes("Invalid login credentials")) {
          throw new Error(
            "メールアドレスまたはパスワードが正しくありません。"
          );
        }
        throw new Error(authError.message);
      }

      // ログイン成功、リダイレクト先に遷移
      router.push(redirectTo);
      router.refresh(); // セッション情報を更新
    } catch (err: unknown) {
      // エラーハンドリング：エラーメッセージを表示
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("ログイン中にエラーが発生しました。");
      }
    } finally {
      setLoading(false);
    }
  };

  /**
   * 入力フィールドの変更を処理
   */
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [event.target.name]: event.target.value,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex flex-col">
      <AuthHeader />
      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 pb-12">
        <LoginForm
          onSubmit={handleSubmit}
          onChange={handleChange}
          email={formData.email}
          password={formData.password}
          error={error}
          loading={loading}
        />
      </main>
    </div>
  );
}

/**
 * ログインページ（エクスポート）
 * Next.js App Router で useSearchParams を使用するため、Suspense でラップ
 */
export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex flex-col">
          <AuthHeader />
          <main className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 pb-12">
            <div className="text-gray-500">読み込み中...</div>
          </main>
        </div>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}

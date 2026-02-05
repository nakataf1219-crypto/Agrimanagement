"use client";

/**
 * 会員登録画面
 *
 * ビジネス上の役割：
 * - 新規ユーザーがメールアドレスとパスワードでアカウントを作成する
 * - 登録成功後、確認メールが送信される（設定による）
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createSupabaseClient } from "@/lib/supabase/client";
import Link from "next/link";
import { Leaf, Mail, Lock, CheckCircle } from "lucide-react";

export default function SignupPage() {
  const router = useRouter();

  // フォームの状態管理
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
  });

  /**
   * 会員登録フォームの送信処理
   *
   * ビジネスロジック：
   * 1. パスワードの一致確認
   * 2. メールアドレスとパスワードでSupabaseに登録リクエスト
   * 3. 成功すれば確認メール送信のメッセージを表示
   * 4. 失敗すればエラーメッセージを表示
   */
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    // パスワードの一致確認
    if (formData.password !== formData.confirmPassword) {
      setError("パスワードが一致しません。");
      setLoading(false);
      return;
    }

    // パスワードの長さチェック（Supabaseのデフォルト要件）
    if (formData.password.length < 6) {
      setError("パスワードは6文字以上で入力してください。");
      setLoading(false);
      return;
    }

    try {
      // Supabaseクライアントを作成
      const supabase = createSupabaseClient();

      // メールアドレスとパスワードで会員登録
      const { error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          // メール確認後にリダイレクトするURL
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (authError) {
        // エラーメッセージを日本語に変換
        if (authError.message.includes("already registered")) {
          throw new Error(
            "このメールアドレスは既に登録されています。"
          );
        }
        throw new Error(authError.message);
      }

      // 登録成功
      setSuccess(true);
    } catch (err: unknown) {
      // エラーハンドリング：エラーメッセージを表示
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("登録中にエラーが発生しました。");
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

  // ========================================
  // UIコンポーネントの描画関数
  // ========================================

  /**
   * 共通ヘッダーを描画
   * - ロゴとアプリ名を表示
   */
  const renderHeader = () => (
    <header className="py-6">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center gap-2">
          <Leaf className="h-8 w-8 text-green-600" />
          <h1 className="text-2xl font-bold text-green-600">
            AgriManagement
          </h1>
        </div>
      </div>
    </header>
  );

  /**
   * 登録成功時の画面を描画
   * - 確認メール送信完了のメッセージを表示
   */
  const renderSuccessScreen = () => (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex flex-col">
      {renderHeader()}

      {/* 成功メッセージ */}
      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 pb-12">
        <div className="w-full max-w-md">
          <Card className="shadow-lg">
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <CheckCircle className="h-16 w-16 text-green-600 mx-auto" />
                <h2 className="text-2xl font-bold text-green-600">
                  登録が完了しました
                </h2>
                <p className="text-muted-foreground">
                  確認メールをお送りしました。
                  <br />
                  メール内のリンクをクリックして、
                  <br />
                  アカウントを有効化してください。
                </p>
                <div className="pt-4">
                  <Link href="/login">
                    <Button className="bg-green-600 hover:bg-green-700">
                      ログインページへ
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );

  /**
   * 登録フォーム画面を描画
   * - メールアドレス・パスワード入力フォームを表示
   */
  const renderSignupForm = () => (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex flex-col">
      {renderHeader()}

      {/* メインコンテンツ */}
      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 pb-12">
        <div className="w-full max-w-md">
          <Card className="shadow-lg">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">新規登録</CardTitle>
              <p className="text-sm text-muted-foreground mt-2">
                アカウントを作成して農業経営を始めましょう
              </p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* メールアドレス */}
                <div className="space-y-2">
                  <Label htmlFor="email">メールアドレス</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="example@mail.com"
                      required
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* パスワード */}
                <div className="space-y-2">
                  <Label htmlFor="password">パスワード</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="6文字以上"
                      required
                      minLength={6}
                      className="pl-10"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    6文字以上で入力してください
                  </p>
                </div>

                {/* パスワード確認 */}
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">パスワード（確認）</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      placeholder="パスワードを再入力"
                      required
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* エラーメッセージ */}
                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
                    {error}
                  </div>
                )}

                {/* 登録ボタン */}
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  {loading ? "登録中..." : "アカウントを作成"}
                </Button>
              </form>

              {/* ログインへのリンク */}
              <div className="mt-6 text-center text-sm">
                <span className="text-muted-foreground">
                  既にアカウントをお持ちの方は{" "}
                </span>
                <Link
                  href="/login"
                  className="text-green-600 hover:text-green-700 font-medium hover:underline"
                >
                  ログイン
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );

  // ========================================
  // メインのレンダリング（Early Return）
  // ========================================

  // 登録成功時は成功画面を表示して終了
  if (success) {
    return renderSuccessScreen();
  }

  // 通常時は登録フォームを表示
  return renderSignupForm();
}

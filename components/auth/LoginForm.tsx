"use client";

/**
 * ログインフォーム
 *
 * ビジネス上の役割：
 * - メールアドレスとパスワードを入力してログインする
 * - 入力検証とエラー表示を行う
 */

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { IconInput } from "@/components/ui/icon-input";
import { Mail, Lock } from "lucide-react";
import Link from "next/link";

type LoginFormProps = {
  /** フォーム送信時の処理 */
  onSubmit: (event: React.FormEvent) => void;
  /** 入力フィールドの値変更時の処理 */
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  /** メールアドレスの値 */
  email: string;
  /** パスワードの値 */
  password: string;
  /** エラーメッセージ（あれば表示） */
  error: string | null;
  /** ログイン処理中かどうか */
  loading: boolean;
};

export function LoginForm({
  onSubmit,
  onChange,
  email,
  password,
  error,
  loading,
}: LoginFormProps) {
  return (
    <div className="w-full max-w-md">
      <Card className="shadow-lg">
        <LoginFormHeader />
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-6">
            <EmailField value={email} onChange={onChange} />
            <PasswordField value={password} onChange={onChange} />
            <ErrorMessage error={error} />
            <SubmitButton loading={loading} />
          </form>
          <SignupLink />
          <LegalLink />
        </CardContent>
      </Card>
    </div>
  );
}

/** ログインフォームのヘッダー（タイトルと説明文） */
function LoginFormHeader() {
  return (
    <CardHeader className="text-center">
      <CardTitle className="text-2xl">ログイン</CardTitle>
      <p className="text-sm text-muted-foreground mt-2">
        アカウントにログインして農業経営を管理しましょう
      </p>
    </CardHeader>
  );
}

/** メールアドレス入力フィールド */
function EmailField({
  value,
  onChange,
}: {
  value: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor="email">メールアドレス</Label>
      <IconInput
        icon={Mail}
        id="email"
        name="email"
        type="email"
        value={value}
        onChange={onChange}
        placeholder="example@mail.com"
        required
      />
    </div>
  );
}

/** パスワード入力フィールド */
function PasswordField({
  value,
  onChange,
}: {
  value: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor="password">パスワード</Label>
      <IconInput
        icon={Lock}
        id="password"
        name="password"
        type="password"
        value={value}
        onChange={onChange}
        placeholder="パスワードを入力"
        required
      />
    </div>
  );
}

/** エラーメッセージ表示 */
function ErrorMessage({ error }: { error: string | null }) {
  if (!error) return null;

  return (
    <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
      {error}
    </div>
  );
}

/** ログインボタン */
function SubmitButton({ loading }: { loading: boolean }) {
  return (
    <Button
      type="submit"
      disabled={loading}
      className="w-full bg-green-600 hover:bg-green-700"
    >
      {loading ? "ログイン中..." : "ログイン"}
    </Button>
  );
}

/** 新規登録へのリンク */
function SignupLink() {
  return (
    <div className="mt-6 text-center text-sm">
      <span className="text-muted-foreground">
        アカウントをお持ちでない方は{" "}
      </span>
      <Link
        href="/signup"
        className="text-green-600 hover:text-green-700 font-medium hover:underline"
      >
        新規登録
      </Link>
    </div>
  );
}

/** 特定商取引法へのリンク */
function LegalLink() {
  return (
    <div className="mt-4 text-center text-xs">
      <Link
        href="/legal/tokushoho"
        className="text-muted-foreground hover:text-green-600 hover:underline"
      >
        特定商取引法に基づく表記
      </Link>
    </div>
  );
}

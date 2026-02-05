/**
 * 認証コールバック API Route
 *
 * ビジネス上の役割：
 * - メール確認後のリダイレクト処理を行う
 * - 認証コード（code）をセッショントークンに交換する
 *
 * 使用場面：
 * - 新規登録後の確認メールのリンクをクリックした時
 * - パスワードリセットメールのリンクをクリックした時
 */

import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * GETリクエストのハンドラー
 *
 * 処理の流れ：
 * 1. URLから認証コードを取得
 * 2. Supabaseで認証コードをセッショントークンに交換
 * 3. ダッシュボードにリダイレクト
 *
 * @param request - Next.jsのリクエストオブジェクト
 */
export async function GET(request: Request) {
  // リクエストURLからパラメータを取得
  const requestUrl = new URL(request.url);
  // 認証コード（メール確認リンクに含まれる）
  const code = requestUrl.searchParams.get("code");
  // リダイレクト先（オプション、デフォルトはダッシュボード）
  const next = requestUrl.searchParams.get("next") || "/dashboard";

  // 認証コードが存在する場合、セッショントークンに交換
  if (code) {
    try {
      // サーバー用Supabaseクライアントを作成
      const supabase = await createSupabaseServerClient();

      // 認証コードをセッショントークンに交換
      // これにより、ユーザーのログイン状態が確立される
      const { error } = await supabase.auth.exchangeCodeForSession(code);

      if (error) {
        // 交換に失敗した場合、ログインページにリダイレクト
        console.error("認証コードの交換に失敗:", error.message);
        return NextResponse.redirect(
          new URL("/login?error=auth_callback_failed", requestUrl.origin)
        );
      }

      // 成功した場合、指定されたページにリダイレクト
      return NextResponse.redirect(new URL(next, requestUrl.origin));
    } catch (err) {
      // エラーが発生した場合、ログインページにリダイレクト
      console.error("認証コールバックでエラーが発生:", err);
      return NextResponse.redirect(
        new URL("/login?error=unexpected_error", requestUrl.origin)
      );
    }
  }

  // 認証コードがない場合、ログインページにリダイレクト
  return NextResponse.redirect(new URL("/login", requestUrl.origin));
}

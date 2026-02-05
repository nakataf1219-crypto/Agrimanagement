/**
 * サーバー用Supabaseクライアント
 *
 * このファイルは、サーバーサイド（Next.jsのサーバーコンポーネントやAPI Route）で
 * Supabaseにアクセスするためのクライアントを提供します。
 *
 * 使用例：
 * - サーバーコンポーネントでのデータ取得
 * - API Routeでの認証確認やデータ操作
 */

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * サーバー用のSupabaseクライアントを作成する関数
 *
 * ビジネス上の役割：
 * - サーバー上でユーザーの認証状態を確認する
 * - RLS（行レベルセキュリティ）を通じて、ログインユーザーのデータのみ取得する
 *
 * 注意：
 * - この関数はサーバーコンポーネントやAPI Route内でのみ使用可能
 * - ブラウザ側では使用できません（cookiesはサーバー専用のAPIのため）
 */
export async function createSupabaseServerClient() {
  // 環境変数からSupabaseの接続情報を取得
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // 環境変数が設定されていない場合はエラーをスロー
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Supabase環境変数が設定されていません。" +
        ".env.localファイルに NEXT_PUBLIC_SUPABASE_URL と NEXT_PUBLIC_SUPABASE_ANON_KEY を設定してください。"
    );
  }

  // Next.jsのcookies()を取得（ユーザーのセッション情報が含まれている）
  const cookieStore = await cookies();

  // サーバー用のSupabaseクライアントを作成
  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      // Cookieの一覧を取得する関数
      // サーバーがユーザーを識別するために必要
      getAll() {
        return cookieStore.getAll();
      },
      // Cookieを設定する関数
      // ログイン後のセッション保存などで使用
      setAll(cookiesToSet) {
        try {
          // 複数のCookieを一度に設定
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // サーバーコンポーネントからsetAllが呼ばれた場合は無視
          // これはMiddlewareでセッションを更新する際に正常に動作するため
        }
      },
    },
  });
}

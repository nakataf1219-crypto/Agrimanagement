/**
 * ブラウザ用Supabaseクライアント
 *
 * このファイルは、クライアントサイド（ブラウザ）で動作するコンポーネントから
 * Supabaseにアクセスするためのクライアントを提供します。
 *
 * 使用例：
 * - ログインフォームでの認証処理
 * - クライアントコンポーネントからのデータ取得
 */

import { createBrowserClient } from "@supabase/ssr";

/**
 * ブラウザ用のSupabaseクライアントを作成する関数
 *
 * ビジネス上の役割：
 * - ユーザーがブラウザ上で操作する際に、Supabaseと通信するための窓口
 * - ログイン、ログアウト、データの取得などをブラウザから実行可能にする
 */
export function createSupabaseClient() {
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

  // ブラウザ用のSupabaseクライアントを作成
  // このクライアントは自動的にCookieを使ってセッションを管理します
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}

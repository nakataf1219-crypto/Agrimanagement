/**
 * Middleware用Supabaseクライアント
 *
 * このファイルは、Next.jsのMiddlewareで使用するSupabaseクライアントを提供します。
 * Middlewareは、すべてのリクエストの前に実行される処理で、
 * 認証チェックやセッションの更新に使用します。
 *
 * 使用例：
 * - 未ログインユーザーをログインページにリダイレクト
 * - セッショントークンの自動更新
 */

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * セッションを更新し、認証状態を確認する関数
 *
 * ビジネス上の役割：
 * - ページにアクセスするたびにセッションが有効かどうかを確認
 * - セッションが切れそうな場合は自動的に更新（ユーザーは再ログイン不要）
 * - 未ログインユーザーを保護されたページから締め出す
 *
 * @param request - Next.jsのリクエストオブジェクト
 * @returns レスポンスオブジェクト（リダイレクトまたは通常のレスポンス）
 */
export async function updateSession(request: NextRequest) {
  // レスポンスオブジェクトを作成（後でCookieを設定するため）
  let supabaseResponse = NextResponse.next({
    request,
  });

  // 環境変数からSupabaseの接続情報を取得
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // 環境変数が設定されていない場合は処理をスキップ
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn("Supabase環境変数が設定されていないため、認証をスキップします。");
    return supabaseResponse;
  }

  // Middleware用のSupabaseクライアントを作成
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      // リクエストからCookieを取得
      getAll() {
        return request.cookies.getAll();
      },
      // レスポンスにCookieを設定
      // これにより、セッションの更新がブラウザに反映される
      setAll(cookiesToSet) {
        // まずリクエストオブジェクトにCookieを設定
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        // 新しいレスポンスを作成し、Cookieを設定
        supabaseResponse = NextResponse.next({
          request,
        });
        // レスポンスにもCookieを設定（ブラウザに送信するため）
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  // セッションを更新し、現在のユーザーを取得
  // この処理により、期限切れ間近のセッションが自動更新される
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 保護対象のルート（未ログインではアクセスできないページ）
  const protectedRoutes = ["/dashboard", "/expenses", "/sales", "/analysis"];

  // 除外するルート（未ログインでもアクセス可能なページ）
  const publicRoutes = ["/login", "/signup", "/auth/callback", "/"];

  // 現在のパスを取得
  const currentPath = request.nextUrl.pathname;

  // 公開ルートかどうかをチェック
  const isPublicRoute = publicRoutes.some(
    (route) => currentPath === route || currentPath.startsWith("/auth/")
  );

  // 保護ルートかどうかをチェック
  const isProtectedRoute = protectedRoutes.some((route) =>
    currentPath.startsWith(route)
  );

  // 未ログインで保護ルートにアクセスしようとした場合
  if (!user && isProtectedRoute) {
    // ログインページにリダイレクト
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    // 元々アクセスしようとしたページをパラメータに保存（ログイン後に戻るため）
    redirectUrl.searchParams.set("redirectTo", currentPath);
    return NextResponse.redirect(redirectUrl);
  }

  // ログイン済みでログインページや登録ページにアクセスしようとした場合
  if (user && (currentPath === "/login" || currentPath === "/signup")) {
    // ダッシュボードにリダイレクト
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/dashboard";
    return NextResponse.redirect(redirectUrl);
  }

  return supabaseResponse;
}

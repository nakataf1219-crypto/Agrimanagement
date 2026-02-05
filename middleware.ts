/**
 * Next.js認証Middleware
 *
 * このファイルは、アプリケーションへのすべてのリクエストの前に実行されます。
 * 主な役割：
 * 1. ユーザーの認証状態をチェック
 * 2. 未ログインユーザーを保護されたページからリダイレクト
 * 3. セッションの自動更新（ユーザーが長時間操作しても再ログイン不要）
 *
 * ビジネス上の役割：
 * - 農業管理データを他のユーザーから守る
 * - ログインしないと売上・経費データにアクセスできないようにする
 */

import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/**
 * Middleware本体
 *
 * すべてのリクエストに対して実行され、認証状態に応じた処理を行う
 *
 * @param request - Next.jsのリクエストオブジェクト
 */
export async function middleware(request: NextRequest) {
  // Supabaseのセッション更新と認証チェックを実行
  return await updateSession(request);
}

/**
 * Middlewareを適用するルートの設定
 *
 * matcher配列で指定したパスにのみMiddlewareが実行されます。
 * 静的ファイル（画像、CSS、JSなど）は除外して、パフォーマンスを維持します。
 */
export const config = {
  matcher: [
    /*
     * 以下のパス以外すべてにマッチ：
     * - _next/static（静的ファイル）
     * - _next/image（画像最適化API）
     * - favicon.ico（ファビコン）
     * - 画像ファイル（svg, png, jpg, jpeg, gif, webp）
     *
     * これにより、ページアクセスのみ認証チェックが行われ、
     * 静的リソースは高速に配信されます。
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

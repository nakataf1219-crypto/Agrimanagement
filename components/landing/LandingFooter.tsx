import Link from "next/link";

/**
 * ランディングページ用フッター
 *
 * ビジネス上の役割：
 * - Stripe が求める「特定商取引法に基づく表記」ページへのリンクを明示的に配置する
 * - 利用者が運営者情報や今後追加するポリシー類へ簡単にアクセスできるようにする
 */
export function LandingFooter() {
  return (
    <footer className="border-t bg-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 text-sm text-gray-500 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <p>© 2024 AgriManagement. All rights reserved.</p>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/legal/tokushoho"
            className="hover:text-green-700 hover:underline"
          >
            特定商取引法に基づく表記
          </Link>

          {/* 将来的にプライバシーポリシーやお問い合わせページを追加する想定 */}
          <span className="text-gray-300">|</span>
          <span className="text-xs text-gray-400">
            プライバシーポリシー / お問い合わせページは準備中です
          </span>
        </div>
      </div>
    </footer>
  );
}


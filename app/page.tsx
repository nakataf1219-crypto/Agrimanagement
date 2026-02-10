/**
 * ランディングページ（トップページ）
 *
 * ビジネス上の役割：
 * - 初めてアクセスした人に、サービスの概要・メリット・料金をわかりやすく伝える
 * - 「無料登録」や「ログイン」など、次のアクションにつなげる
 * - Stripe の審査要件（ログイン不要ページ・特商法リンク）を満たす
 */

import {
  FeaturesSection,
  HeroSection,
  LandingFooter,
  LandingHeader,
  PricingSection,
} from "@/components/landing";

/**
 * ルートパス（/）のページコンポーネント
 * ここではダッシュボードへのリダイレクトではなく、ログイン不要のLPを表示する
 */
export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white">
      {/* 画面上部：ロゴとログイン／新規登録ボタン */}
      <LandingHeader />

      {/* メインコンテンツ */}
      <main>
        {/* サービスの概要とメインCTA */}
        <HeroSection />

        {/* 機能紹介 */}
        <FeaturesSection />

        {/* 料金プラン */}
        <PricingSection />
      </main>

      {/* フッター（特商法リンクを含む） */}
      <LandingFooter />
    </div>
  );
}


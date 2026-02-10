import Link from "next/link";
import { Button } from "@/components/ui/button";

/**
 * ヒーローセクション
 *
 * ビジネス上の役割：
 * - 「何ができるサービスか」「どんな価値があるか」を一目で伝える
 * - メインのボタンから無料登録や料金ページへ誘導し、利用開始までの流れを短くする
 */
export function HeroSection() {
  return (
    <section className="bg-gradient-to-b from-green-50 to-white">
      <div className="mx-auto flex max-w-6xl flex-col items-center px-4 py-16 text-center sm:px-6 lg:flex-row lg:items-start lg:py-24 lg:text-left">
        {/* 左側：キャッチコピーと説明文 */}
        <div className="w-full lg:w-1/2">
          <p className="text-sm font-semibold uppercase tracking-wide text-green-700">
            農業経営を、もっとかんたんに
          </p>
          <h1 className="mt-3 text-3xl font-bold leading-tight text-gray-900 sm:text-4xl md:text-5xl">
            レシートを撮るだけで、
            <br className="hidden sm:inline" />
            経費と売上を自動で整理。
          </h1>
          <p className="mt-5 max-w-xl text-base text-gray-600 sm:text-lg">
            AgriManagement は、農家・農業法人向けの
            「経費・売上管理の一元管理ツール」です。
            レシート読み取りから仕訳、レポート作成までを一つの画面で完結させ、
            面倒な事務作業にかかる時間を大きく減らします。
          </p>

          {/* CTAボタン群：無料登録と料金ページへの導線 */}
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-start">
            <Link href="/signup">
              <Button
                size="lg"
                className="w-full bg-green-600 text-white hover:bg-green-700 sm:w-auto"
              >
                無料で始める（クレジットカード不要）
              </Button>
            </Link>
            <Link href="/pricing">
              <Button
                size="lg"
                variant="outline"
                className="w-full border-green-600 text-green-700 hover:bg-green-50 sm:w-auto"
              >
                料金プランを見る
              </Button>
            </Link>
          </div>

          <p className="mt-4 text-xs text-gray-500">
            ※無料プランでも、OCRやレポート機能をお試しいただけます。
          </p>
        </div>

        {/* 右側：ダッシュボードのイメージ（将来スクリーンショットに差し替え可能） */}
        <div className="mt-12 w-full lg:mt-0 lg:w-1/2 lg:pl-12">
          <div className="rounded-2xl border border-green-100 bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold text-green-700">
              ダッシュボードのイメージ
            </p>
            <p className="mt-2 text-xs text-gray-500">
              実際の画面とは異なる場合がありますが、
              売上・経費・利益の推移をひと目で確認できるイメージです。
            </p>

            {/* 簡易的なダミーカード：数字のイメージを伝えるための装飾 */}
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl bg-green-50 p-4">
                <p className="text-xs text-gray-500">今月の売上</p>
                <p className="mt-2 text-xl font-bold text-gray-900">
                  ¥1,200,000
                </p>
              </div>
              <div className="rounded-xl bg-green-50 p-4">
                <p className="text-xs text-gray-500">今月の経費</p>
                <p className="mt-2 text-xl font-bold text-gray-900">
                  ¥450,000
                </p>
              </div>
              <div className="rounded-xl bg-green-50 p-4">
                <p className="text-xs text-gray-500">今月の利益</p>
                <p className="mt-2 text-xl font-bold text-gray-900">
                  ¥750,000
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}


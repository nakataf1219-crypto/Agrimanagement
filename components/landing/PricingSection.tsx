import Link from "next/link";
import { PricingTable } from "@/components/pricing";

/**
 * 料金セクション
 *
 * ビジネス上の役割：
 * - 「いくらで使えるのか」をトップページの時点で把握してもらい、料金に対する不安を減らす
 * - より詳しい比較が必要なユーザーを料金ページ（/pricing）へ誘導する
 */
export function PricingSection() {
  return (
    <section className="border-t bg-gray-50">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl">
            シンプルで分かりやすい料金プラン
          </h2>
          <p className="mt-3 text-sm text-gray-600 sm:text-base">
            無料プランから始めて、必要に応じていつでもアップグレードできます。
            すべての有料プランは、解約金なし・いつでも解約可能です。
          </p>
        </div>

        {/* 料金プラン比較テーブル（トップページではログイン前提でシンプルに表示） */}
        <div className="mt-10">
          <PricingTable isLoggedIn={false} currentPlanType={null} />
        </div>

        <div className="mt-6 text-center text-sm">
          <Link
            href="/pricing"
            className="text-green-700 underline-offset-4 hover:underline"
          >
            すべての料金プランの詳細を見る
          </Link>
        </div>
      </div>
    </section>
  );
}


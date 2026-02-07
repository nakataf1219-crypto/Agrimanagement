/**
 * 料金ページ
 *
 * ビジネス上の役割:
 * ユーザーに各プランの詳細と価格を提示し、
 * 最適なプランを選択してもらうための比較ページ
 *
 * 主な機能:
 * - 4つのプラン（無料、スタンダード、プレミアム、年額プロ）の比較表示
 * - ログイン中のユーザーには現在のプランを強調表示
 * - 各プランの「申し込む」ボタンからStripe Checkoutへ遷移
 */

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  HelpCircle,
  Leaf,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PricingTable } from "@/components/pricing";
import { createSupabaseClient } from "@/lib/supabase/client";
import { getUserPlanType } from "@/lib/subscription";
import type { PlanType } from "@/lib/stripe";
import type { User } from "@supabase/supabase-js";

/**
 * 料金ページのメインコンポーネント
 */
export default function PricingPage() {
  // ユーザー情報
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // 現在のプランタイプ
  const [currentPlanType, setCurrentPlanType] = useState<PlanType | null>(null);

  // ローディング状態
  const [isLoading, setIsLoading] = useState(true);

  /**
   * コンポーネントマウント時にユーザー情報とプランを取得
   */
  useEffect(() => {
    async function fetchUserAndPlan() {
      try {
        setIsLoading(true);

        const supabase = createSupabaseClient();

        // ログインユーザー情報を取得
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          setCurrentUser(user);

          // ログイン済みの場合はプランタイプも取得
          const planType = await getUserPlanType(supabase, user.id);
          setCurrentPlanType(planType);
        }
      } catch (err) {
        console.error("ユーザー情報取得エラー:", err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchUserAndPlan();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white">
      {/* ヘッダー */}
      <header className="bg-green-600 text-white shadow-md">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* 戻るボタン + タイトル */}
            <div className="flex items-center gap-3">
              <Link href={currentUser ? "/dashboard" : "/"}>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white hover:bg-white/10 -ml-2"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div className="flex items-center gap-2">
                <Leaf className="h-6 w-6" />
                <span className="text-xl font-bold">料金プラン</span>
              </div>
            </div>

            {/* ユーザー情報またはログインボタン */}
            <div>
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : currentUser ? (
                <span className="text-sm text-white/80">
                  {currentUser.email}
                </span>
              ) : (
                <Link href="/login?redirect=pricing">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-white hover:bg-white/10"
                  >
                    ログイン
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* ページタイトルセクション */}
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            あなたに合ったプランを選びましょう
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            無料プランで始めて、必要に応じてアップグレード。
            <br className="hidden sm:block" />
            すべての有料プランは即時解約可能、違約金なしで安心です。
          </p>
        </div>

        {/* ローディング中 */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-10 w-10 animate-spin text-green-600" />
          </div>
        ) : (
          <>
            {/* 料金プラン比較テーブル */}
            <PricingTable
              currentPlanType={currentPlanType}
              isLoggedIn={!!currentUser}
            />

            {/* 安心ポイント */}
            <div className="mt-16">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                <h2 className="text-xl font-bold text-gray-900 text-center mb-8">
                  安心してご利用いただける理由
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {/* いつでも解約可能 */}
                  <div className="text-center">
                    <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mb-4">
                      <CheckCircle2 className="h-6 w-6 text-green-600" />
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-2">
                      いつでも解約可能
                    </h3>
                    <p className="text-sm text-gray-600">
                      違約金なし。契約期間の縛りもありません。
                      いつでも自由にプラン変更・解約ができます。
                    </p>
                  </div>

                  {/* セキュリティ */}
                  <div className="text-center">
                    <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mb-4">
                      <ShieldCheck className="h-6 w-6 text-green-600" />
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-2">
                      安全な決済
                    </h3>
                    <p className="text-sm text-gray-600">
                      Stripeを利用した安全な決済システム。
                      カード情報は当社サーバーに保存されません。
                    </p>
                  </div>

                  {/* サポート */}
                  <div className="text-center">
                    <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mb-4">
                      <HelpCircle className="h-6 w-6 text-green-600" />
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-2">
                      充実のサポート
                    </h3>
                    <p className="text-sm text-gray-600">
                      ご不明点はいつでもお問い合わせください。
                      プレミアムプランは優先サポート付き。
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* よくある質問 */}
            <div className="mt-16">
              <h2 className="text-xl font-bold text-gray-900 text-center mb-8">
                よくある質問
              </h2>
              <div className="max-w-3xl mx-auto space-y-6">
                <FaqItem
                  question="無料プランから有料プランへ移行した場合、データは引き継がれますか？"
                  answer="はい、すべてのデータはそのまま引き継がれます。経費や売上の履歴も失われません。"
                />
                <FaqItem
                  question="有料プランを解約した場合、データはどうなりますか？"
                  answer="解約後も無料プランとしてデータは保持されます。ただし、無料プランの制限が適用されます。"
                />
                <FaqItem
                  question="支払い方法は何が使えますか？"
                  answer="クレジットカード（Visa、Mastercard、American Express、JCB）がご利用いただけます。"
                />
                <FaqItem
                  question="年額プランの途中解約は可能ですか？"
                  answer="はい、いつでも解約可能です。解約後も契約期間終了まではサービスをご利用いただけます。日割り返金は行っておりません。"
                />
              </div>
            </div>

            {/* CTA */}
            {!currentUser && (
              <div className="mt-16 text-center">
                <div className="bg-green-600 rounded-2xl p-8 text-white">
                  <h2 className="text-2xl font-bold mb-4">
                    まずは無料で始めてみましょう
                  </h2>
                  <p className="text-green-100 mb-6">
                    アカウント登録は1分で完了。クレジットカード不要で始められます。
                  </p>
                  <Link href="/signup">
                    <Button
                      size="lg"
                      className="bg-white text-green-600 hover:bg-green-50"
                    >
                      無料アカウントを作成
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* フッター */}
      <footer className="border-t border-gray-100 mt-16 py-8">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-gray-500">
          <p>© 2024 AgriManagement. All rights reserved.</p>
          <p className="mt-2">
            ご不明な点がございましたら、お気軽にお問い合わせください。
          </p>
        </div>
      </footer>
    </div>
  );
}

/**
 * FAQ項目コンポーネント
 */
interface FaqItemProps {
  question: string;
  answer: string;
}

function FaqItem({ question, answer }: FaqItemProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="font-semibold text-gray-900 mb-2">{question}</h3>
      <p className="text-sm text-gray-600">{answer}</p>
    </div>
  );
}

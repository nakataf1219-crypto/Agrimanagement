"use client";

/**
 * 特定商取引法に基づく表記ページ
 *
 * ビジネス上の役割：
 * - Stripe決済申請に必要な法的表記ページ
 * - 消費者に対して事業者情報を明示する
 */

import Link from "next/link";
import { Leaf, ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

/**
 * 特定商取引法に基づく表記として掲載する項目
 * 各項目は「項目名」と「内容」のペアで構成
 */
const LEGAL_INFORMATION = [
  { label: "代表責任者", value: "中田幸多郎" },
  { label: "住所", value: "請求により遅滞なく開示いたします。" },
  { label: "電話番号", value: "請求により遅滞なく開示いたします。" },
  { label: "メールアドレス", value: "nakataf1219@gmail.com" },
  { label: "販売価格", value: "各商品ページに記載（表示価格は消費税込み）" },
  { label: "支払方法", value: "クレジットカード決済" },
  { label: "支払時期", value: "クレジットカードでの注文確定後、直ちに利用可能" },
  { label: "返品・交換について", value: "デジタルサービスの特性上、返品・返金はお受けできません。" },
  {
    label: "推奨ブラウザ",
    value:
      "Google Chrome最新版、Safari最新版、Microsoft Edge最新版※Internet Explorerには対応しておりません",
  },
  {
    label: "推奨OS",
    value:
      "Windows 10/11、macOS 最新版、iOS 13以降、Android 9以降※Windows 7、Windows 8など、メーカーサポートが終了しているOSはサポートしておりません",
  },
];

export default function TokushohoPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex flex-col">
      {/* ヘッダー部分：ロゴとアプリ名 */}
      <PageHeader />

      {/* メインコンテンツ */}
      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12">
        <div className="w-full max-w-2xl">
          <Card className="shadow-lg">
            <CardHeader className="text-center border-b">
              <CardTitle className="text-2xl text-green-700">
                特定商取引法に基づく表記
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              {/* 表記内容をテーブル形式で表示 */}
              <LegalInformationTable />

              {/* 戻るボタン */}
              <BackToLoginButton />
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

/**
 * ページヘッダー
 * ロゴとアプリ名を中央に表示
 */
function PageHeader() {
  return (
    <header className="py-6">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="flex items-center justify-center gap-2 hover:opacity-80 transition-opacity"
        >
          <Leaf className="h-8 w-8 text-green-600" />
          <h1 className="text-2xl font-bold text-green-600">AgriManagement</h1>
        </Link>
      </div>
    </header>
  );
}

/**
 * 法的情報テーブル
 * 特定商取引法に必要な各項目を行として表示
 */
function LegalInformationTable() {
  return (
    <div className="divide-y divide-gray-200">
      {LEGAL_INFORMATION.map((item) => (
        <LegalInformationRow key={item.label} label={item.label} value={item.value} />
      ))}
    </div>
  );
}

/**
 * テーブルの1行（項目名と内容のペア）
 */
function LegalInformationRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4">
      {/* 項目名 */}
      <dt className="text-sm font-medium text-gray-700">{label}</dt>
      {/* 内容 */}
      <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{value}</dd>
    </div>
  );
}

/**
 * ログインページに戻るボタン
 */
function BackToLoginButton() {
  return (
    <div className="mt-8 text-center">
      <Link href="/login">
        <Button
          variant="outline"
          className="text-green-600 border-green-600 hover:bg-green-50"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          ログインページへ戻る
        </Button>
      </Link>
    </div>
  );
}

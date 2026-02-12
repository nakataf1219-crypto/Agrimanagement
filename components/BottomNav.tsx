"use client";

/**
 * 画面下部のナビゲーションバー
 * 
 * ビジネス上の役割:
 * - ホーム、分析、レシート（経費登録）、設定の4つの主要機能へのアクセスを提供
 * - 「レシート」ボタンをタップすると、カメラでレシートを撮影して経費を自動登録できる
 * 
 * 表示ルール:
 * - ログイン後のダッシュボード系ページでのみ表示
 * - LP（/）やログイン・サインアップページでは非表示
 */

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, BarChart2, Camera, Settings } from "lucide-react";
import ReceiptScanner from "@/components/receipt/ReceiptScanner";

/**
 * BottomNavを表示しないページのパスリスト
 * 
 * ビジネス上の理由:
 * - LP（/）はログイン前のユーザー向けなので、ダッシュボード用ナビは不要
 * - ログイン・サインアップページも同様に認証前の画面
 * - 特商法ページもLP系のページなのでナビ不要
 * - 料金ページもLP系なのでナビ不要
 */
const HIDDEN_NAV_PATHS = [
  "/",           // ランディングページ
  "/login",      // ログインページ
  "/signup",     // サインアップページ
  "/legal",      // 法的ページ（特商法など）
  "/pricing",    // 料金ページ
];

/**
 * 現在のパスがBottomNavを非表示にすべきかを判定
 * 
 * @param pathname - 現在のURLパス
 * @returns true: ナビを非表示にする、false: ナビを表示する
 */
const shouldHideBottomNav = (pathname: string | null): boolean => {
  if (!pathname) return true;
  
  // 完全一致または前方一致でチェック
  return HIDDEN_NAV_PATHS.some(
    (hiddenPath) =>
      pathname === hiddenPath ||
      (hiddenPath !== "/" && pathname.startsWith(hiddenPath + "/"))
  );
};

export default function BottomNav() {
  const pathname = usePathname();
  
  // レシートスキャナーモーダルの開閉状態
  const [isReceiptScannerOpen, setIsReceiptScannerOpen] = useState(false);
  
  // LP・ログイン・サインアップページではナビを表示しない
  if (shouldHideBottomNav(pathname)) {
    return null;
  }

  // ナビゲーション項目の定義
  // isButton: true の項目はリンクではなくボタンとして動作
  // 注意: ホームは /dashboard にリンク（LPの / とは分離）
  const navItems = [
    {
      href: "/dashboard",
      label: "ホーム",
      icon: Home,
      isButton: false,
    },
    {
      href: "/analysis",
      label: "分析",
      icon: BarChart2,
      isButton: false,
    },
    {
      href: "#",
      label: "レシート",
      icon: Camera,
      isButton: true, // ボタンとして動作（モーダルを開く）
    },
    {
      href: "/settings",
      label: "設定",
      icon: Settings,
      isButton: false,
    },
  ];

  /**
   * レシートボタンがクリックされた時の処理
   * モーダルを開いてレシートスキャナーを表示
   */
  const handleReceiptClick = () => {
    setIsReceiptScannerOpen(true);
  };

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
        <div className="container mx-auto">
          <div className="flex items-center justify-around h-16">
            {navItems.map((item) => {
              const Icon = item.icon;
              
              // ホームボタン（/dashboard）のアクティブ判定
              const isActive =
                item.href === "/dashboard"
                  ? pathname === "/dashboard" || pathname?.startsWith("/dashboard/")
                  : pathname === item.href || pathname?.startsWith(item.href + "/");

              // ボタンタイプの場合（レシートボタン）
              if (item.isButton) {
                return (
                  <button
                    key={item.label}
                    onClick={handleReceiptClick}
                    className="flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors text-gray-500 hover:text-green-600"
                  >
                    {/* レシートボタンは緑の円形背景で強調 */}
                    <div className="bg-green-600 rounded-full p-2 -mt-4 shadow-lg">
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <span className="text-xs font-normal text-green-600">
                      {item.label}
                    </span>
                  </button>
                );
              }

              // 通常のリンクタイプの場合
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors ${
                    isActive
                      ? "text-green-600"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <Icon
                    className={`h-6 w-6 ${
                      isActive ? "fill-current" : ""
                    }`}
                  />
                  <span className={`text-xs ${isActive ? "font-semibold" : "font-normal"}`}>
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      {/* レシートスキャナーモーダル */}
      <ReceiptScanner
        isOpen={isReceiptScannerOpen}
        onClose={() => setIsReceiptScannerOpen(false)}
      />
    </>
  );
}

"use client";

/**
 * 画面下部のナビゲーションバー
 * 
 * ビジネス上の役割:
 * - ホーム、分析、レシート（経費登録）、設定の4つの主要機能へのアクセスを提供
 * - 「レシート」ボタンをタップすると、カメラでレシートを撮影して経費を自動登録できる
 */

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, BarChart2, Camera, Settings } from "lucide-react";
import ReceiptScanner from "@/components/receipt/ReceiptScanner";

export default function BottomNav() {
  const pathname = usePathname();
  
  // レシートスキャナーモーダルの開閉状態
  const [isReceiptScannerOpen, setIsReceiptScannerOpen] = useState(false);

  // ナビゲーション項目の定義
  // isButton: true の項目はリンクではなくボタンとして動作
  const navItems = [
    {
      href: "/",
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
              
              // ホーム（/）の場合は /dashboard もアクティブとして扱う
              const isActive =
                item.href === "/"
                  ? pathname === "/" || pathname === "/dashboard" || pathname?.startsWith("/dashboard/")
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

import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import BottomNav from "@/components/BottomNav";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/**
 * ビューポート設定
 * 
 * ビジネス上の役割:
 * スマホでの表示を最適化するための設定
 * - width: device-width → 端末の画面幅に合わせる
 * - initial-scale: 1 → 初期表示は等倍
 * - maximum-scale: 1 → ピンチズームを無効化（フォーム入力時の誤操作防止）
 * - user-scalable: no → ズーム無効化（アプリライクな操作感）
 * - viewport-fit: cover → iPhone X以降のノッチ対応
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#16a34a", // 緑色（アプリのテーマカラー）
};

/**
 * メタデータ設定
 * 
 * ビジネス上の役割:
 * - SEOとSNSシェア時の表示を最適化
 * - PWA対応のためのmanifest.json参照
 * - iOSホーム画面追加時の設定
 */
export const metadata: Metadata = {
  title: "AgriManagement - 農業経営を、もっとクリアに",
  description: "経費・売上の自動見える化とAI経営アシストで、あなたの農業経営を黒字化へ導きます。",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icons/icon.svg", type: "image/svg+xml" },
    ],
    apple: [
      { url: "/apple-touch-icon.svg", sizes: "180x180", type: "image/svg+xml" },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "AgriManagement",
  },
  formatDetection: {
    telephone: false, // 電話番号の自動リンク化を無効（誤タップ防止）
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased pb-20`}
      >
        {children}
        <BottomNav />
      </body>
    </html>
  );
}

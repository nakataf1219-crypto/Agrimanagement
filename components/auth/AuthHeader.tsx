/**
 * 認証ページ共通ヘッダー
 *
 * ビジネス上の役割：
 * - ログイン/新規登録ページの上部に表示するロゴとアプリ名
 * - ブランドの一貫性を保つ
 */

import { Leaf } from "lucide-react";

export function AuthHeader() {
  return (
    <header className="py-6">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center gap-2">
          <Leaf className="h-8 w-8 text-green-600" />
          <h1 className="text-2xl font-bold text-green-600">AgriManagement</h1>
        </div>
      </div>
    </header>
  );
}

"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Camera, Link as LinkIcon } from "lucide-react";

/**
 * アクションカードのプロパティ
 */
interface ActionCardsProps {
  /** 経費登録画面に遷移する関数 */
  onExpenseClick: () => void;
  /** 売上登録画面に遷移する関数 */
  onSaleClick: () => void;
}

/**
 * ダッシュボードのアクションカードセクション
 * 
 * ビジネス上の役割:
 * ユーザーがよく使う機能（経費登録・売上登録）へ
 * すぐにアクセスできるようにする大きなボタン
 * 
 * 表示内容:
 * - 経費を登録する（レシート撮影で自動入力）
 * - 売上を登録する（出荷伝票や入金記録）
 */
export function ActionCards({ onExpenseClick, onSaleClick }: ActionCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
      {/* 経費を登録するカード */}
      <ExpenseActionCard onClick={onExpenseClick} />
      
      {/* 売上を登録するカード */}
      <SaleActionCard onClick={onSaleClick} />
    </div>
  );
}

/**
 * 経費登録アクションカード
 * 
 * ビジネス上の役割:
 * 経費登録画面への入口。レシート撮影機能があることをアピール
 */
function ExpenseActionCard({ onClick }: { onClick: () => void }) {
  return (
    <Card
      className="text-white border-0 shadow-lg hover:shadow-xl transition-shadow cursor-pointer"
      style={{
        backgroundColor: "rgba(42, 106, 41, 1)",
        color: "rgba(255, 255, 255, 1)",
      }}
      onClick={onClick}
    >
      <CardContent className="p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-white/20">
            <Camera className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-semibold mb-1">経費を登録する</h3>
            <p className="text-sm text-white/90">
              レシートをパシャッと撮影して自動入力
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * 売上登録アクションカード
 * 
 * ビジネス上の役割:
 * 売上登録画面への入口。出荷伝票や入金記録の入力を案内
 */
function SaleActionCard({ onClick }: { onClick: () => void }) {
  return (
    <Card
      className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0 shadow-lg hover:shadow-xl transition-shadow cursor-pointer"
      onClick={onClick}
    >
      <CardContent className="p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-white/20">
            <LinkIcon className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-semibold mb-1">売上を登録する</h3>
            <p className="text-sm text-white/90">
              出荷伝票や入金記録を入力
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

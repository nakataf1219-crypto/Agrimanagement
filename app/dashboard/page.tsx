"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

// ダッシュボード専用コンポーネントをインポート
import {
  DashboardHeader,
  ActionCards,
  KPISection,
} from "@/components/dashboard";

/**
 * KPIデータの型定義
 */
interface KPIData {
  income: number;   // 今月の売上総額
  expenses: number; // 今月の経費総額
  profit: number;   // 営業利益（売上 - 経費）
}

/**
 * 金額を日本円の通貨形式にフォーマット
 * 
 * @param amount - フォーマットする金額
 * @returns フォーマットされた文字列（例：¥1,234,567）
 */
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
    minimumFractionDigits: 0,
  }).format(amount);
};

/**
 * 今月の開始日と終了日を取得
 * 
 * @returns startDate: 今月1日, endDate: 今月末日
 */
const getCurrentMonthRange = (): { startDate: string; endDate: string } => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const startDate = new Date(year, month, 1).toISOString().split("T")[0];
  const endDate = new Date(year, month + 1, 0).toISOString().split("T")[0];
  return { startDate, endDate };
};

/**
 * ダッシュボードページ
 * 
 * ビジネス上の役割:
 * ログインユーザーの今月の経営状況を一目で確認できる画面
 * 
 * 主な機能:
 * - 今月の売上・経費・利益のKPI表示
 * - 経費登録・売上登録への導線
 * - ログアウト機能
 */
export default function DashboardPage() {
  const router = useRouter();
  
  // ローディング・エラー状態
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // KPIデータ
  const [kpiData, setKpiData] = useState<KPIData>({
    income: 0,
    expenses: 0,
    profit: 0,
  });

  // ユーザー情報とログアウト状態
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  /**
   * ユーザー表示名を取得する関数
   * 
   * 優先順位:
   * 1. ユーザーメタデータの名前
   * 2. メールアドレスの@より前の部分
   * 3. デフォルト値「ユーザー」
   */
  const getUserDisplayName = (): string => {
    if (!currentUser) return "ユーザー";
    
    const metadataName = currentUser.user_metadata?.name || currentUser.user_metadata?.full_name;
    if (metadataName) return metadataName;
    
    if (currentUser.email) {
      return currentUser.email.split("@")[0];
    }
    
    return "ユーザー";
  };

  /**
   * コンポーネント初期化時のデータ取得
   * 
   * ビジネス上の流れ:
   * 1. ログインユーザー情報を取得
   * 2. 今月の売上・経費データを取得（RLSにより自分のデータのみ）
   * 3. KPIを計算して表示
   */
  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const supabase = createSupabaseClient();

        // ログインユーザー情報を取得
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) {
          console.error("ユーザー取得エラー:", userError);
        }

        if (!isMounted) return;
        setCurrentUser(user);

        const { startDate, endDate } = getCurrentMonthRange();

        // 今月の売上データを取得（RLSで自分のデータのみ）
        const { data: salesData, error: salesError } = await supabase
          .from("sales")
          .select("amount")
          .gte("date", startDate)
          .lte("date", endDate);

        if (salesError) throw salesError;

        // 今月の経費データを取得（RLSで自分のデータのみ）
        const { data: expensesData, error: expensesError } = await supabase
          .from("expenses")
          .select("amount")
          .gte("date", startDate)
          .lte("date", endDate);

        if (expensesError) throw expensesError;

        if (!isMounted) return;

        // 合計値を計算
        const income = salesData?.reduce((sum, sale) => sum + (sale.amount || 0), 0) || 0;
        const expenses = expensesData?.reduce((sum, expense) => sum + (expense.amount || 0), 0) || 0;
        const profit = income - expenses;

        setKpiData({ income, expenses, profit });
      } catch (err: unknown) {
        if (!isMounted) return;
        const errorMessage = err instanceof Error ? err.message : "データの取得に失敗しました";
        setError(errorMessage);
        console.error("データ取得エラー:", err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, []);

  // ナビゲーションハンドラー
  const handleExpenseClick = () => router.push("/expenses/new");
  const handleSaleClick = () => router.push("/sales/new");

  /**
   * ログアウト処理
   * 
   * ビジネス上の流れ:
   * 1. Supabaseからサインアウト
   * 2. セッションが削除される
   * 3. ログイン画面にリダイレクト
   */
  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      const supabase = createSupabaseClient();
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error("ログアウトエラー:", error);
        setError("ログアウトに失敗しました。再度お試しください。");
        return;
      }
      
      router.push("/login");
    } catch (err: unknown) {
      console.error("ログアウト中にエラーが発生:", err);
      setError("ログアウトに失敗しました。");
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <DashboardHeader
        currentUser={currentUser}
        onLogout={handleLogout}
        isLoggingOut={loggingOut}
      />

      {/* メインコンテンツ */}
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ウェルカムセクション */}
        <WelcomeSection userName={getUserDisplayName()} />

        {/* アクションボタン（経費登録・売上登録） */}
        <ActionCards
          onExpenseClick={handleExpenseClick}
          onSaleClick={handleSaleClick}
        />

        {/* エラーメッセージ */}
        {error && <ErrorMessage message={error} />}

        {/* KPIカードセクション */}
        <KPISection
          kpiData={kpiData}
          loading={loading}
          formatCurrency={formatCurrency}
        />
      </main>
    </div>
  );
}

/**
 * ウェルカムセクション
 * 
 * ビジネス上の役割:
 * ユーザーに親しみやすい挨拶を表示
 */
function WelcomeSection({ userName }: { userName: string }) {
  return (
    <div className="mb-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">
        ようこそ、{userName}さん
      </h1>
      <p className="text-gray-600">今月の収支状況を確認しましょう</p>
    </div>
  );
}

/**
 * エラーメッセージ表示
 * 
 * ビジネス上の役割:
 * データ取得やログアウトに失敗した場合のエラーを表示
 */
function ErrorMessage({ message }: { message: string }) {
  return (
    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md text-red-700">
      <strong>エラー:</strong> {message}
    </div>
  );
}

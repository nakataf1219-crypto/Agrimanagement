"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createSupabaseClient } from "@/lib/supabase/client";
import type { Expense, Sale } from "@/lib/supabase";
import { getYearMonthOptions, getMonthRange, getInitialDateRange, parseYearMonth } from "@/lib/dateUtils";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { TrendingUp, TrendingDown, Wallet } from "lucide-react";
import { Label } from "@/components/ui/label";
import ExpensePieChart from "@/components/ExpensePieChart";

// 取引データの型定義（売上と経費を統合）
type Transaction = {
  id: string;
  date: string;
  type: "売上" | "経費";
  item: string; // 作物名 or 勘定科目
  amount: number;
  created_at: string;
};

// 月次データの型定義
type MonthlyData = {
  month: string; // "2024年1月"形式
  monthKey: string; // "2024-01"形式（ソート用）
  sales: number;
  expenses: number;
  profit: number; // 利益 = 売上 - 経費
};

export default function AnalysisPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [kpiData, setKpiData] = useState({
    sales: 0,
    expenses: 0,
    profit: 0,
  });
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  
  // 年月選択のstate（初期値は過去6ヶ月）
  const initialRange = getInitialDateRange(6);
  const [startYear, setStartYear] = useState(initialRange.startYear);
  const [startMonth, setStartMonth] = useState(initialRange.startMonth);
  const [endYear, setEndYear] = useState(initialRange.endYear);
  const [endMonth, setEndMonth] = useState(initialRange.endMonth);

  // 通貨フォーマット関数
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("ja-JP", {
      style: "currency",
      currency: "JPY",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // 今月の開始日と終了日を取得
  const getCurrentMonthRange = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const startDate = new Date(year, month, 1).toISOString().split("T")[0];
    const endDate = new Date(year, month + 1, 0).toISOString().split("T")[0];
    return { startDate, endDate };
  };


  // データ取得
  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // 認証対応のSupabaseクライアントを作成（RLSでユーザーのデータのみ取得可能）
        const supabase = createSupabaseClient();

        const { startDate, endDate } = getCurrentMonthRange();

        // 1. 今月のKPIデータを取得
        const [salesResult, expensesResult] = await Promise.all([
          supabase
            .from("sales")
            .select("amount")
            .gte("date", startDate)
            .lte("date", endDate),
          supabase
            .from("expenses")
            .select("amount")
            .gte("date", startDate)
            .lte("date", endDate),
        ]);

        if (salesResult.error) throw salesResult.error;
        if (expensesResult.error) throw expensesResult.error;

        const sales = salesResult.data?.reduce((sum, s) => sum + (s.amount || 0), 0) || 0;
        const expenses = expensesResult.data?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0;
        const profit = sales - expenses;

        if (!isMounted) return;
        setKpiData({ sales, expenses, profit });

        // 2. 最近の取引を取得（売上と経費を統合）
        const [recentSalesResult, recentExpensesResult] = await Promise.all([
          supabase
            .from("sales")
            .select("id, date, crop_name, amount, created_at")
            .order("created_at", { ascending: false })
            .limit(10),
          supabase
            .from("expenses")
            .select("id, date, category, amount, created_at")
            .order("created_at", { ascending: false })
            .limit(10),
        ]);

        if (recentSalesResult.error) throw recentSalesResult.error;
        if (recentExpensesResult.error) throw recentExpensesResult.error;

        const salesTransactions: Transaction[] =
          recentSalesResult.data?.map((s) => ({
            id: s.id || "",
            date: s.date,
            type: "売上" as const,
            item: s.crop_name,
            amount: s.amount,
            created_at: s.created_at || "",
          })) || [];

        const expensesTransactions: Transaction[] =
          recentExpensesResult.data?.map((e) => ({
            id: e.id || "",
            date: e.date,
            type: "経費" as const,
            item: e.category,
            amount: e.amount,
            created_at: e.created_at || "",
          })) || [];

        // 売上と経費を統合して、日付順（新しい順）にソート
        const allTransactions = [...salesTransactions, ...expensesTransactions]
          .sort((a, b) => {
            const dateA = new Date(a.created_at).getTime();
            const dateB = new Date(b.created_at).getTime();
            return dateB - dateA; // 新しい順
          })
          .slice(0, 10); // 最大10件

        if (!isMounted) return;
        setRecentTransactions(allTransactions);

        // 3. 選択された年月範囲の月次データを取得
        const monthRanges = getMonthRange(startYear, startMonth, endYear, endMonth);
        const monthlyPromises = monthRanges.map(async (range) => {
          const [monthSalesResult, monthExpensesResult] = await Promise.all([
            supabase
              .from("sales")
              .select("amount")
              .gte("date", range.startDate)
              .lte("date", range.endDate),
            supabase
              .from("expenses")
              .select("amount")
              .gte("date", range.startDate)
              .lte("date", range.endDate),
          ]);

          if (monthSalesResult.error) throw monthSalesResult.error;
          if (monthExpensesResult.error) throw monthExpensesResult.error;

          const sales = monthSalesResult.data?.reduce((sum, s) => sum + (s.amount || 0), 0) || 0;
          const expenses = monthExpensesResult.data?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0;
          const profit = sales - expenses;

          return {
            month: range.monthLabel,
            monthKey: range.monthKey,
            sales,
            expenses,
            profit,
          };
        });

        const monthlyResults = await Promise.all(monthlyPromises);

        if (!isMounted) return;
        setMonthlyData(monthlyResults);
      } catch (err: any) {
        if (!isMounted) return;
        setError(err.message || "データの取得に失敗しました");
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
  }, [startYear, startMonth, endYear, endMonth]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-green-600 text-white shadow-md">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <h1 className="text-xl font-bold">分析</h1>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* エラーメッセージ */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md text-red-700">
            <strong>エラー:</strong> {error}
          </div>
        )}

        {/* 1. スコアボード（KPIカード） */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">スコアボード</h2>
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader>
                    <div className="h-6 bg-gray-200 rounded w-24"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="h-10 bg-gray-200 rounded"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* 今月の売上 */}
              <Card className="border-l-4 border-l-blue-500 shadow-md">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-gray-700 text-lg">今月の売上</CardTitle>
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100">
                      <TrendingUp className="h-5 w-5 text-blue-600" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-blue-600 mb-2">
                    {formatCurrency(kpiData.sales)}
                  </div>
                </CardContent>
              </Card>

              {/* 今月の経費 */}
              <Card className="border-l-4 border-l-red-500 shadow-md">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-gray-700 text-lg">今月の経費</CardTitle>
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-100">
                      <TrendingDown className="h-5 w-5 text-red-600" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-red-600 mb-2">
                    {formatCurrency(kpiData.expenses)}
                  </div>
                </CardContent>
              </Card>

              {/* 今月の収支差額 */}
              <Card
                className={`border-l-4 shadow-md ${
                  kpiData.profit >= 0 ? "border-l-green-500" : "border-l-red-500"
                }`}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-gray-700 text-lg">今月の収支差額</CardTitle>
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                        kpiData.profit >= 0 ? "bg-green-100" : "bg-red-100"
                      }`}
                    >
                      <Wallet
                        className={`h-5 w-5 ${
                          kpiData.profit >= 0 ? "text-green-600" : "text-red-600"
                        }`}
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div
                    className={`text-3xl font-bold mb-2 ${
                      kpiData.profit >= 0 ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {formatCurrency(kpiData.profit)}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* 2. 最近の取引一覧 */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">最近の取引</h2>
          {loading ? (
            <Card className="animate-pulse">
              <CardContent className="p-6">
                <div className="space-y-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="h-16 bg-gray-200 rounded"></div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : recentTransactions.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-gray-500">
                取引データがありません
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          日付
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          区分
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          科目/作物
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          金額
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {recentTransactions.map((transaction) => (
                        <tr key={transaction.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {new Date(transaction.date).toLocaleDateString("ja-JP")}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                transaction.type === "売上"
                                  ? "bg-blue-100 text-blue-800"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              {transaction.type}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {transaction.item}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-right">
                            <span
                              className={
                                transaction.type === "売上" ? "text-blue-600" : "text-red-600"
                              }
                            >
                              {formatCurrency(transaction.amount)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* 3. 月次推移グラフ */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">月次収支推移</h2>
              <p className="text-sm text-gray-600 mt-1">売上・経費・利益の推移</p>
            </div>
            <div className="mt-4 sm:mt-0 flex flex-col sm:flex-row gap-4">
              <div className="flex items-center gap-2">
                <Label htmlFor="start-month" className="text-sm font-medium text-gray-700 whitespace-nowrap">
                  開始:
                </Label>
                <select
                  id="start-month"
                  value={`${startYear}-${String(startMonth).padStart(2, "0")}`}
                  onChange={(e) => {
                    const { year, month } = parseYearMonth(e.target.value);
                    // 開始年月が終了年月より後にならないようにバリデーション
                    if (year < endYear || (year === endYear && month <= endMonth)) {
                      setStartYear(year);
                      setStartMonth(month);
                    }
                  }}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  {getYearMonthOptions().map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="end-month" className="text-sm font-medium text-gray-700 whitespace-nowrap">
                  終了:
                </Label>
                <select
                  id="end-month"
                  value={`${endYear}-${String(endMonth).padStart(2, "0")}`}
                  onChange={(e) => {
                    const { year, month } = parseYearMonth(e.target.value);
                    // 終了年月が開始年月より前にならないようにバリデーション
                    if (year > startYear || (year === startYear && month >= startMonth)) {
                      setEndYear(year);
                      setEndMonth(month);
                    }
                  }}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  {getYearMonthOptions().map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          {loading ? (
            <Card className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-64 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ) : monthlyData.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-gray-500">
                グラフデータがありません
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-6">
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 12 }}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => `${(value / 10000).toFixed(0)}万`}
                    />
                    <Tooltip
                      formatter={(value: number | undefined) => 
                        value !== undefined ? formatCurrency(value) : ""
                      }
                      labelStyle={{ color: "#000" }}
                    />
                    <Legend verticalAlign="bottom" />
                    <Line
                      type="monotone"
                      dataKey="sales"
                      name="収入（売上）"
                      stroke="#22c55e"
                      strokeWidth={3}
                      dot={{ r: 5, fill: "#22c55e" }}
                      activeDot={{ r: 7 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="expenses"
                      name="支出（経費）"
                      stroke="#8b5cf6"
                      strokeWidth={2.5}
                      dot={{ r: 5, fill: "#8b5cf6" }}
                      activeDot={{ r: 7 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="profit"
                      name="利益"
                      stroke="#FFA500"
                      strokeWidth={3.5}
                      dot={{ r: 5, fill: "#FFA500" }}
                      activeDot={{ r: 7 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </div>

        {/* 4. 今月の経費内訳 */}
        <div className="mb-8">
          <ExpensePieChart />
        </div>
      </main>
    </div>
  );
}

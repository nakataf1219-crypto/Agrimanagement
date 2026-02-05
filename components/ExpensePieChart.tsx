"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { createSupabaseClient } from "@/lib/supabase/client";
import type { Expense } from "@/lib/supabase";
import { getYearMonthOptions, parseYearMonth } from "@/lib/dateUtils";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { X } from "lucide-react";

// カテゴリーごとの集計データ型
type CategoryData = {
  category: string;
  amount: number;
  percentage: number;
};

// グラフ用データ型（その他を含む）
type ChartData = {
  name: string;
  value: number;
  percentage: number;
  color: string;
};

// 色の定義（青系、緑系、オレンジ系など）
const COLORS = [
  "#3b82f6", // 青
  "#10b981", // 緑
  "#f59e0b", // オレンジ
  "#8b5cf6", // 紫
  "#6b7280", // グレー（その他用）
];

export default function ExpensePieChart() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [detailData, setDetailData] = useState<CategoryData[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [totalAmount, setTotalAmount] = useState(0);

  // 年月選択のstate（初期値は今月）
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);

  // 選択された年月の開始日と終了日を取得
  const getSelectedMonthRange = (year: number, month: number) => {
    const startDate = new Date(year, month - 1, 1).toISOString().split("T")[0];
    const endDate = new Date(year, month, 0).toISOString().split("T")[0];
    return { startDate, endDate };
  };

  // 通貨フォーマット関数
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("ja-JP", {
      style: "currency",
      currency: "JPY",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // データ取得と集計
  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // 認証対応のSupabaseクライアントを作成（RLSでユーザーのデータのみ取得可能）
        const supabase = createSupabaseClient();

        const { startDate, endDate } = getSelectedMonthRange(selectedYear, selectedMonth);

        // 選択された月の経費データを取得（RLSにより自分のデータのみ）
        const { data, error: supabaseError } = await supabase
          .from("expenses")
          .select("category, amount")
          .gte("date", startDate)
          .lte("date", endDate);

        if (supabaseError) throw supabaseError;

        if (!isMounted) return;

        // カテゴリーごとに集計
        const categoryMap = new Map<string, number>();
        data?.forEach((expense) => {
          const category = expense.category || "未分類";
          const amount = expense.amount || 0;
          const current = categoryMap.get(category) || 0;
          categoryMap.set(category, current + amount);
        });

        // 詳細リスト用データ（全ての科目を金額順に）
        const allCategories: CategoryData[] = Array.from(categoryMap.entries())
          .map(([category, amount]) => ({
            category,
            amount,
            percentage: 0, // 後で計算
          }))
          .sort((a, b) => b.amount - a.amount);

        const total = allCategories.reduce((sum, item) => sum + item.amount, 0);
        setTotalAmount(total);

        // パーセンテージを計算
        const allCategoriesWithPercentage = allCategories.map((item) => ({
          ...item,
          percentage: total > 0 ? (item.amount / total) * 100 : 0,
        }));

        setDetailData(allCategoriesWithPercentage);

        // グラフ用データ：上位4つ + その他
        if (allCategories.length === 0) {
          setChartData([]);
          setLoading(false);
          return;
        }

        const top4 = allCategoriesWithPercentage.slice(0, 4);
        const others = allCategoriesWithPercentage.slice(4);

        const othersTotal = others.reduce((sum, item) => sum + item.amount, 0);
        const othersPercentage = total > 0 ? (othersTotal / total) * 100 : 0;

        const chartDataItems: ChartData[] = top4.map((item, index) => ({
          name: item.category,
          value: item.amount,
          percentage: item.percentage,
          color: COLORS[index],
        }));

        // その他がある場合のみ追加
        if (others.length > 0) {
          chartDataItems.push({
            name: "その他",
            value: othersTotal,
            percentage: othersPercentage,
            color: COLORS[4],
          });
        }

        setChartData(chartDataItems);
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
  }, [selectedYear, selectedMonth]);

  // カスタムツールチップ
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-md shadow-md">
          <p className="font-semibold">{data.name}</p>
          <p className="text-sm text-gray-600">
            {formatCurrency(data.value)} ({data.payload.percentage.toFixed(1)}%)
          </p>
        </div>
      );
    }
    return null;
  };

  // カスタム凡例
  const renderLegend = (props: any) => {
    const { payload } = props;
    return (
      <div className="flex flex-wrap justify-center gap-4 mt-4">
        {payload.map((entry: any, index: number) => (
          <div key={`legend-${index}`} className="flex items-center gap-2">
            <div
              className="w-4 h-4 rounded"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-sm text-gray-700">
              {entry.value} ({entry.payload.percentage.toFixed(1)}%)
            </span>
          </div>
        ))}
      </div>
    );
  };

  // 年月選択UI
  const YearMonthSelector = () => (
    <div className="flex items-center gap-2">
      <Label htmlFor="expense-month" className="text-sm font-medium text-gray-700 whitespace-nowrap">
        対象月:
      </Label>
      <select
        id="expense-month"
        value={`${selectedYear}-${String(selectedMonth).padStart(2, "0")}`}
        onChange={(e) => {
          const { year, month } = parseYearMonth(e.target.value);
          setSelectedYear(year);
          setSelectedMonth(month);
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
  );

  // タイトルテキスト
  const titleText = `${selectedYear}年${selectedMonth}月の経費内訳`;

  if (loading) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <div className="h-6 bg-gray-200 rounded w-48"></div>
        </CardHeader>
        <CardContent>
          <div className="h-64 bg-gray-200 rounded"></div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-red-600">
            <strong>エラー:</strong> {error}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="text-2xl font-bold text-gray-900">
              {titleText}
            </CardTitle>
            <YearMonthSelector />
          </div>
        </CardHeader>
        <CardContent className="p-6 text-center text-gray-500">
          {selectedYear}年{selectedMonth}月の経費データがありません
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="text-2xl font-bold text-gray-900">
              {titleText}
            </CardTitle>
            <div className="flex items-center gap-4">
              <YearMonthSelector />
              <Button
                onClick={() => setIsModalOpen(true)}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                🔍 詳細内訳
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="w-full">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={100}
                  innerRadius={50}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend content={renderLegend} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* 詳細内訳モーダル */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">
                {titleText} - 詳細内訳
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-500 hover:text-gray-700 transition-colors"
                aria-label="閉じる"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6">
              <div className="mb-4 text-sm text-gray-600">
                合計: {formatCurrency(totalAmount)}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        カテゴリー
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        金額
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        割合（%）
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {detailData.map((item, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {item.category}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-right text-gray-900">
                          {formatCurrency(item.amount)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-600">
                          {item.percentage.toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

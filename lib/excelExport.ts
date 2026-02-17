/**
 * Excel出力ユーティリティ
 *
 * ビジネス上の役割:
 * - 指定期間の売上・経費データをExcelファイルとしてダウンロード
 * - 確定申告や経営分析のための帳票出力に使用
 * - 税理士への提出資料としても活用可能
 *
 * 出力されるシート:
 * 1. サマリー: 期間・売上合計・経費合計・利益
 * 2. 売上一覧: 全売上データの詳細
 * 3. 経費一覧: 全経費データの詳細
 * 4. 月次集計: 月ごとの売上・経費・利益の推移
 */

import * as XLSX from "xlsx";

// =============================================================================
// 型定義
// =============================================================================

/** 売上データ（Supabaseから取得した形式） */
export interface SaleRecord {
  id?: string;
  date: string;
  crop_name: string;
  customer: string;
  unit_price?: number;
  quantity?: number;
  amount: number;
  description?: string;
}

/** 経費データ（Supabaseから取得した形式） */
export interface ExpenseRecord {
  id?: string;
  date: string;
  category: string;
  amount: number;
  description?: string;
}

/** 月次集計データ */
interface MonthlySummaryRow {
  月: string;
  売上合計: number;
  経費合計: number;
  利益: number;
}

// =============================================================================
// メイン関数
// =============================================================================

/**
 * 売上・経費データをExcelファイルとしてダウンロードする
 *
 * ビジネス上の流れ:
 * 1. 売上・経費データを受け取る
 * 2. 4つのシート（サマリー、売上、経費、月次集計）を作成
 * 3. Excelファイルを生成してブラウザでダウンロード
 *
 * @param salesData - 売上データの配列
 * @param expensesData - 経費データの配列
 * @param startYearMonth - 開始年月（例: "2024年1月"）
 * @param endYearMonth - 終了年月（例: "2024年6月"）
 */
export function downloadExcelReport(
  salesData: SaleRecord[],
  expensesData: ExpenseRecord[],
  startYearMonth: string,
  endYearMonth: string
): void {
  // Excelワークブック（ファイル全体）を作成
  const workbook = XLSX.utils.book_new();

  // 各シートを作成してワークブックに追加
  const summarySheet = createSummarySheet(salesData, expensesData, startYearMonth, endYearMonth);
  XLSX.utils.book_append_sheet(workbook, summarySheet, "サマリー");

  const salesSheet = createSalesSheet(salesData);
  XLSX.utils.book_append_sheet(workbook, salesSheet, "売上一覧");

  const expensesSheet = createExpensesSheet(expensesData);
  XLSX.utils.book_append_sheet(workbook, expensesSheet, "経費一覧");

  const monthlySheet = createMonthlySummarySheet(salesData, expensesData);
  XLSX.utils.book_append_sheet(workbook, monthlySheet, "月次集計");

  // ファイル名を生成（例: 農業経営レポート_2024年1月_2024年6月.xlsx）
  const fileName = `農業経営レポート_${startYearMonth}_${endYearMonth}.xlsx`;

  // ブラウザでダウンロード
  XLSX.writeFile(workbook, fileName);
}

// =============================================================================
// シート作成関数
// =============================================================================

/**
 * サマリーシートを作成
 * 期間全体の概要を1枚にまとめる
 */
function createSummarySheet(
  salesData: SaleRecord[],
  expensesData: ExpenseRecord[],
  startYearMonth: string,
  endYearMonth: string
): XLSX.WorkSheet {
  // 合計値を計算
  const totalSales = salesData.reduce((sum, sale) => sum + (sale.amount || 0), 0);
  const totalExpenses = expensesData.reduce((sum, expense) => sum + (expense.amount || 0), 0);
  const totalProfit = totalSales - totalExpenses;

  // サマリーデータを配列形式で作成
  const summaryRows = [
    ["農業経営レポート"],
    [],
    ["対象期間", `${startYearMonth} 〜 ${endYearMonth}`],
    ["出力日", new Date().toLocaleDateString("ja-JP")],
    [],
    ["項目", "金額（円）"],
    ["売上合計", totalSales],
    ["経費合計", totalExpenses],
    ["利益（売上 - 経費）", totalProfit],
    [],
    ["売上件数", `${salesData.length}件`],
    ["経費件数", `${expensesData.length}件`],
  ];

  // 配列からワークシートを作成
  const worksheet = XLSX.utils.aoa_to_sheet(summaryRows);

  // 列幅を設定（見やすくするため）
  worksheet["!cols"] = [
    { wch: 25 }, // A列: 項目名
    { wch: 20 }, // B列: 値
  ];

  return worksheet;
}

/**
 * 売上一覧シートを作成
 * 全売上データを日付順に一覧表示
 */
function createSalesSheet(salesData: SaleRecord[]): XLSX.WorkSheet {
  // 日付順にソート（古い順）
  const sortedSales = [...salesData].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  // ヘッダー行 + データ行を作成
  const rows = [
    ["日付", "作物名", "出荷先", "単価", "数量", "金額", "備考"],
    ...sortedSales.map((sale) => [
      sale.date,
      sale.crop_name || "",
      sale.customer || "",
      sale.unit_price || "",
      sale.quantity || "",
      sale.amount || 0,
      sale.description || "",
    ]),
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(rows);

  // 列幅を設定
  worksheet["!cols"] = [
    { wch: 12 }, // 日付
    { wch: 15 }, // 作物名
    { wch: 20 }, // 出荷先
    { wch: 10 }, // 単価
    { wch: 8 },  // 数量
    { wch: 12 }, // 金額
    { wch: 30 }, // 備考
  ];

  return worksheet;
}

/**
 * 経費一覧シートを作成
 * 全経費データを日付順に一覧表示
 */
function createExpensesSheet(expensesData: ExpenseRecord[]): XLSX.WorkSheet {
  // 日付順にソート（古い順）
  const sortedExpenses = [...expensesData].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  // ヘッダー行 + データ行を作成
  const rows = [
    ["日付", "勘定科目", "金額", "摘要"],
    ...sortedExpenses.map((expense) => [
      expense.date,
      expense.category || "",
      expense.amount || 0,
      expense.description || "",
    ]),
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(rows);

  // 列幅を設定
  worksheet["!cols"] = [
    { wch: 12 }, // 日付
    { wch: 18 }, // 勘定科目
    { wch: 12 }, // 金額
    { wch: 40 }, // 摘要
  ];

  return worksheet;
}

/**
 * 月次集計シートを作成
 * 月ごとの売上・経費・利益を集計して一覧表示
 */
function createMonthlySummarySheet(
  salesData: SaleRecord[],
  expensesData: ExpenseRecord[]
): XLSX.WorkSheet {
  // 月ごとに売上・経費を集計するためのMap
  const monthlyMap = new Map<string, { sales: number; expenses: number }>();

  // 売上データを月ごとに集計
  salesData.forEach((sale) => {
    const monthKey = sale.date.substring(0, 7); // "YYYY-MM" 形式
    const current = monthlyMap.get(monthKey) || { sales: 0, expenses: 0 };
    current.sales += sale.amount || 0;
    monthlyMap.set(monthKey, current);
  });

  // 経費データを月ごとに集計
  expensesData.forEach((expense) => {
    const monthKey = expense.date.substring(0, 7); // "YYYY-MM" 形式
    const current = monthlyMap.get(monthKey) || { sales: 0, expenses: 0 };
    current.expenses += expense.amount || 0;
    monthlyMap.set(monthKey, current);
  });

  // 月順にソートして配列に変換
  const monthlySummary: MonthlySummaryRow[] = Array.from(monthlyMap.entries())
    .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
    .map(([monthKey, data]) => {
      const [year, month] = monthKey.split("-");
      return {
        月: `${year}年${parseInt(month)}月`,
        売上合計: data.sales,
        経費合計: data.expenses,
        利益: data.sales - data.expenses,
      };
    });

  // ヘッダー行 + データ行を作成
  const rows = [
    ["月", "売上合計", "経費合計", "利益"],
    ...monthlySummary.map((row) => [
      row.月,
      row.売上合計,
      row.経費合計,
      row.利益,
    ]),
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(rows);

  // 列幅を設定
  worksheet["!cols"] = [
    { wch: 15 }, // 月
    { wch: 15 }, // 売上合計
    { wch: 15 }, // 経費合計
    { wch: 15 }, // 利益
  ];

  return worksheet;
}

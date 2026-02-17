"use client";

/**
 * Excel出力ボタンコンポーネント
 *
 * ビジネス上の役割:
 * - 分析画面から指定期間のデータをExcelファイルでダウンロード
 * - 確定申告資料や税理士への提出資料として活用
 * - プランの「データエクスポート回数」と連動（無料プラン: 月3回まで）
 *
 * スマホ対応:
 * - タップしやすい大きさのボタン
 * - ダウンロード中はローディング表示
 * - iOS/Androidの両方でファイルダウンロードが動作
 */

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createSupabaseClient } from "@/lib/supabase/client";
import { checkUsageLimit, incrementUsage } from "@/lib/subscription";
import {
  downloadExcelReport,
  type SaleRecord,
  type ExpenseRecord,
} from "@/lib/excelExport";

/**
 * コンポーネントのプロパティ
 */
interface ExportButtonProps {
  /** 開始年（例: 2024） */
  startYear: number;
  /** 開始月（1-12） */
  startMonth: number;
  /** 終了年（例: 2024） */
  endYear: number;
  /** 終了月（1-12） */
  endMonth: number;
}

export default function ExportButton({
  startYear,
  startMonth,
  endYear,
  endMonth,
}: ExportButtonProps) {
  // ダウンロード中の状態管理
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  /**
   * Excel出力処理
   *
   * ビジネス上の流れ:
   * 1. ログインユーザーを確認
   * 2. エクスポート使用制限をチェック（無料プラン: 月3回まで）
   * 3. 指定期間の売上・経費データをSupabaseから取得
   * 4. Excelファイルを生成してダウンロード
   * 5. 使用回数をカウントアップ
   */
  const handleExport = async () => {
    try {
      setIsExporting(true);
      setExportError(null);

      const supabase = createSupabaseClient();

      // ========================================
      // Step 1: ログインユーザーの確認
      // ========================================
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        setExportError("ログインが必要です");
        return;
      }

      // ========================================
      // Step 2: エクスポート使用制限のチェック
      // ========================================
      // プランの「データエクスポート回数」と紐付け
      const usageCheck = await checkUsageLimit(supabase, user.id, "export");

      if (!usageCheck.allowed) {
        setExportError(
          `今月のエクスポート回数（${usageCheck.limit}回）に達しました。プランをアップグレードすると無制限で使用できます。`
        );
        return;
      }

      // ========================================
      // Step 3: データ取得
      // ========================================
      // 指定期間の開始日・終了日を計算
      const periodStartDate = new Date(startYear, startMonth - 1, 1)
        .toISOString()
        .split("T")[0];
      const periodEndDate = new Date(endYear, endMonth, 0)
        .toISOString()
        .split("T")[0];

      // 売上データと経費データを並行取得（RLSで自分のデータのみ）
      const [salesResult, expensesResult] = await Promise.all([
        supabase
          .from("sales")
          .select("id, date, crop_name, customer, unit_price, quantity, amount, description")
          .gte("date", periodStartDate)
          .lte("date", periodEndDate)
          .order("date", { ascending: true }),
        supabase
          .from("expenses")
          .select("id, date, category, amount, description")
          .gte("date", periodStartDate)
          .lte("date", periodEndDate)
          .order("date", { ascending: true }),
      ]);

      // エラーチェック
      if (salesResult.error) {
        throw new Error(`売上データの取得に失敗: ${salesResult.error.message}`);
      }
      if (expensesResult.error) {
        throw new Error(`経費データの取得に失敗: ${expensesResult.error.message}`);
      }

      // データを型変換
      const salesData: SaleRecord[] = salesResult.data || [];
      const expensesData: ExpenseRecord[] = expensesResult.data || [];

      // データが0件の場合は警告
      if (salesData.length === 0 && expensesData.length === 0) {
        setExportError("指定期間にデータがありません");
        return;
      }

      // ========================================
      // Step 4: Excelファイル生成・ダウンロード
      // ========================================
      const startYearMonth = `${startYear}年${startMonth}月`;
      const endYearMonth = `${endYear}年${endMonth}月`;

      downloadExcelReport(salesData, expensesData, startYearMonth, endYearMonth);

      // ========================================
      // Step 5: 使用回数をカウントアップ
      // ========================================
      // ダウンロード成功後に使用回数を1増やす
      try {
        await incrementUsage(supabase, user.id, "export");
      } catch (usageError) {
        // カウントアップ失敗してもダウンロード自体は成功しているので、エラーはログのみ
        console.error("エクスポート使用回数の更新に失敗:", usageError);
      }
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Excel出力に失敗しました";
      setExportError(message);
      console.error("Excel出力エラー:", error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        onClick={handleExport}
        disabled={isExporting}
        variant="outline"
        size="sm"
        className="flex items-center gap-2 min-h-[44px] px-4 bg-white/20 border-white/40 text-white hover:bg-white/30 hover:text-white"
      >
        {isExporting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">出力中...</span>
          </>
        ) : (
          <>
            <Download className="h-4 w-4" />
            <span className="text-sm">Excel出力</span>
          </>
        )}
      </Button>

      {/* エラーメッセージ */}
      {exportError && (
        <p className="text-xs text-yellow-200 max-w-[200px] text-right">
          {exportError}
        </p>
      )}
    </div>
  );
}

"use client";

/**
 * 成功状態のビューコンポーネント
 *
 * ビジネス上の役割:
 * - OCR解析が成功した時に表示される結果画面
 * - 読み取った内容（日付、金額、店舗名など）を確認できる
 * - 「経費登録へ」ボタンで、読み取った内容を自動入力した経費フォームに遷移
 */

import { CheckCircle, PencilLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { OcrResult } from "../hooks/useReceiptScanner";

/**
 * コンポーネントのプロパティ
 */
interface SuccessStateViewProps {
  imagePreview: string | null;           // 撮影した画像のプレビュー
  ocrResult: OcrResult;                  // OCR解析結果
  onNavigateToExpenseForm: () => void;   // 経費登録画面へ遷移
  onRetry: () => void;                   // 再撮影
}

export function SuccessStateView({
  imagePreview,
  ocrResult,
  onNavigateToExpenseForm,
  onRetry,
}: SuccessStateViewProps) {
  return (
    <div className="flex flex-col gap-4 items-center flex-1">
      {/* 画像サムネイル（小さく表示） */}
      {imagePreview && <ImageThumbnail imageSource={imagePreview} />}

      {/* 成功メッセージ */}
      <SuccessMessage />

      {/* 解析結果カード */}
      <OcrResultCard result={ocrResult} />

      {/* アクションボタン */}
      <ActionButtons
        onNavigate={onNavigateToExpenseForm}
        onRetry={onRetry}
      />
    </div>
  );
}

// ===== サブコンポーネント =====

/**
 * 画像サムネイル
 * 解析した画像を小さく表示
 */
interface ImageThumbnailProps {
  imageSource: string;
}

function ImageThumbnail({ imageSource }: ImageThumbnailProps) {
  return (
    <div className="w-24 h-32 rounded-lg overflow-hidden border border-gray-200">
      <img
        src={imageSource}
        alt="レシート"
        className="w-full h-full object-cover"
      />
    </div>
  );
}

/**
 * 成功メッセージ
 * チェックアイコンと「読み取り完了」テキスト
 */
function SuccessMessage() {
  return (
    <div className="flex items-center gap-2 text-green-600">
      <CheckCircle className="w-5 h-5" />
      <span className="font-medium">読み取り完了</span>
    </div>
  );
}

/**
 * OCR結果表示カード
 * 読み取った情報を一覧表示
 */
interface OcrResultCardProps {
  result: OcrResult;
}

function OcrResultCard({ result }: OcrResultCardProps) {
  return (
    <div className="w-full max-w-sm bg-white rounded-xl border border-gray-200 p-4 space-y-3">
      <h3 className="font-semibold text-gray-800 border-b pb-2">読み取り結果</h3>

      <div className="space-y-2 text-sm">
        {/* 日付 */}
        <ResultRow
          label="日付"
          value={result.date}
          fallback="読み取れませんでした"
        />

        {/* 金額 */}
        <ResultRow
          label="金額"
          value={result.amount ? `¥${result.amount.toLocaleString()}` : null}
          fallback="読み取れませんでした"
          valueClassName="text-green-600"
        />

        {/* 店舗名 */}
        <ResultRow
          label="店舗名"
          value={result.storeName}
          fallback="読み取れませんでした"
        />

        {/* 勘定科目 */}
        <ResultRow
          label="勘定科目"
          value={result.category}
          fallback="その他"
        />

        {/* 品目（ある場合のみ表示） */}
        {result.items && (
          <div className="flex justify-between">
            <span className="text-gray-500">品目</span>
            <span className="font-medium text-right max-w-[200px]">
              {result.items}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * 結果の1行を表示するコンポーネント
 * nullの場合はfallbackを表示
 */
interface ResultRowProps {
  label: string;
  value: string | null;
  fallback: string;
  valueClassName?: string;
}

function ResultRow({ label, value, fallback, valueClassName = "" }: ResultRowProps) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-500">{label}</span>
      <span className={`font-medium ${valueClassName}`}>
        {value || fallback}
      </span>
    </div>
  );
}

/**
 * アクションボタン
 * 経費登録へ進む・再撮影の2つのボタン
 */
interface ActionButtonsProps {
  onNavigate: () => void;
  onRetry: () => void;
}

function ActionButtons({ onNavigate, onRetry }: ActionButtonsProps) {
  return (
    <div className="flex flex-col gap-2 w-full max-w-sm mt-4">
      <Button
        onClick={onNavigate}
        className="w-full h-12 bg-green-600 hover:bg-green-700"
      >
        <PencilLine className="w-4 h-4 mr-2" />
        この内容で経費登録へ
      </Button>
      <Button
        onClick={onRetry}
        variant="outline"
        className="w-full"
      >
        再撮影する
      </Button>
    </div>
  );
}

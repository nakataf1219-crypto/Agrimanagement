"use client";

/**
 * 経費登録ページ
 * 
 * ビジネス上の流れ:
 * 1. 手動入力 または レシートOCR結果から経費データを入力
 * 2. 日付、勘定科目（ドロップダウン選択）、金額、摘要を入力
 * 3. 「登録する」ボタンで経費をデータベースに保存
 * 
 * 勘定科目連携:
 * - 設定画面で登録した勘定科目マスタから選択
 * - category_id（科目ID）と category（科目名）の両方を保存
 * - 科目名変更時は自動でデータベースが同期される（DBトリガー）
 * 
 * OCR連携:
 * - レシートスキャナーからURLパラメータでデータを受け取り
 * - OCRで推測された科目名と一致する科目を自動選択
 * - フォームに自動でセット（ユーザーが修正可能）
 * 
 * コンポーネント構成:
 * - useExpenseForm: フォームのロジック（状態管理・送信処理）
 * - CategorySelector: 勘定科目選択ドロップダウン
 * - FormMessages: エラー・成功メッセージ表示
 */

import { Suspense } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Camera } from "lucide-react";

// 分割したコンポーネントとフック
import { 
  useExpenseForm, 
  CategorySelector, 
  FormMessages 
} from "@/components/expenses";

// ============================================================
// メインコンポーネント
// ============================================================

/**
 * 経費登録ページのエントリーポイント
 * 
 * useSearchParamsを使用するコンポーネントは
 * Suspenseでラップする必要がある（Next.js 13+の仕様）
 */
export default function NewExpensePage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <ExpenseFormContent />
    </Suspense>
  );
}

/**
 * ページ読み込み中のフォールバック表示
 */
function LoadingFallback() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-gray-500">読み込み中...</div>
    </div>
  );
}

// ============================================================
// フォームコンテンツ
// ============================================================

/**
 * フォームの内容を表示するコンポーネント
 * 
 * ロジックは useExpenseForm フックに分離されており、
 * このコンポーネントは表示のみを担当
 */
function ExpenseFormContent() {
  // フォームのロジックをカスタムフックから取得
  const {
    formData,
    loading,
    error,
    success,
    isOcrFilled,
    expenseCategories,
    categoriesLoading,
    ocrSuggestedCategory,
    handleChange,
    handleCategorySelect,
    handleSubmit,
  } = useExpenseForm();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ページヘッダー */}
      <ExpensePageHeader />

      {/* メインコンテンツ */}
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-2xl mx-auto">
          <Card>
            {/* カードヘッダー */}
            <CardHeader>
              <CardTitle className="text-2xl flex items-center gap-2">
                経費を登録する
                {isOcrFilled && <OcrBadge />}
              </CardTitle>
              {isOcrFilled && (
                <p className="text-sm text-gray-500 mt-1">
                  レシートから読み取った内容です。必要に応じて修正してください。
                </p>
              )}
            </CardHeader>
            
            {/* フォーム本体 */}
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* 日付入力 */}
                <DateField 
                  value={formData.date} 
                  onChange={handleChange} 
                />

                {/* 勘定科目選択（分割したコンポーネント） */}
                <CategorySelector
                  categories={expenseCategories}
                  isLoading={categoriesLoading}
                  selectedCategoryId={formData.categoryId}
                  selectedCategoryName={formData.categoryName}
                  onSelect={handleCategorySelect}
                  isOcrFilled={isOcrFilled}
                  ocrSuggestedCategory={ocrSuggestedCategory}
                />

                {/* 金額入力 */}
                <AmountField 
                  value={formData.amount} 
                  onChange={handleChange} 
                />

                {/* 摘要/メモ入力 */}
                <DescriptionField 
                  value={formData.description} 
                  onChange={handleChange} 
                />

                {/* メッセージ表示（エラー・成功） */}
                <FormMessages error={error} success={success} />

                {/* 送信・キャンセルボタン */}
                <FormActions loading={loading} />
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

// ============================================================
// ページ内で使用するサブコンポーネント
// ============================================================

/**
 * ページヘッダー
 * 戻るボタンとアプリ名を表示
 */
function ExpensePageHeader() {
  return (
    <header className="border-b bg-white shadow-sm">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                戻る
              </Button>
            </Link>
            <h1 className="text-2xl font-bold text-green-600">AgriManagement</h1>
          </div>
        </div>
      </div>
    </header>
  );
}

/**
 * OCR読み取り済みバッジ
 * レシートスキャンから自動入力された場合に表示
 */
function OcrBadge() {
  return (
    <span className="inline-flex items-center gap-1 text-sm font-normal text-green-600 bg-green-50 px-2 py-1 rounded-full">
      <Camera className="w-4 h-4" />
      レシート読み取り済み
    </span>
  );
}

// ============================================================
// フォームフィールドコンポーネント
// ============================================================

/**
 * 日付入力フィールドのプロパティ
 */
interface DateFieldProps {
  value: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

/**
 * 日付入力フィールド
 */
function DateField({ value, onChange }: DateFieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="date">日付 *</Label>
      <Input
        id="date"
        name="date"
        type="date"
        value={value}
        onChange={onChange}
        required
      />
    </div>
  );
}

/**
 * 金額入力フィールドのプロパティ
 */
interface AmountFieldProps {
  value: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

/**
 * 金額入力フィールド
 */
function AmountField({ value, onChange }: AmountFieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="amount">金額 *</Label>
      <Input
        id="amount"
        name="amount"
        type="number"
        value={value}
        onChange={onChange}
        placeholder="例: 50000"
        required
        min="0"
      />
    </div>
  );
}

/**
 * 摘要/メモ入力フィールドのプロパティ
 */
interface DescriptionFieldProps {
  value: string;
  onChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
}

/**
 * 摘要/メモ入力フィールド
 */
function DescriptionField({ value, onChange }: DescriptionFieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="description">摘要/メモ</Label>
      <textarea
        id="description"
        name="description"
        value={value}
        onChange={onChange}
        placeholder="メモがあれば入力してください"
        rows={4}
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      />
    </div>
  );
}

/**
 * フォームアクションボタンのプロパティ
 */
interface FormActionsProps {
  loading: boolean;
}

/**
 * 送信・キャンセルボタン
 */
function FormActions({ loading }: FormActionsProps) {
  return (
    <div className="flex gap-4">
      <Button
        type="submit"
        disabled={loading}
        className="flex-1 bg-green-600 hover:bg-green-700"
      >
        {loading ? "登録中..." : "登録する"}
      </Button>
      <Link href="/dashboard" className="flex-1">
        <Button type="button" variant="outline" className="w-full">
          キャンセル
        </Button>
      </Link>
    </div>
  );
}

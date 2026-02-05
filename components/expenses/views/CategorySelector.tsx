"use client";

/**
 * 勘定科目セレクター
 * 
 * このコンポーネントは経費登録フォームの「勘定科目」選択部分を担当します。
 * 
 * 3つの状態を管理:
 * - 読み込み中: 勘定科目マスタをDBから取得中
 * - 勘定科目未登録: ユーザーがまだ勘定科目を登録していない
 * - 通常表示: ドロップダウンで科目を選択
 * 
 * OCR連携:
 * - レシートスキャンで推測された科目名を表示
 * - マッチング結果（成功/一部一致/未マッチ）を表示
 */

import Link from "next/link";
import { Label } from "@/components/ui/label";
import { ChevronDown, AlertCircle, Camera } from "lucide-react";
import type { ExpenseCategory } from "../types";

/**
 * CategorySelectorコンポーネントのプロパティ
 */
interface CategorySelectorProps {
  /** 勘定科目マスタの配列 */
  categories: ExpenseCategory[];
  /** 読み込み中フラグ */
  isLoading: boolean;
  /** 現在選択されている科目のID */
  selectedCategoryId: string;
  /** 現在選択されている科目名 */
  selectedCategoryName: string;
  /** 科目選択時のハンドラー */
  onSelect: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  /** OCRから自動入力されたかどうか（オプション） */
  isOcrFilled?: boolean;
  /** OCRで推測された科目名（オプション） */
  ocrSuggestedCategory?: string | null;
}

/**
 * 勘定科目セレクターのメインコンポーネント
 */
export function CategorySelector({
  categories,
  isLoading,
  selectedCategoryId,
  selectedCategoryName,
  onSelect,
  isOcrFilled = false,
  ocrSuggestedCategory = null,
}: CategorySelectorProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="category">勘定科目 *</Label>
      
      {/* 状態に応じた表示の切り替え */}
      <CategoryContent
        categories={categories}
        isLoading={isLoading}
        selectedCategoryId={selectedCategoryId}
        onSelect={onSelect}
      />
      
      {/* OCR推測表示（OCRから入力された場合のみ） */}
      {isOcrFilled && ocrSuggestedCategory && (
        <OcrSuggestionHint
          ocrSuggestedCategory={ocrSuggestedCategory}
          selectedCategoryName={selectedCategoryName}
        />
      )}
    </div>
  );
}

// ============================================================
// 以下、内部で使用するサブコンポーネント
// ============================================================

/**
 * CategoryContentコンポーネントのプロパティ
 */
interface CategoryContentProps {
  categories: ExpenseCategory[];
  isLoading: boolean;
  selectedCategoryId: string;
  onSelect: (event: React.ChangeEvent<HTMLSelectElement>) => void;
}

/**
 * 状態に応じてコンテンツを切り替えるコンポーネント
 * 
 * 早期リターンパターンでネストを浅くしている
 */
function CategoryContent({
  categories,
  isLoading,
  selectedCategoryId,
  onSelect,
}: CategoryContentProps) {
  // 状態1: 読み込み中
  if (isLoading) {
    return <LoadingState />;
  }

  // 状態2: 勘定科目未登録
  if (categories.length === 0) {
    return <EmptyState />;
  }

  // 状態3: 通常表示（ドロップダウン）
  return (
    <CategoryDropdown
      categories={categories}
      selectedCategoryId={selectedCategoryId}
      onSelect={onSelect}
    />
  );
}

/**
 * 読み込み中の表示
 * 勘定科目マスタをDBから取得している間に表示
 */
function LoadingState() {
  return (
    <div className="w-full h-10 bg-gray-100 rounded-md animate-pulse flex items-center px-3">
      <span className="text-gray-400 text-sm">読み込み中...</span>
    </div>
  );
}

/**
 * 勘定科目未登録時の表示
 * ユーザーに設定画面で科目登録を促す
 */
function EmptyState() {
  return (
    <div className="p-3 bg-amber-50 border border-amber-200 rounded-md text-amber-700 text-sm flex items-start gap-2">
      <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
      <div>
        <p className="font-medium">勘定科目が登録されていません</p>
        <p className="mt-1">
          先に
          <Link href="/settings" className="underline hover:text-amber-800">
            設定画面
          </Link>
          で勘定科目を登録してください。
        </p>
      </div>
    </div>
  );
}

/**
 * CategoryDropdownコンポーネントのプロパティ
 */
interface CategoryDropdownProps {
  categories: ExpenseCategory[];
  selectedCategoryId: string;
  onSelect: (event: React.ChangeEvent<HTMLSelectElement>) => void;
}

/**
 * 勘定科目ドロップダウン本体
 * 
 * 固定費と変動費でグループ分けして表示
 */
function CategoryDropdown({
  categories,
  selectedCategoryId,
  onSelect,
}: CategoryDropdownProps) {
  // 固定費と変動費に分類
  const fixedCategories = categories.filter(
    category => category.category_type === "fixed"
  );
  const variableCategories = categories.filter(
    category => category.category_type === "variable"
  );

  return (
    <div className="relative">
      <select
        id="category"
        name="category"
        value={selectedCategoryId}
        onChange={onSelect}
        required
        className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 appearance-none cursor-pointer"
      >
        <option value="">選択してください</option>
        
        {/* 固定費グループ */}
        {fixedCategories.length > 0 && (
          <optgroup label="固定費">
            {fixedCategories.map(category => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </optgroup>
        )}
        
        {/* 変動費グループ */}
        {variableCategories.length > 0 && (
          <optgroup label="変動費">
            {variableCategories.map(category => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </optgroup>
        )}
      </select>
      
      {/* ドロップダウン矢印アイコン（カスタムスタイル用） */}
      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
    </div>
  );
}

/**
 * OcrSuggestionHintコンポーネントのプロパティ
 */
interface OcrSuggestionHintProps {
  /** OCRで推測された科目名 */
  ocrSuggestedCategory: string;
  /** 現在選択されている科目名 */
  selectedCategoryName: string;
}

/**
 * OCR推測結果のヒント表示
 * 
 * AIが推測した科目名と、マッチング結果を表示
 * - マッチした場合: 「マッチしました ✓」
 * - 別の科目を選択中: 「「〇〇」を選択中」
 * - 未選択: 「該当する科目を選択してください」
 */
function OcrSuggestionHint({
  ocrSuggestedCategory,
  selectedCategoryName,
}: OcrSuggestionHintProps) {
  /**
   * マッチ状態に応じたメッセージを生成
   */
  const getMatchStatusMessage = (): string => {
    // 未選択の場合
    if (!selectedCategoryName) {
      return " → 該当する科目を選択してください";
    }
    
    // 完全マッチの場合
    if (selectedCategoryName === ocrSuggestedCategory) {
      return " → マッチしました ✓";
    }
    
    // 別の科目を選択中の場合
    return ` → 「${selectedCategoryName}」を選択中`;
  };

  return (
    <div className="text-xs text-gray-500 flex items-center gap-1">
      <Camera className="w-3 h-3" />
      <span>
        AIが推測した科目: 「{ocrSuggestedCategory}」
        {getMatchStatusMessage()}
      </span>
    </div>
  );
}

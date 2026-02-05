"use client";

/**
 * レシートスキャナーコンポーネント
 *
 * ビジネス上の流れ:
 * 1. ユーザーがカメラで撮影 または 画像を選択
 * 2. 画像をBase64に変換してOCR APIに送信
 * 3. 解析結果をプレビュー表示
 * 4. 「経費登録へ」ボタンで経費フォームに遷移（データ自動入力）
 *
 * これにより、レシートを撮影するだけで経費登録が簡単にできます
 *
 * 設計:
 * - 状態管理は useReceiptScanner フックに分離
 * - 各状態のUIは views/ 配下のコンポーネントに分離
 * - このファイルは「状態に応じたビューの切り替え」のみを担当
 */

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { useReceiptScanner } from "./hooks/useReceiptScanner";
import {
  IdleStateView,
  LoadingStateView,
  SuccessStateView,
  ErrorStateView,
} from "./views";

/**
 * コンポーネントのプロパティ
 */
interface ReceiptScannerProps {
  isOpen: boolean;      // モーダルの開閉状態
  onClose: () => void;  // モーダルを閉じる時のコールバック
}

export default function ReceiptScanner({ isOpen, onClose }: ReceiptScannerProps) {
  // カスタムフックで状態管理を行う
  const scanner = useReceiptScanner(onClose);

  /**
   * 現在の状態に応じたビューを返す
   * switch文でシンプルに分岐
   */
  const renderContent = () => {
    switch (scanner.processingState) {
      case "idle":
        // 初期状態: 撮影/選択ボタンを表示
        return (
          <IdleStateView
            onCameraClick={scanner.handleCameraClick}
            onFileClick={scanner.handleFileClick}
            onManualEntry={scanner.handleManualEntry}
          />
        );

      case "loading":
        // ローディング状態: 解析中
        return (
          <LoadingStateView imagePreview={scanner.imagePreview} />
        );

      case "success":
        // 成功状態: 解析結果を表示
        // ocrResult は success 状態では必ず存在する
        return (
          <SuccessStateView
            imagePreview={scanner.imagePreview}
            ocrResult={scanner.ocrResult!}
            onNavigateToExpenseForm={scanner.handleNavigateToExpenseForm}
            onRetry={scanner.handleRetry}
          />
        );

      case "error":
        // エラー状態
        return (
          <ErrorStateView
            errorMessage={scanner.errorMessage}
            onRetry={scanner.handleRetry}
            onManualEntry={scanner.handleManualEntry}
          />
        );
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && scanner.handleClose()}>
      <SheetContent side="bottom" className="h-[90vh] rounded-t-3xl">
        {/* ヘッダー: タイトルと説明 */}
        <SheetHeader className="text-left">
          <SheetTitle className="text-xl">レシートを読み取る</SheetTitle>
          <SheetDescription>
            レシートを撮影または選択すると、自動で経費情報を入力します
          </SheetDescription>
        </SheetHeader>

        {/* メインコンテンツ: 状態に応じたビュー */}
        <div className="flex-1 flex flex-col gap-4 p-4 overflow-auto">
          {renderContent()}
        </div>

        {/* Hidden file inputs（画面には表示されない） */}
        {/* カメラ撮影用（capture属性でカメラを起動） */}
        <input
          ref={scanner.cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={scanner.handleImageSelect}
          className="hidden"
        />
        {/* ファイル選択用 */}
        <input
          ref={scanner.fileInputRef}
          type="file"
          accept="image/*"
          onChange={scanner.handleImageSelect}
          className="hidden"
        />
      </SheetContent>
    </Sheet>
  );
}

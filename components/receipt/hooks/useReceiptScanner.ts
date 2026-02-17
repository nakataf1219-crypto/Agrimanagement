"use client";

/**
 * レシートスキャナーの状態管理フック
 *
 * ビジネス上の役割:
 * - 画像の読み込み、OCR API呼び出し、結果の管理を一元化
 * - UIコンポーネントは「見た目」に集中できるようにする
 *
 * 使い方:
 * const scanner = useReceiptScanner(onClose);
 * scanner.handleCameraClick(); // カメラ起動
 */

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { compressImageFile } from "@/lib/imageCompression";

/**
 * 処理状態の型
 * - idle: 初期状態（撮影待ち）
 * - loading: OCR解析中
 * - success: 解析成功
 * - error: 解析失敗
 */
export type ProcessingState = "idle" | "loading" | "success" | "error";

/**
 * OCR解析結果の型
 * レシートから読み取った情報を格納
 */
export interface OcrResult {
  date: string | null;        // 購入日
  amount: number | null;      // 金額
  storeName: string | null;   // 店舗名
  items: string | null;       // 品目
  category: string | null;    // 勘定科目（自動推定）
}

/**
 * フックの戻り値の型
 * UIコンポーネントで使用する状態とアクションをまとめたもの
 */
export interface UseReceiptScannerReturn {
  // 状態
  processingState: ProcessingState;
  imagePreview: string | null;
  ocrResult: OcrResult | null;
  errorMessage: string | null;
  // 参照（hidden input用）
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  cameraInputRef: React.RefObject<HTMLInputElement | null>;
  // アクション
  handleImageSelect: (event: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  handleCameraClick: () => void;
  handleFileClick: () => void;
  handleNavigateToExpenseForm: () => void;
  handleManualEntry: () => void;
  handleClose: () => void;
  handleRetry: () => void;
}

/**
 * レシートスキャナーのカスタムフック
 *
 * @param onClose - モーダルを閉じる時のコールバック
 * @returns 状態とアクションをまとめたオブジェクト
 */
export function useReceiptScanner(onClose: () => void): UseReceiptScannerReturn {
  const router = useRouter();

  // ===== 状態管理 =====
  const [processingState, setProcessingState] = useState<ProcessingState>("idle");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [ocrResult, setOcrResult] = useState<OcrResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // ===== ファイル入力への参照 =====
  // hidden inputを操作するために必要
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // ===== ヘルパー関数 =====

  /**
   * 画像をBase64形式に変換する（非圧縮版、プレビュー用フォールバック）
   * OCR APIに送信するために必要な形式
   */
  const convertImageToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error("画像の読み込みに失敗しました"));
      reader.readAsDataURL(file);
    });
  };

  /**
   * 状態をリセットする
   * 再撮影やモーダルを閉じる時に使用
   */
  const resetState = () => {
    setProcessingState("idle");
    setImagePreview(null);
    setOcrResult(null);
    setErrorMessage(null);
  };

  // ===== イベントハンドラー =====

  /**
   * 画像が選択された時の処理
   * カメラ撮影・ファイル選択の両方で呼ばれる
   *
   * 改善ポイント:
   * - 画像を圧縮してからAPIに送信（通信時間短縮 + API処理速度向上）
   * - プレビュー用の画像も圧縮版を使用（メモリ節約）
   * - 圧縮に失敗した場合は非圧縮版にフォールバック
   */
  const handleImageSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      // 状態をローディングに変更
      setProcessingState("loading");
      setErrorMessage(null);
      setOcrResult(null);

      // 画像を圧縮してBase64に変換（速度向上のキモ）
      // 圧縮に失敗した場合は非圧縮版にフォールバック
      let base64Image: string;
      try {
        base64Image = await compressImageFile(file, {
          maxWidth: 1200,
          maxHeight: 1600,
          quality: 0.85,
        });
      } catch {
        // 圧縮失敗時は従来の方法でBase64変換
        console.warn("画像圧縮に失敗。非圧縮版を使用します。");
        base64Image = await convertImageToBase64(file);
      }

      // プレビュー表示
      setImagePreview(base64Image);

      // OCR APIを呼び出し
      const response = await fetch("/api/ocr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64Image }),
      });

      const data = await response.json();

      // エラーチェック
      if (!response.ok) {
        throw new Error(data.error || "OCR処理に失敗しました");
      }

      // 成功した場合、結果を保存
      setOcrResult(data.data);
      setProcessingState("success");
    } catch (error: unknown) {
      // エラーの場合
      const message = error instanceof Error ? error.message : "画像の処理中にエラーが発生しました";
      setErrorMessage(message);
      setProcessingState("error");
    }

    // input要素をリセット（同じファイルを再度選択できるように）
    event.target.value = "";
  };

  /**
   * カメラボタンクリック時
   * hidden inputのcaptureを使ってカメラを起動
   */
  const handleCameraClick = () => {
    cameraInputRef.current?.click();
  };

  /**
   * 画像選択ボタンクリック時
   * hidden inputを使ってファイル選択ダイアログを表示
   */
  const handleFileClick = () => {
    fileInputRef.current?.click();
  };

  /**
   * 経費登録画面に遷移
   * OCR結果をURLパラメータとして渡す
   */
  const handleNavigateToExpenseForm = () => {
    if (!ocrResult) return;

    // URLパラメータを構築（nullの値は除外）
    const params = new URLSearchParams();

    if (ocrResult.date) {
      params.set("date", ocrResult.date);
    }
    if (ocrResult.amount) {
      params.set("amount", ocrResult.amount.toString());
    }
    if (ocrResult.category) {
      params.set("category", ocrResult.category);
    }

    // 店舗名と品目を組み合わせて摘要（description）を作成
    const description = ocrResult.storeName
      ? ocrResult.items
        ? `${ocrResult.storeName}: ${ocrResult.items}`
        : ocrResult.storeName
      : ocrResult.items || "";

    if (description) {
      params.set("description", description);
    }

    // モーダルを閉じて経費フォームに遷移
    onClose();
    router.push(`/expenses/new?${params.toString()}`);
  };

  /**
   * 手動入力ボタン
   * OCR結果なしで経費フォームに遷移
   */
  const handleManualEntry = () => {
    onClose();
    router.push("/expenses/new");
  };

  /**
   * モーダルを閉じる時に状態をリセット
   */
  const handleClose = () => {
    resetState();
    onClose();
  };

  /**
   * 再撮影（状態をリセット）
   */
  const handleRetry = () => {
    resetState();
  };

  // ===== 戻り値 =====
  return {
    // 状態
    processingState,
    imagePreview,
    ocrResult,
    errorMessage,
    // 参照
    fileInputRef,
    cameraInputRef,
    // アクション
    handleImageSelect,
    handleCameraClick,
    handleFileClick,
    handleNavigateToExpenseForm,
    handleManualEntry,
    handleClose,
    handleRetry,
  };
}

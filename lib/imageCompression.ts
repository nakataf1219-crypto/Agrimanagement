/**
 * 画像圧縮・リサイズユーティリティ
 *
 * ビジネス上の役割:
 * - スマホで撮影した高解像度画像を適切なサイズに圧縮
 * - OCR APIへの送信時間を短縮し、ユーザーの待ち時間を減らす
 * - 画像品質を維持しつつファイルサイズを削減
 *
 * 技術的な仕組み:
 * 1. Canvas APIで画像をリサイズ（最大幅1200px）
 * 2. JPEG形式で圧縮（品質80%）
 * 3. Base64形式で返却（OCR APIに直接送信可能）
 */

/**
 * 圧縮オプションの型定義
 */
interface CompressionOptions {
  /** リサイズ後の最大幅（ピクセル）。デフォルト: 1200 */
  maxWidth?: number;
  /** リサイズ後の最大高さ（ピクセル）。デフォルト: 1600 */
  maxHeight?: number;
  /** JPEG圧縮品質（0.0〜1.0）。デフォルト: 0.8 */
  quality?: number;
}

/**
 * 画像ファイルを圧縮・リサイズしてBase64形式で返す
 *
 * ビジネス上の流れ:
 * 1. ユーザーが撮影/選択した画像ファイルを受け取る
 * 2. Canvas上でリサイズ（アスペクト比を維持）
 * 3. JPEG形式で圧縮
 * 4. Base64文字列として返す（OCR APIに送信可能な形式）
 *
 * @param file - 圧縮対象の画像ファイル
 * @param options - 圧縮オプション（省略可能）
 * @returns Base64形式の圧縮画像（data:image/jpeg;base64,... 形式）
 */
export function compressImageFile(
  file: File,
  options: CompressionOptions = {}
): Promise<string> {
  const {
    maxWidth = 1200,
    maxHeight = 1600,
    quality = 0.8,
  } = options;

  return new Promise((resolve, reject) => {
    // 画像をブラウザ上で読み込む
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);

    image.onload = () => {
      try {
        // 元の画像サイズを取得
        let { width, height } = image;

        // アスペクト比を維持しながらリサイズ
        // 幅・高さのどちらかが上限を超えている場合のみリサイズ
        if (width > maxWidth || height > maxHeight) {
          const widthRatio = maxWidth / width;
          const heightRatio = maxHeight / height;
          // 小さい方の比率を使うことで、両方の上限を超えないようにする
          const ratio = Math.min(widthRatio, heightRatio);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        // Canvas上で画像をリサイズ描画
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const context = canvas.getContext("2d");
        if (!context) {
          reject(new Error("Canvas 2Dコンテキストの取得に失敗しました"));
          return;
        }

        // 高品質なリサイズのための設定
        context.imageSmoothingEnabled = true;
        context.imageSmoothingQuality = "high";

        // リサイズした画像を描画
        context.drawImage(image, 0, 0, width, height);

        // JPEG形式で圧縮してBase64に変換
        const compressedBase64 = canvas.toDataURL("image/jpeg", quality);

        // メモリ解放
        URL.revokeObjectURL(objectUrl);

        resolve(compressedBase64);
      } catch (error) {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("画像の圧縮処理に失敗しました"));
      }
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("画像の読み込みに失敗しました。別の画像をお試しください。"));
    };

    // 画像の読み込みを開始
    image.src = objectUrl;
  });
}

/**
 * レシートOCR APIエンドポイント
 * 
 * ビジネス上の流れ:
 * 1. フロントエンドからレシート画像（Base64形式）を受け取る
 * 2. ログインユーザーの認証とプラン確認
 * 3. 無料プランの場合、月間使用回数をチェック（50回/月まで）
 * 4. OpenAI GPT-4o Visionを使って画像を解析
 * 5. レシートから「日付」「金額」「店舗名」「品目」を抽出
 * 6. 使用回数をカウントアップして保存
 * 7. 抽出したデータをJSON形式で返却
 * 
 * これにより、ユーザーは手入力の手間を省いて経費登録ができます
 */

import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { checkUsageLimit, incrementUsage } from "@/lib/subscription";

/**
 * OpenAIクライアントを取得する関数
 * ビルド時にエラーが発生しないよう、関数内で初期化
 */
function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY が設定されていません");
  }
  return new OpenAI({ apiKey });
}

/**
 * OCR解析結果の型定義
 * レシートから抽出したいデータの構造
 */
interface ReceiptOcrResult {
  date: string | null;        // 日付（YYYY-MM-DD形式）
  amount: number | null;      // 合計金額（数値）
  storeName: string | null;   // 店舗名
  items: string | null;       // 購入品目（カンマ区切り）
  category: string | null;    // 推測される勘定科目
}

/**
 * GPT-4o Visionに送るプロンプト
 * レシート画像から必要な情報を抽出するための指示
 *
 * 注意: ここで指定する勘定科目リストは、
 * settings-schema.sql の insert_default_expense_categories 関数で
 * 登録されるデフォルト科目名と一致させている
 * （これにより、経費入力画面でのドロップダウン自動選択の精度が上がる）
 *
 * 最適化ポイント:
 * - プロンプトを簡潔にしてトークン消費を削減
 * - 勘定科目リストは名称のみ（説明を省略してトークン節約）
 * - 読み取り精度向上のためのヒントを追加
 */
const OCR_PROMPT = `レシート画像から以下の情報をJSON形式で抽出してください。

抽出項目:
- date: 日付（YYYY-MM-DD形式。不明ならnull）
- amount: 税込合計金額（数値のみ。不明ならnull）
- storeName: 店舗名（不明ならnull）
- items: 主な品目（カンマ区切り、最大5つ。不明ならnull）
- category: 以下の農業勘定科目から最適な1つを選択

勘定科目一覧:
販管費,種苗費,肥料費,農薬費,諸材料費,労務費,雑給,法定福利費,作業衣服費,作業委託費,貸借料,農地賃借料,共済仕掛け金,修繕費,動力光熱費,消耗品,車両費,燃料費,保険費,機械等経費,機械等減価償却費,雑費,租税公課,土地改良費,旅費交通費,広告宣伝費,支払い手数料,荷造運賃,梱包資材費

読み取りのヒント:
- 合計金額は「合計」「計」「TOTAL」の近くにある数値
- 日付は上部に記載されていることが多い
- 画像が不鮮明でも可能な限り読み取ってください

JSONのみ返してください。説明文不要。
例: {"date":"2024-01-15","amount":5000,"storeName":"○○農業資材店","items":"肥料,培養土","category":"肥料費"}`;

/**
 * POSTリクエストを処理
 * レシート画像を受け取り、OCR解析結果を返す
 * 
 * 使用制限について：
 * - 無料プラン: 月50回まで
 * - 有料プラン: 無制限
 */
export async function POST(request: NextRequest) {
  try {
    // ========================================
    // Step 1: ログインユーザーの認証
    // ========================================
    // サーバー用のSupabaseクライアントを作成してユーザー情報を取得
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    // ログインしていない場合はエラー（OCR機能は認証が必要）
    if (authError || !user) {
      return NextResponse.json(
        { 
          error: "ログインが必要です", 
          code: "UNAUTHORIZED" 
        },
        { status: 401 }
      );
    }

    // ========================================
    // Step 2: 使用制限のチェック
    // ========================================
    // ユーザーのプランと今月の使用状況をチェック
    const usageCheck = await checkUsageLimit(supabase, user.id, "ocr");

    // 制限を超えている場合はアップグレードを促すエラーを返す
    if (!usageCheck.allowed) {
      return NextResponse.json(
        {
          error: `今月のOCR使用回数（${usageCheck.limit}回）に達しました。プランをアップグレードすると無制限で使用できます。`,
          code: "USAGE_LIMIT_EXCEEDED",
          // フロントエンドで残り回数を表示するための情報
          usageInfo: {
            currentUsage: usageCheck.currentUsage,
            limit: usageCheck.limit,
            remaining: usageCheck.remaining,
            planType: usageCheck.planType,
          },
        },
        { status: 403 }
      );
    }

    // ========================================
    // Step 3: リクエストの検証
    // ========================================
    // リクエストボディから画像データを取得
    const body = await request.json();
    const { imageBase64 } = body;

    // 画像データが無い場合はエラー
    if (!imageBase64) {
      return NextResponse.json(
        { error: "画像データが必要です" },
        { status: 400 }
      );
    }

    // ========================================
    // Step 4: OpenAI APIの準備
    // ========================================
    // OpenAIクライアントを取得（APIキーがない場合はエラー）
    let openai: OpenAI;
    try {
      openai = getOpenAIClient();
    } catch {
      return NextResponse.json(
        { error: "OpenAI APIキーが設定されていません。.env.localファイルを確認してください。" },
        { status: 500 }
      );
    }

    // GPT-4o-mini Vision APIを呼び出してレシート画像を解析
    // gpt-4o-mini はgpt-4oより高速かつ低コスト（レシートOCRには十分な精度）
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: OCR_PROMPT,
            },
            {
              type: "image_url",
              image_url: {
                // Base64画像をデータURLとして送信
                url: imageBase64.startsWith("data:")
                  ? imageBase64
                  : `data:image/jpeg;base64,${imageBase64}`,
                // "auto"で画像サイズに応じた最適な解像度を自動選択
                // フロントエンドで既に圧縮済みなので、APIでの追加処理を最小化
                detail: "auto",
              },
            },
          ],
        },
      ],
      max_tokens: 300, // レシートOCRの結果はコンパクトなので300で十分
      temperature: 0.1, // 低い温度で安定した出力を得る（OCRは創造性不要）
    });

    // APIレスポンスからテキストを取得
    const resultText = response.choices[0]?.message?.content;

    if (!resultText) {
      return NextResponse.json(
        { error: "画像の解析に失敗しました" },
        { status: 500 }
      );
    }

    // JSONをパース（GPTの回答からJSONを抽出）
    let ocrResult: ReceiptOcrResult;
    try {
      // JSONブロックを抽出（```json ... ``` 形式の場合も対応）
      const jsonMatch = resultText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        ocrResult = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("JSONが見つかりません");
      }
    } catch (parseError) {
      console.error("JSON解析エラー:", parseError, "原文:", resultText);
      return NextResponse.json(
        { error: "レシートの解析結果を処理できませんでした" },
        { status: 500 }
      );
    }

    // ========================================
    // Step 6: 使用回数をインクリメント
    // ========================================
    // OCR処理が成功したので、使用回数を1増やす
    // これにより次回の使用制限チェックに反映される
    try {
      await incrementUsage(supabase, user.id, "ocr");
    } catch (usageError) {
      // 使用回数の更新に失敗しても、OCR結果は返す（ユーザー体験を優先）
      // ただしログには記録して、後で対応できるようにする
      console.error("使用回数の更新に失敗しました:", usageError);
    }

    // ========================================
    // Step 7: 結果を返却
    // ========================================
    // 正常に解析できた場合、結果と残り使用回数を返す
    return NextResponse.json({
      success: true,
      data: ocrResult,
      // フロントエンドで残り回数を表示するための情報
      usageInfo: {
        currentUsage: usageCheck.currentUsage + 1, // 今回の使用を含める
        limit: usageCheck.limit,
        remaining: usageCheck.remaining - 1, // 今回の使用を引く
        planType: usageCheck.planType,
      },
    });

  } catch (error: any) {
    // エラーの詳細をログに記録
    console.error("OCR APIエラー:", error);

    // OpenAI APIのエラーを詳細に返す
    if (error?.status === 401) {
      return NextResponse.json(
        { error: "OpenAI APIキーが無効です。キーを確認してください。" },
        { status: 401 }
      );
    }

    if (error?.status === 429) {
      return NextResponse.json(
        { error: "API利用制限に達しました。しばらく待ってから再試行してください。" },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: error.message || "OCR処理中にエラーが発生しました" },
      { status: 500 }
    );
  }
}

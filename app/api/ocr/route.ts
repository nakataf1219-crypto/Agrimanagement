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
 */
const OCR_PROMPT = `あなたはレシート読み取りの専門家です。
以下の画像はレシートです。画像から以下の情報を抽出してください。

抽出する情報:
1. date: 日付（YYYY-MM-DD形式で出力。見つからない場合はnull）
2. amount: 合計金額（数値のみ。税込み金額を優先。見つからない場合はnull）
3. storeName: 店舗名（見つからない場合はnull）
4. items: 主な購入品目（カンマ区切りで最大5つ。見つからない場合はnull）
5. category: 農業経営の勘定科目として適切なもの（以下から1つ選択）
   【固定費】
   - 販管費（一般的な管理費、事務用品など）
   - 種苗費（種、苗、球根など）
   - 肥料費（化学肥料、有機肥料、堆肥など）
   - 農薬費（殺虫剤、除草剤、殺菌剤など）
   - 諸材料費（ビニール、マルチ、支柱など）
   - 労務費（従業員給与）
   - 雑給（臨時アルバイト代）
   - 法定福利費（社会保険料など）
   - 作業衣服費（作業着、手袋、長靴など）
   - 作業委託費（収穫代行、防除委託など）
   - 貸借料（機械リース料など）
   - 農地賃借料（農地の賃貸料）
   - 共済仕掛け金（農業共済の掛け金）
   - 修繕費（機械や施設の修理費）
   - 動力光熱費（電気代、ガス代、水道代）
   - 消耗品（工具、事務用品など）
   - 車両費（車検、自動車税、駐車場代など）
   - 燃料費（ガソリン、軽油、灯油など）
   - 保険費（損害保険、自動車保険など）
   - 機械等経費（機械のメンテナンス費用）
   - 機械等減価償却費（機械の減価償却）
   - 雑費（分類できない少額経費）
   - 租税公課（固定資産税、印紙代など）
   - 土地改良費（土壌改良、暗渠排水など）
   - 旅費交通費（出張費、交通費など）
   - 広告宣伝費（チラシ、看板、WEB広告など）
   - 支払い手数料（振込手数料、販売手数料など）
   【変動費】
   - 荷造運賃（出荷時の運送費）
   - 梱包資材費（段ボール、パック、袋など）

JSONのみを返してください。説明文は不要です。
形式: {"date": "2024-01-15", "amount": 5000, "storeName": "○○農業資材店", "items": "肥料, 培養土", "category": "肥料費"}`;

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

    // GPT-4o Vision APIを呼び出してレシート画像を解析
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
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
              },
            },
          ],
        },
      ],
      max_tokens: 500,
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

/**
 * AIアシスタント APIエンドポイント
 *
 * ビジネス上の役割:
 * - ユーザーが経営に関する質問をチャット形式で送信
 * - AIがユーザーの売上・経費データを参照して回答
 * - 経営アドバイス、コスト分析、収支改善提案などを提供
 *
 * 処理の流れ:
 * 1. ユーザー認証を確認
 * 2. 使用制限をチェック（無料プラン: 月10回まで）
 * 3. ユーザーの経営データをSupabaseから取得
 * 4. データをコンテキストとしてOpenAI APIに送信
 * 5. AIの回答を返却
 */

import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { checkUsageLimit, incrementUsage } from "@/lib/subscription";

/**
 * OpenAIクライアントを取得する関数
 */
function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY が設定されていません");
  }
  return new OpenAI({ apiKey });
}

/**
 * チャットメッセージの型定義
 */
interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

/**
 * ユーザーの経営データを取得してテキスト形式にまとめる
 *
 * ビジネス上の役割:
 * - AIが正確な回答をするために、ユーザーの実際のデータを提供
 * - 直近6ヶ月の売上・経費データを集計
 * - カテゴリ別の経費内訳も含める
 */
async function fetchUserBusinessData(
  supabase: ReturnType<typeof createSupabaseServerClient> extends Promise<infer T> ? T : never
): Promise<string> {
  const now = new Date();

  // 直近6ヶ月分のデータを取得するための日付範囲
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const startDate = sixMonthsAgo.toISOString().split("T")[0];
  const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    .toISOString()
    .split("T")[0];

  // 今月の範囲
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .split("T")[0];
  const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    .toISOString()
    .split("T")[0];

  // 売上・経費データを並行取得
  const [
    salesResult,
    expensesResult,
    currentMonthSalesResult,
    currentMonthExpensesResult,
  ] = await Promise.all([
    // 直近6ヶ月の売上
    supabase
      .from("sales")
      .select("date, crop_name, amount")
      .gte("date", startDate)
      .lte("date", endDate)
      .order("date", { ascending: false }),
    // 直近6ヶ月の経費
    supabase
      .from("expenses")
      .select("date, category, amount, description")
      .gte("date", startDate)
      .lte("date", endDate)
      .order("date", { ascending: false }),
    // 今月の売上
    supabase
      .from("sales")
      .select("amount")
      .gte("date", currentMonthStart)
      .lte("date", currentMonthEnd),
    // 今月の経費
    supabase
      .from("expenses")
      .select("amount")
      .gte("date", currentMonthStart)
      .lte("date", currentMonthEnd),
  ]);

  // 今月の合計を計算
  const currentMonthSales =
    currentMonthSalesResult.data?.reduce(
      (sum, s) => sum + (s.amount || 0),
      0
    ) || 0;
  const currentMonthExpenses =
    currentMonthExpensesResult.data?.reduce(
      (sum, e) => sum + (e.amount || 0),
      0
    ) || 0;

  // 直近6ヶ月の合計を計算
  const totalSales =
    salesResult.data?.reduce((sum, s) => sum + (s.amount || 0), 0) || 0;
  const totalExpenses =
    expensesResult.data?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0;

  // カテゴリ別の経費集計
  const categoryMap = new Map<string, number>();
  expensesResult.data?.forEach((expense) => {
    const category = expense.category || "未分類";
    const current = categoryMap.get(category) || 0;
    categoryMap.set(category, current + expense.amount);
  });

  // カテゴリ別を金額順にソート
  const sortedCategories = Array.from(categoryMap.entries())
    .sort(([, amountA], [, amountB]) => amountB - amountA)
    .map(([category, amount]) => `  ${category}: ¥${amount.toLocaleString()}`)
    .join("\n");

  // 月別の売上集計
  const monthlySalesMap = new Map<string, number>();
  salesResult.data?.forEach((sale) => {
    const monthKey = sale.date.substring(0, 7);
    const current = monthlySalesMap.get(monthKey) || 0;
    monthlySalesMap.set(monthKey, current + sale.amount);
  });

  // 月別の経費集計
  const monthlyExpensesMap = new Map<string, number>();
  expensesResult.data?.forEach((expense) => {
    const monthKey = expense.date.substring(0, 7);
    const current = monthlyExpensesMap.get(monthKey) || 0;
    monthlyExpensesMap.set(monthKey, current + expense.amount);
  });

  // 月別推移テキスト
  const allMonthKeys = new Set([
    ...monthlySalesMap.keys(),
    ...monthlyExpensesMap.keys(),
  ]);
  const monthlyTrend = Array.from(allMonthKeys)
    .sort()
    .map((monthKey) => {
      const sales = monthlySalesMap.get(monthKey) || 0;
      const expenses = monthlyExpensesMap.get(monthKey) || 0;
      return `  ${monthKey}: 売上¥${sales.toLocaleString()} / 経費¥${expenses.toLocaleString()} / 利益¥${(sales - expenses).toLocaleString()}`;
    })
    .join("\n");

  // 主な作物（売上上位）
  const cropMap = new Map<string, number>();
  salesResult.data?.forEach((sale) => {
    const crop = sale.crop_name || "不明";
    const current = cropMap.get(crop) || 0;
    cropMap.set(crop, current + sale.amount);
  });
  const topCrops = Array.from(cropMap.entries())
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([crop, amount]) => `  ${crop}: ¥${amount.toLocaleString()}`)
    .join("\n");

  // テキストにまとめる
  return `
【ユーザーの経営データ（直近6ヶ月）】

■ 今月のサマリー:
  売上合計: ¥${currentMonthSales.toLocaleString()}
  経費合計: ¥${currentMonthExpenses.toLocaleString()}
  利益: ¥${(currentMonthSales - currentMonthExpenses).toLocaleString()}

■ 直近6ヶ月の合計:
  売上合計: ¥${totalSales.toLocaleString()}
  経費合計: ¥${totalExpenses.toLocaleString()}
  利益: ¥${(totalSales - totalExpenses).toLocaleString()}
  売上件数: ${salesResult.data?.length || 0}件
  経費件数: ${expensesResult.data?.length || 0}件

■ カテゴリ別経費（直近6ヶ月、金額順）:
${sortedCategories || "  データなし"}

■ 月別推移:
${monthlyTrend || "  データなし"}

■ 主な作物（売上上位）:
${topCrops || "  データなし"}
`.trim();
}

/**
 * AIアシスタントのシステムプロンプト
 * 農業経営のアドバイザーとしての役割を定義
 */
const SYSTEM_PROMPT = `あなたは農業経営の専門アドバイザーです。
ユーザーは農家で、経営管理アプリを使って売上・経費を記録しています。

あなたの役割:
1. ユーザーの経営データに基づいた具体的なアドバイスを提供する
2. コスト削減、売上向上、経営改善の提案をする
3. 農業特有の勘定科目や経費について分かりやすく説明する
4. 確定申告や税務に関する一般的なアドバイスをする（※税理士への相談を推奨）

回答のルール:
- 日本語で回答してください
- 具体的な数値を使って説明してください
- 簡潔で分かりやすい表現を使ってください
- 箇条書きを活用して読みやすくしてください
- 回答は300文字以内を目安にしてください
- データがない場合は「データが不足しています」と正直に伝えてください`;

/**
 * POSTリクエストを処理
 * ユーザーの質問を受け取り、AIの回答を返す
 */
export async function POST(request: NextRequest) {
  try {
    // ========================================
    // Step 1: ログインユーザーの認証
    // ========================================
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "ログインが必要です", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    // ========================================
    // Step 2: 使用制限のチェック
    // ========================================
    const usageCheck = await checkUsageLimit(
      supabase,
      user.id,
      "ai_assistant"
    );

    if (!usageCheck.allowed) {
      return NextResponse.json(
        {
          error: `今月のAIアシスタント使用回数（${usageCheck.limit}回）に達しました。プランをアップグレードすると無制限で使用できます。`,
          code: "USAGE_LIMIT_EXCEEDED",
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
    const body = await request.json();
    const { message, conversationHistory } = body as {
      message: string;
      conversationHistory?: ChatMessage[];
    };

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return NextResponse.json(
        { error: "メッセージを入力してください" },
        { status: 400 }
      );
    }

    // メッセージの長さ制限（悪用防止）
    if (message.length > 1000) {
      return NextResponse.json(
        { error: "メッセージは1000文字以内で入力してください" },
        { status: 400 }
      );
    }

    // ========================================
    // Step 4: ユーザーの経営データを取得
    // ========================================
    let businessDataContext = "";
    try {
      businessDataContext = await fetchUserBusinessData(supabase);
    } catch (dataError) {
      console.error("経営データ取得エラー:", dataError);
      businessDataContext = "（経営データの取得に失敗しました。一般的なアドバイスで回答してください）";
    }

    // ========================================
    // Step 5: OpenAI APIを呼び出し
    // ========================================
    let openai: OpenAI;
    try {
      openai = getOpenAIClient();
    } catch {
      return NextResponse.json(
        {
          error:
            "OpenAI APIキーが設定されていません。管理者にお問い合わせください。",
        },
        { status: 500 }
      );
    }

    // 会話履歴を構築（直近5往復まで保持してコンテキストを維持）
    const recentHistory = (conversationHistory || []).slice(-10);
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      {
        role: "system",
        content: `${SYSTEM_PROMPT}\n\n${businessDataContext}`,
      },
      // 過去の会話履歴
      ...recentHistory.map(
        (msg) =>
          ({
            role: msg.role,
            content: msg.content,
          }) as OpenAI.Chat.Completions.ChatCompletionMessageParam
      ),
      // 今回のユーザーメッセージ
      {
        role: "user",
        content: message,
      },
    ];

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      max_tokens: 800,
      temperature: 0.7, // 適度な創造性（アドバイスには多少の柔軟性が必要）
    });

    const assistantMessage = response.choices[0]?.message?.content;

    if (!assistantMessage) {
      return NextResponse.json(
        { error: "AIからの回答を取得できませんでした" },
        { status: 500 }
      );
    }

    // ========================================
    // Step 6: 使用回数をインクリメント
    // ========================================
    try {
      await incrementUsage(supabase, user.id, "ai_assistant");
    } catch (usageError) {
      console.error("使用回数の更新に失敗しました:", usageError);
    }

    // ========================================
    // Step 7: 結果を返却
    // ========================================
    return NextResponse.json({
      success: true,
      message: assistantMessage,
      usageInfo: {
        currentUsage: usageCheck.currentUsage + 1,
        limit: usageCheck.limit,
        remaining: usageCheck.remaining - 1,
        planType: usageCheck.planType,
      },
    });
  } catch (error: unknown) {
    console.error("AIアシスタントAPIエラー:", error);

    const errorObj = error as { status?: number; message?: string };

    if (errorObj?.status === 429) {
      return NextResponse.json(
        {
          error:
            "API利用制限に達しました。しばらく待ってから再試行してください。",
        },
        { status: 429 }
      );
    }

    return NextResponse.json(
      {
        error:
          errorObj?.message || "AIアシスタント処理中にエラーが発生しました",
      },
      { status: 500 }
    );
  }
}

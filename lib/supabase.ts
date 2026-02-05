import { createClient } from "@supabase/supabase-js";

// 環境変数からSupabaseのURLとAnon Keyを取得
// これらの値は、SupabaseプロジェクトのSettings > APIから取得できます
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "Supabase環境変数が設定されていません。.env.localファイルに以下を設定してください：\n" +
      "NEXT_PUBLIC_SUPABASE_URL=your_supabase_url\n" +
      "NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key"
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 型定義
// これらの型は、Supabaseのテーブル構造と対応しています

/**
 * 経費データの型
 * expenses テーブルのレコード構造を表します
 */
export type Expense = {
  // レコードの一意ID（新規登録時は自動生成されるため省略可能）
  id?: string;
  // データ所有者のユーザーID（認証されたユーザーのID）
  user_id?: string;
  // 経費が発生した日付（YYYY-MM-DD形式）
  date: string;
  // 勘定科目（例: 肥料費、農薬費）
  category: string;
  // 金額（円）
  amount: number;
  // 摘要・メモ（任意）
  description?: string;
  // レコード作成日時（自動設定）
  created_at?: string;
};

/**
 * 売上データの型
 * sales テーブルのレコード構造を表します
 */
export type Sale = {
  // レコードの一意ID（新規登録時は自動生成されるため省略可能）
  id?: string;
  // データ所有者のユーザーID（認証されたユーザーのID）
  user_id?: string;
  // 売上が発生した日付（YYYY-MM-DD形式）
  date: string;
  // 作物名（例: トマト、キュウリ）
  crop_name: string;
  // 出荷先/取引先
  customer: string;
  // 単価（任意）
  unit_price?: number;
  // 数量（任意）
  quantity?: number;
  // 売上金額（円）
  amount: number;
  // 摘要・メモ（任意）
  description?: string;
  // レコード作成日時（自動設定）
  created_at?: string;
};

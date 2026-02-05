-- AgriManagement Database Schema
-- このSQLをSupabaseのSQL Editorで実行してください

-- Table A: expenses (経費)
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  category TEXT NOT NULL,
  amount INTEGER NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table B: sales (売上)
CREATE TABLE IF NOT EXISTS sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  crop_name TEXT NOT NULL,
  customer TEXT NOT NULL,
  unit_price INTEGER,
  quantity INTEGER,
  amount INTEGER NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS (Row Level Security) を無効化（認証スキップ中）
ALTER TABLE expenses DISABLE ROW LEVEL SECURITY;
ALTER TABLE sales DISABLE ROW LEVEL SECURITY;

-- 全ユーザーが読み書き可能なポリシーを設定（RLSが有効な場合の代替案）
-- 以下のコメントアウトされたポリシーは、RLSを有効にする場合に使用してください
/*
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on expenses" ON expenses
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on sales" ON sales
  FOR ALL USING (true) WITH CHECK (true);
*/

-- インデックスの作成（パフォーマンス向上のため）
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(date);

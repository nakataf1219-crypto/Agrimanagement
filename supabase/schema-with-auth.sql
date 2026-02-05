-- =============================================================================
-- AgriManagement RLS対応版データベーススキーマ
-- =============================================================================
-- 
-- このSQLはSupabaseのSQL Editorで実行してください。
-- 
-- 重要な注意事項:
-- - このスクリプトは既存のテーブルを削除して再作成します
-- - 既存データがある場合は、先にバックアップを取ってください
-- - 実行後、ユーザーは自分のデータのみアクセス可能になります
--
-- =============================================================================

-- =============================================================================
-- ステップ1: 既存テーブルの削除
-- =============================================================================
-- 既存のテーブルとポリシーを削除して、クリーンな状態から再構築します

DROP TABLE IF EXISTS expenses;
DROP TABLE IF EXISTS sales;

-- =============================================================================
-- ステップ2: 経費テーブルの作成（user_id付き）
-- =============================================================================
-- expenses（経費）テーブル
-- ビジネス上の役割: 農業経営における肥料費、農薬費、燃料費などの支出を記録

CREATE TABLE expenses (
  -- 一意のID（自動生成）
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- どのユーザーのデータかを識別するためのID
  -- auth.users テーブルと連携し、ユーザー削除時にデータも自動削除される
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- 経費が発生した日付（例: 2024-01-15）
  date DATE NOT NULL,
  
  -- 勘定科目（例: 肥料費、農薬費、燃料費）
  category TEXT NOT NULL,
  
  -- 金額（円）
  amount INTEGER NOT NULL,
  
  -- 摘要・メモ（任意入力）
  description TEXT,
  
  -- レコード作成日時（自動設定）
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- ステップ3: 売上テーブルの作成（user_id付き）
-- =============================================================================
-- sales（売上）テーブル
-- ビジネス上の役割: 農産物の販売による収入を記録

CREATE TABLE sales (
  -- 一意のID（自動生成）
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- どのユーザーのデータかを識別するためのID
  -- auth.users テーブルと連携し、ユーザー削除時にデータも自動削除される
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- 売上が発生した日付（例: 2024-01-15）
  date DATE NOT NULL,
  
  -- 作物名（例: トマト、キュウリ）
  crop_name TEXT NOT NULL,
  
  -- 出荷先/取引先（例: ○○農協、○○スーパー）
  customer TEXT NOT NULL,
  
  -- 単価（任意。kg単価など）
  unit_price INTEGER,
  
  -- 数量（任意。出荷量など）
  quantity INTEGER,
  
  -- 売上金額（円）
  amount INTEGER NOT NULL,
  
  -- 摘要・メモ（任意入力）
  description TEXT,
  
  -- レコード作成日時（自動設定）
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- ステップ4: RLS（行レベルセキュリティ）の有効化
-- =============================================================================
-- RLSを有効にすることで、各ユーザーは自分のデータのみアクセス可能になります
-- これによりマルチテナント（複数ユーザー）対応が実現されます

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- ステップ5: 経費テーブルのセキュリティポリシー設定
-- =============================================================================
-- 以下のポリシーにより、ログインユーザーは自分のデータのみ操作可能

-- SELECT（読み取り）: ログインユーザーは自分の経費のみ閲覧可能
CREATE POLICY "Users can view own expenses" ON expenses
  FOR SELECT USING (auth.uid() = user_id);

-- INSERT（新規登録）: ログインユーザーは自分のuser_idでのみ登録可能
CREATE POLICY "Users can insert own expenses" ON expenses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- UPDATE（更新）: ログインユーザーは自分の経費のみ更新可能
CREATE POLICY "Users can update own expenses" ON expenses
  FOR UPDATE USING (auth.uid() = user_id);

-- DELETE（削除）: ログインユーザーは自分の経費のみ削除可能
CREATE POLICY "Users can delete own expenses" ON expenses
  FOR DELETE USING (auth.uid() = user_id);

-- =============================================================================
-- ステップ6: 売上テーブルのセキュリティポリシー設定
-- =============================================================================
-- 以下のポリシーにより、ログインユーザーは自分のデータのみ操作可能

-- SELECT（読み取り）: ログインユーザーは自分の売上のみ閲覧可能
CREATE POLICY "Users can view own sales" ON sales
  FOR SELECT USING (auth.uid() = user_id);

-- INSERT（新規登録）: ログインユーザーは自分のuser_idでのみ登録可能
CREATE POLICY "Users can insert own sales" ON sales
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- UPDATE（更新）: ログインユーザーは自分の売上のみ更新可能
CREATE POLICY "Users can update own sales" ON sales
  FOR UPDATE USING (auth.uid() = user_id);

-- DELETE（削除）: ログインユーザーは自分の売上のみ削除可能
CREATE POLICY "Users can delete own sales" ON sales
  FOR DELETE USING (auth.uid() = user_id);

-- =============================================================================
-- ステップ7: インデックスの作成（パフォーマンス向上）
-- =============================================================================
-- user_idとdateの組み合わせで検索することが多いため、複合インデックスを作成
-- これにより「今月の自分のデータ」を高速に取得できます

CREATE INDEX idx_expenses_user_date ON expenses(user_id, date);
CREATE INDEX idx_sales_user_date ON sales(user_id, date);

-- =============================================================================
-- 完了メッセージ
-- =============================================================================
-- このSQLの実行が成功すると:
-- 1. expenses, sales テーブルが user_id 付きで再作成される
-- 2. RLSが有効になり、各ユーザーは自分のデータのみアクセス可能
-- 3. パフォーマンス向上のためのインデックスが作成される

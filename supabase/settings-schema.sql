-- =============================================================================
-- AgriManagement 設定機能用データベーススキーマ
-- =============================================================================
-- 
-- このSQLはSupabaseのSQL Editorで実行してください。
-- 
-- 機能概要:
-- - user_profiles: ユーザーの農場情報（農場名、代表者名）を保存
-- - expense_categories: ユーザーごとの勘定科目マスタを管理
-- 
-- =============================================================================

-- =============================================================================
-- ステップ1: user_profiles テーブル（農場情報）
-- =============================================================================
-- ビジネス上の役割: 
-- 各ユーザーの農場名と代表者名を保存
-- ユーザーと1対1の関係（1ユーザーにつき1プロフィール）

CREATE TABLE IF NOT EXISTS user_profiles (
  -- 一意のID（自動生成）
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- どのユーザーのプロフィールかを識別するID
  -- 1ユーザーにつき1プロフィールなので UNIQUE 制約を付与
  -- ユーザー削除時にプロフィールも自動削除される
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- 農場名（例：○○農園、△△ファーム）
  farm_name TEXT,
  
  -- 代表者名（例：山田太郎）
  owner_name TEXT,
  
  -- レコード作成日時
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- レコード更新日時
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- ステップ2: expense_categories テーブル（勘定科目マスタ）
-- =============================================================================
-- ビジネス上の役割:
-- ユーザーごとに管理する勘定科目のマスタデータ
-- 経費登録時にこのリストから勘定科目を選択する

CREATE TABLE IF NOT EXISTS expense_categories (
  -- 一意のID（自動生成）
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- どのユーザーの勘定科目かを識別するID
  -- ユーザー削除時に勘定科目も自動削除される
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- 勘定科目名（例：肥料費、農薬費、燃料費）
  name TEXT NOT NULL,
  
  -- 勘定科目の区分
  -- fixed: 固定費（毎月発生する経費）
  -- variable: 変動費（売上に連動する経費）
  category_type TEXT NOT NULL DEFAULT 'fixed' CHECK (category_type IN ('fixed', 'variable')),
  
  -- 表示順序（画面でのソート順を制御）
  display_order INTEGER DEFAULT 0,
  
  -- 有効フラグ（falseの場合は選択肢に表示しない）
  is_active BOOLEAN DEFAULT true,
  
  -- レコード作成日時
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- 同じユーザーで同じ科目名は登録できないようにする
  UNIQUE (user_id, name)
);

-- =============================================================================
-- ステップ3: RLS（行レベルセキュリティ）の有効化
-- =============================================================================
-- 各ユーザーは自分のデータのみアクセス可能にする

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- ステップ4: user_profiles のセキュリティポリシー
-- =============================================================================

-- SELECT: ログインユーザーは自分のプロフィールのみ閲覧可能
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = user_id);

-- INSERT: ログインユーザーは自分のuser_idでのみ登録可能
CREATE POLICY "Users can insert own profile" ON user_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- UPDATE: ログインユーザーは自分のプロフィールのみ更新可能
CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- DELETE: ログインユーザーは自分のプロフィールのみ削除可能
CREATE POLICY "Users can delete own profile" ON user_profiles
  FOR DELETE USING (auth.uid() = user_id);

-- =============================================================================
-- ステップ5: expense_categories のセキュリティポリシー
-- =============================================================================

-- SELECT: ログインユーザーは自分の勘定科目のみ閲覧可能
CREATE POLICY "Users can view own expense categories" ON expense_categories
  FOR SELECT USING (auth.uid() = user_id);

-- INSERT: ログインユーザーは自分のuser_idでのみ登録可能
CREATE POLICY "Users can insert own expense categories" ON expense_categories
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- UPDATE: ログインユーザーは自分の勘定科目のみ更新可能
CREATE POLICY "Users can update own expense categories" ON expense_categories
  FOR UPDATE USING (auth.uid() = user_id);

-- DELETE: ログインユーザーは自分の勘定科目のみ削除可能
CREATE POLICY "Users can delete own expense categories" ON expense_categories
  FOR DELETE USING (auth.uid() = user_id);

-- =============================================================================
-- ステップ6: インデックスの作成（パフォーマンス向上）
-- =============================================================================

-- user_idで検索することが多いため、インデックスを作成
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_expense_categories_user_id ON expense_categories(user_id);

-- 有効な勘定科目を表示順で取得するためのインデックス
CREATE INDEX IF NOT EXISTS idx_expense_categories_active_order 
  ON expense_categories(user_id, is_active, display_order);

-- =============================================================================
-- ステップ7: updated_at を自動更新するトリガー
-- =============================================================================
-- user_profiles のレコードが更新されたときに updated_at を自動的に現在時刻に設定

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- user_profiles に更新トリガーを設定
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- ステップ8: デフォルト勘定科目を投入する関数
-- =============================================================================
-- ビジネス上の役割:
-- 新規ユーザーや「初期リセット」ボタンを押した時にデフォルトの勘定科目を登録する
-- 
-- 引数: target_user_id - 勘定科目を登録するユーザーのID
-- 戻り値: なし
-- 
-- 使用方法（SQLクライアントから）:
-- SELECT insert_default_expense_categories('ユーザーのUUID');
--
-- 使用方法（アプリから）:
-- await supabase.rpc('insert_default_expense_categories', { target_user_id: userId });

CREATE OR REPLACE FUNCTION insert_default_expense_categories(target_user_id UUID)
RETURNS void AS $$
DECLARE
  -- 固定費の勘定科目リスト
  fixed_categories TEXT[] := ARRAY[
    '販管費', '種苗費', '肥料費', '農薬費', '諸材料費',
    '労務費', '雑給', '法定福利費', '作業衣服費', '臨時賞与',
    '作業委託費', '貸借料', '農地賃借料', '共済仕掛け金', '修繕費',
    '動力光熱費', '消耗品', '車両費', '燃料費', '保険費',
    '機械等経費', '機械等減価償却費', '雑費', '租税公課', '土地改良費',
    '旅費交通費', '病院費', '広告宣伝費', '支払い手数料'
  ];
  
  -- 変動費の勘定科目リスト
  variable_categories TEXT[] := ARRAY[
    '荷造運賃', '梱包資材費'
  ];
  
  category_name TEXT;
  order_num INTEGER := 1;
BEGIN
  -- 既存の勘定科目を削除（初期リセット用）
  DELETE FROM expense_categories WHERE user_id = target_user_id;
  
  -- 固定費の勘定科目を登録
  FOREACH category_name IN ARRAY fixed_categories
  LOOP
    INSERT INTO expense_categories (user_id, name, category_type, display_order, is_active)
    VALUES (target_user_id, category_name, 'fixed', order_num, true);
    order_num := order_num + 1;
  END LOOP;
  
  -- 変動費の勘定科目を登録
  FOREACH category_name IN ARRAY variable_categories
  LOOP
    INSERT INTO expense_categories (user_id, name, category_type, display_order, is_active)
    VALUES (target_user_id, category_name, 'variable', order_num, true);
    order_num := order_num + 1;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 関数の実行権限をauthenticatedユーザーに付与
GRANT EXECUTE ON FUNCTION insert_default_expense_categories(UUID) TO authenticated;

-- =============================================================================
-- 完了メッセージ
-- =============================================================================
-- このSQLの実行が成功すると:
-- 1. user_profiles テーブルが作成される（農場情報を保存）
-- 2. expense_categories テーブルが作成される（勘定科目マスタ）
-- 3. RLSが有効になり、各ユーザーは自分のデータのみアクセス可能
-- 4. デフォルト勘定科目を投入する関数が利用可能になる

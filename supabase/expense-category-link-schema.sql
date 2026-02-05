-- =============================================================================
-- AgriManagement 勘定科目連携用データベーススキーマ
-- =============================================================================
-- 
-- このSQLはSupabaseのSQL Editorで実行してください。
-- 
-- 目的:
-- - 経費テーブル(expenses)と勘定科目マスタ(expense_categories)を連携させる
-- - 設定画面で科目名を変更したら、既存の経費データにも自動反映される
-- 
-- 前提条件:
-- - schema-with-auth.sql が実行済み（expenses テーブルが存在する）
-- - settings-schema.sql が実行済み（expense_categories テーブルが存在する）
--
-- =============================================================================

-- =============================================================================
-- ステップ1: expenses テーブルに category_id カラムを追加
-- =============================================================================
-- 
-- ビジネス上の役割:
-- - 経費データと勘定科目マスタを紐付けるためのカラム
-- - NULL許可にすることで、既存データ（連携前に登録されたデータ）も保持できる
-- - 勘定科目が削除された場合は NULL に設定される（経費データは残る）

ALTER TABLE expenses 
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES expense_categories(id) ON DELETE SET NULL;

-- category_id で検索するためのインデックス
-- （例：特定の勘定科目の経費を集計する場合に高速化）
CREATE INDEX IF NOT EXISTS idx_expenses_category_id ON expenses(category_id);

-- =============================================================================
-- ステップ2: 科目名変更時に expenses.category を自動更新する関数
-- =============================================================================
-- 
-- ビジネス上の役割:
-- - 設定画面で「肥料費」を「有機肥料費」に変更した場合
-- - その科目で登録された全ての経費の category カラムも自動で更新される
-- - これにより、分析画面で常に最新の科目名で表示される

CREATE OR REPLACE FUNCTION update_expenses_category_name()
RETURNS TRIGGER AS $$
BEGIN
  -- 科目名が変更された場合のみ実行
  -- （科目名以外のカラムが変更された場合は何もしない）
  IF OLD.name <> NEW.name THEN
    -- この科目に紐づく全ての経費の category カラムを新しい名前に更新
    UPDATE expenses 
    SET category = NEW.name 
    WHERE category_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- ステップ3: 科目名変更時のトリガーを設定
-- =============================================================================
-- 
-- expense_categories の name カラムが UPDATE された時に
-- 上記の関数が自動的に実行される

-- 既存のトリガーがあれば削除（再実行時のエラー防止）
DROP TRIGGER IF EXISTS sync_expense_category_name ON expense_categories;

-- 新しいトリガーを作成
CREATE TRIGGER sync_expense_category_name
  AFTER UPDATE OF name ON expense_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_expenses_category_name();

-- =============================================================================
-- 完了メッセージ
-- =============================================================================
-- このSQLの実行が成功すると:
-- 1. expenses テーブルに category_id カラムが追加される
-- 2. 勘定科目名を変更すると、紐づく経費の category が自動更新される
--
-- 使用例:
-- - 経費登録時: category_id と category（科目名）の両方を保存
-- - 科目名変更時: expense_categories.name を更新 → 自動で expenses.category も更新

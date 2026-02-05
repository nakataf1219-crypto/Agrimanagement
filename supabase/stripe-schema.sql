-- =============================================================================
-- AgriManagement Stripe決済連携用データベーススキーマ
-- =============================================================================
-- 
-- このSQLはSupabaseのSQL Editorで実行してください。
-- 
-- 概要:
-- - subscriptions: ユーザーのサブスクリプション（契約）状態を管理
-- - usage_tracking: 無料プランユーザーの月次使用量を追跡
--
-- プラン構成:
-- - free（無料）: OCR 50回/月、出力 3回/月、AI 10回/月
-- - standard（スタンダード）: ¥2,980/月 - 全機能無制限
-- - premium（プレミアム）: ¥4,980/月 - 全機能無制限 + 優先サポート
-- - pro_yearly（年額プロ）: ¥35,760/年 - プレミアム同等
--
-- =============================================================================

-- =============================================================================
-- ステップ1: subscriptions テーブルの作成
-- =============================================================================
-- subscriptions（サブスクリプション）テーブル
-- ビジネス上の役割: ユーザーがどのプランに加入しているか、Stripeとの連携情報を管理

CREATE TABLE IF NOT EXISTS subscriptions (
  -- 一意のID（自動生成）
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- どのユーザーの契約かを識別するためのID
  -- 1ユーザーにつき1つのサブスクリプションのみ（UNIQUE制約）
  -- auth.users テーブルと連携し、ユーザー削除時にデータも自動削除される
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Stripe側の顧客ID（例: cus_xxxxxxxxxx）
  -- Stripeダッシュボードで顧客を特定するために使用
  stripe_customer_id TEXT,
  
  -- Stripe側のサブスクリプションID（例: sub_xxxxxxxxxx）
  -- 契約の更新・解約処理に使用
  stripe_subscription_id TEXT,
  
  -- プランの種類
  -- 'free': 無料プラン（デフォルト）
  -- 'standard': スタンダードプラン（¥2,980/月）
  -- 'premium': プレミアムプラン（¥4,980/月）
  -- 'pro_yearly': 年額プロプラン（¥35,760/年）
  plan_type TEXT NOT NULL DEFAULT 'free'
    CHECK (plan_type IN ('free', 'standard', 'premium', 'pro_yearly')),
  
  -- サブスクリプションの状態
  -- 'active': 有効（正常に支払いが完了している）
  -- 'canceled': 解約済み（次の更新日で終了）
  -- 'past_due': 支払い遅延（カード決済失敗など）
  -- 'trialing': お試し期間中（将来の拡張用）
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'canceled', 'past_due', 'trialing')),
  
  -- 現在の契約期間の開始日
  -- Stripeから受け取った値を保存
  current_period_start TIMESTAMPTZ,
  
  -- 現在の契約期間の終了日（次回更新日）
  -- この日を過ぎると自動更新または解約される
  current_period_end TIMESTAMPTZ,
  
  -- レコード作成日時（自動設定）
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- レコード更新日時（Webhook受信時などに更新）
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- ステップ2: usage_tracking テーブルの作成
-- =============================================================================
-- usage_tracking（使用量追跡）テーブル
-- ビジネス上の役割: 無料プランユーザーの月ごとの使用回数を記録し、上限を管理

CREATE TABLE IF NOT EXISTS usage_tracking (
  -- 一意のID（自動生成）
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- どのユーザーの使用量かを識別するためのID
  -- auth.users テーブルと連携し、ユーザー削除時にデータも自動削除される
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- OCR（レシート読み取り）の使用回数
  -- 無料プラン上限: 50回/月
  ocr_count INTEGER DEFAULT 0,
  
  -- 出力（CSV/PDFエクスポート）の使用回数
  -- 無料プラン上限: 3回/月
  export_count INTEGER DEFAULT 0,
  
  -- AIアシスタントの使用回数
  -- 無料プラン上限: 10回/月
  ai_assistant_count INTEGER DEFAULT 0,
  
  -- 集計期間の開始日（その月の1日）
  -- 例: 2024-01-01 は2024年1月の使用量
  period_start DATE NOT NULL,
  
  -- レコード作成日時（自動設定）
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- 同一ユーザー・同一月には1レコードのみ（重複防止）
  UNIQUE(user_id, period_start)
);

-- =============================================================================
-- ステップ3: RLS（行レベルセキュリティ）の有効化
-- =============================================================================
-- RLSを有効にすることで、各ユーザーは自分のデータのみアクセス可能になります

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_tracking ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- ステップ4: subscriptions テーブルのセキュリティポリシー設定
-- =============================================================================
-- ユーザーは自分のサブスクリプション情報のみ閲覧可能
-- 注意: INSERT/UPDATE/DELETE はAPIルート（Webhook）経由でのみ行うため、
-- service_role キーを使用してRLSをバイパスする

-- SELECT（読み取り）: ログインユーザーは自分のサブスクリプションのみ閲覧可能
CREATE POLICY "Users can view own subscription" ON subscriptions
  FOR SELECT USING (auth.uid() = user_id);

-- INSERT（新規登録）: ログインユーザーは自分のサブスクリプションのみ作成可能
-- ※新規ユーザー登録時に無料プランのレコードを自動作成する際に使用
CREATE POLICY "Users can insert own subscription" ON subscriptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- UPDATE（更新）: サーバーサイド（Webhook）からのみ更新可能
-- クライアントからの直接更新は許可しない（不正なプラン変更を防止）
-- service_role キーを使用する場合、RLSはバイパスされる

-- =============================================================================
-- ステップ5: usage_tracking テーブルのセキュリティポリシー設定
-- =============================================================================
-- ユーザーは自分の使用量のみ閲覧可能
-- 更新はAPIルート経由でservice_roleキーを使用して行う

-- SELECT（読み取り）: ログインユーザーは自分の使用量のみ閲覧可能
CREATE POLICY "Users can view own usage" ON usage_tracking
  FOR SELECT USING (auth.uid() = user_id);

-- INSERT（新規登録）: ログインユーザーは自分の使用量レコードのみ作成可能
CREATE POLICY "Users can insert own usage" ON usage_tracking
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- UPDATE（更新）: ログインユーザーは自分の使用量のみ更新可能
CREATE POLICY "Users can update own usage" ON usage_tracking
  FOR UPDATE USING (auth.uid() = user_id);

-- =============================================================================
-- ステップ6: インデックスの作成（パフォーマンス向上）
-- =============================================================================
-- 頻繁に検索されるカラムにインデックスを作成

-- サブスクリプションテーブル: Stripeからの問い合わせ用
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer 
  ON subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription 
  ON subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id 
  ON subscriptions(user_id);

-- 使用量追跡テーブル: ユーザー×期間での検索用
CREATE INDEX IF NOT EXISTS idx_usage_tracking_user_period 
  ON usage_tracking(user_id, period_start);

-- =============================================================================
-- ステップ7: updated_at 自動更新トリガー
-- =============================================================================
-- subscriptions テーブルの updated_at を更新時に自動で現在時刻に設定

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- トリガーが既に存在する場合は削除してから作成
DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON subscriptions;

CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- ステップ8: 新規ユーザー登録時にサブスクリプションを自動作成するトリガー
-- =============================================================================
-- ユーザーがサインアップしたとき、自動的に無料プランのサブスクリプションを作成
-- これにより、プランチェックの際にNULLハンドリングが不要になる

CREATE OR REPLACE FUNCTION handle_new_user_subscription()
RETURNS TRIGGER AS $$
BEGIN
  -- 新規ユーザーに無料プランのサブスクリプションを自動作成
  INSERT INTO subscriptions (user_id, plan_type, status)
  VALUES (NEW.id, 'free', 'active')
  ON CONFLICT (user_id) DO NOTHING;  -- 既に存在する場合は何もしない
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- トリガーが既に存在する場合は削除してから作成
DROP TRIGGER IF EXISTS on_auth_user_created_subscription ON auth.users;

CREATE TRIGGER on_auth_user_created_subscription
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user_subscription();

-- =============================================================================
-- 完了メッセージ
-- =============================================================================
-- このSQLの実行が成功すると:
-- 1. subscriptions テーブルが作成され、ユーザーのプラン情報を管理できる
-- 2. usage_tracking テーブルが作成され、無料プランの使用量を追跡できる
-- 3. RLSが有効になり、各ユーザーは自分のデータのみアクセス可能
-- 4. 新規ユーザー登録時に自動で無料プランが割り当てられる
-- 5. subscriptions の updated_at が更新時に自動更新される
--
-- 次のステップ:
-- - Stripeダッシュボードで商品・価格を作成
-- - 環境変数に STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET を設定
-- - app/api/stripe/ 配下のAPIエンドポイントを実装

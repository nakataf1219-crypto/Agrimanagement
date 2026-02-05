# Supabaseセットアップ手順

## 1. Supabaseプロジェクトの作成

1. [Supabase](https://supabase.com/)にアクセスしてアカウントを作成（またはログイン）
2. 新しいプロジェクトを作成
3. プロジェクト名を入力（例: `agrimanagement`）
4. データベースパスワードを設定
5. リージョンを選択（例: `Tokyo`）
6. プロジェクト作成を完了

## 2. テーブルの作成

1. Supabaseダッシュボードで、左メニューから「SQL Editor」を選択
2. `supabase/schema.sql` の内容をコピー
3. SQL Editorに貼り付けて実行（「Run」ボタンをクリック）
4. テーブルが正常に作成されたことを確認

## 3. 環境変数の設定

1. Supabaseダッシュボードで、左メニューから「Settings」→「API」を選択
2. 以下の情報をコピー：
   - **Project URL**（`NEXT_PUBLIC_SUPABASE_URL`）
   - **anon public** key（`NEXT_PUBLIC_SUPABASE_ANON_KEY`）

3. プロジェクトルートに `.env.local` ファイルを作成（まだ存在しない場合）

4. `.env.local` に以下を追加：

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

5. 実際の値に置き換えて保存

## 4. 動作確認

1. 開発サーバーを起動：
```bash
npm run dev
```

2. ブラウザで `http://localhost:3000` にアクセス
3. 「経費を登録する」または「売上を登録する」をクリック
4. フォームに入力して送信
5. Supabaseダッシュボードの「Table Editor」で、データが保存されていることを確認

## トラブルシューティング

### エラー: "Supabase環境変数が設定されていません"
- `.env.local` ファイルが正しく作成されているか確認
- 環境変数の名前が正確か確認（`NEXT_PUBLIC_` プレフィックスが必要）
- 開発サーバーを再起動

### エラー: "relation does not exist"
- `supabase/schema.sql` が正しく実行されたか確認
- Supabaseダッシュボードの「Table Editor」でテーブルが存在するか確認

### RLSエラー
- `supabase/schema.sql` で `DISABLE ROW LEVEL SECURITY` が実行されているか確認
- または、コメントアウトされたポリシーを有効化

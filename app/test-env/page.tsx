"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";

export default function TestEnvPage() {
  const [envStatus, setEnvStatus] = useState<{
    url: boolean;
    key: boolean;
    connection: boolean;
    error?: string;
  }>({
    url: false,
    key: false,
    connection: false,
  });

  useEffect(() => {
    let isMounted = true;

    // 環境変数の確認
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    const hasUrl = !!url && url !== "";
    const hasKey = !!key && key !== "";

    // 初期状態を設定
    if (isMounted) {
      setEnvStatus({
        url: hasUrl,
        key: hasKey,
        connection: false,
      });
    }

    // Supabase接続テスト
    if (hasUrl && hasKey && isMounted) {
      // 非同期関数で接続テストを実行
      const testConnection = async () => {
        try {
          const { error } = await supabase
            .from("expenses")
            .select("count")
            .limit(1);

          if (!isMounted) return;

          if (error) {
            setEnvStatus((prev) => ({
              ...prev,
              connection: false,
              error: error.message,
            }));
          } else {
            setEnvStatus((prev) => ({
              ...prev,
              connection: true,
            }));
          }
        } catch (err: unknown) {
          if (!isMounted) return;
          // エラーメッセージを取得（エラーオブジェクトの場合はメッセージを、それ以外の場合は文字列に変換）
          const errorMessage =
            err instanceof Error ? err.message : "接続エラーが発生しました";
          setEnvStatus((prev) => ({
            ...prev,
            connection: false,
            error: errorMessage,
          }));
        }
      };

      testConnection();
    }

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>環境変数設定確認</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div
                  className={`w-4 h-4 rounded-full ${
                    envStatus.url ? "bg-green-500" : "bg-red-500"
                  }`}
                />
                <span>
                  NEXT_PUBLIC_SUPABASE_URL:{" "}
                  {envStatus.url ? "✓ 設定済み" : "✗ 未設定"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div
                  className={`w-4 h-4 rounded-full ${
                    envStatus.key ? "bg-green-500" : "bg-red-500"
                  }`}
                />
                <span>
                  NEXT_PUBLIC_SUPABASE_ANON_KEY:{" "}
                  {envStatus.key ? "✓ 設定済み" : "✗ 未設定"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div
                  className={`w-4 h-4 rounded-full ${
                    envStatus.connection ? "bg-green-500" : "bg-red-500"
                  }`}
                />
                <span>
                  Supabase接続:{" "}
                  {envStatus.connection
                    ? "✓ 接続成功"
                    : envStatus.error
                    ? `✗ エラー: ${envStatus.error}`
                    : "✗ 接続失敗"}
                </span>
              </div>
            </div>

            {envStatus.url && envStatus.key && envStatus.connection && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-md text-green-700">
                ✓ すべて正常に設定されています！
              </div>
            )}

            {(!envStatus.url || !envStatus.key) && (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md text-yellow-700">
                ⚠️ 環境変数が設定されていません。
                <br />
                <code className="text-xs mt-2 block">
                  .env.localファイルに以下を設定してください：
                  <br />
                  NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
                  <br />
                  NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
                </code>
              </div>
            )}

            {envStatus.error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-700">
                <strong>エラー:</strong> {envStatus.error}
                <br />
                <span className="text-sm mt-2 block">
                  テーブルが作成されているか、Supabaseの設定を確認してください。
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

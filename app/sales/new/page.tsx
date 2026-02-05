"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createSupabaseClient } from "@/lib/supabase/client";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { User } from "@supabase/supabase-js";

export default function NewSalePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  // ログインユーザー情報を保持（RLSでユーザーごとのデータ分離に使用）
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    crop_name: "",
    customer: "",
    unit_price: "",
    quantity: "",
    amount: "",
    description: "",
  });

  // コンポーネント読み込み時にログインユーザー情報を取得
  useEffect(() => {
    const fetchUser = async () => {
      const supabase = createSupabaseClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setCurrentUser(user);
    };
    fetchUser();
  }, []);

  /**
   * 売上登録フォームの送信処理
   * 
   * ビジネス上の流れ:
   * 1. ログインユーザーのIDを取得
   * 2. 売上データにユーザーIDを付与してSupabaseに保存
   * 3. RLS（行レベルセキュリティ）により、このユーザーのみがこのデータにアクセス可能
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const supabase = createSupabaseClient();

      // ログインユーザー情報を再取得（セッション切れ対策）
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error("ログインが必要です。再度ログインしてください。");
      }

      // user_idを含めて売上データを登録
      // RLSにより、自分のuser_idでのみ登録が許可される
      const { error: supabaseError } = await supabase.from("sales").insert({
        user_id: user.id, // ログインユーザーのIDを付与
        date: formData.date,
        crop_name: formData.crop_name,
        customer: formData.customer,
        unit_price: formData.unit_price
          ? parseInt(formData.unit_price)
          : null,
        quantity: formData.quantity ? parseInt(formData.quantity) : null,
        amount: parseInt(formData.amount),
        description: formData.description || null,
      });

      if (supabaseError) {
        throw supabaseError;
      }

      setSuccess(true);
      setTimeout(() => {
        router.push("/dashboard");
      }, 1500);
    } catch (err: any) {
      setError(err.message || "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white shadow-sm">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/dashboard">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  戻る
                </Button>
              </Link>
              <h1 className="text-2xl font-bold text-green-600">
                AgriManagement
              </h1>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">売上を登録する</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* 日付 */}
                <div className="space-y-2">
                  <Label htmlFor="date">日付 *</Label>
                  <Input
                    id="date"
                    name="date"
                    type="date"
                    value={formData.date}
                    onChange={handleChange}
                    required
                    className="w-full"
                  />
                </div>

                {/* 作物名 */}
                <div className="space-y-2">
                  <Label htmlFor="crop_name">作物名 *</Label>
                  <Input
                    id="crop_name"
                    name="crop_name"
                    type="text"
                    value={formData.crop_name}
                    onChange={handleChange}
                    placeholder="例: トマト, キュウリ"
                    required
                    className="w-full"
                  />
                </div>

                {/* 出荷先/取引先 */}
                <div className="space-y-2">
                  <Label htmlFor="customer">出荷先/取引先 *</Label>
                  <Input
                    id="customer"
                    name="customer"
                    type="text"
                    value={formData.customer}
                    onChange={handleChange}
                    placeholder="例: 〇〇農協, 〇〇スーパー"
                    required
                    className="w-full"
                  />
                </div>

                {/* 単価（オプション） */}
                <div className="space-y-2">
                  <Label htmlFor="unit_price">単価（オプション）</Label>
                  <Input
                    id="unit_price"
                    name="unit_price"
                    type="number"
                    value={formData.unit_price}
                    onChange={handleChange}
                    placeholder="例: 500"
                    min="0"
                    className="w-full"
                  />
                </div>

                {/* 数量（オプション） */}
                <div className="space-y-2">
                  <Label htmlFor="quantity">数量（オプション）</Label>
                  <Input
                    id="quantity"
                    name="quantity"
                    type="number"
                    value={formData.quantity}
                    onChange={handleChange}
                    placeholder="例: 100"
                    min="0"
                    className="w-full"
                  />
                </div>

                {/* 売上総額 */}
                <div className="space-y-2">
                  <Label htmlFor="amount">売上総額 *</Label>
                  <Input
                    id="amount"
                    name="amount"
                    type="number"
                    value={formData.amount}
                    onChange={handleChange}
                    placeholder="例: 50000"
                    required
                    min="0"
                    className="w-full"
                  />
                </div>

                {/* 摘要/メモ */}
                <div className="space-y-2">
                  <Label htmlFor="description">摘要/メモ</Label>
                  <textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    placeholder="メモがあれば入力してください"
                    rows={4}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  />
                </div>

                {/* エラーメッセージ */}
                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
                    {error}
                  </div>
                )}

                {/* 成功メッセージ */}
                {success && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-md text-green-700 text-sm">
                    売上を登録しました。トップページに戻ります...
                  </div>
                )}

                {/* 送信ボタン */}
                <div className="flex gap-4">
                  <Button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                  >
                    {loading ? "登録中..." : "登録する"}
                  </Button>
                  <Link href="/dashboard" className="flex-1">
                    <Button type="button" variant="outline" className="w-full">
                      キャンセル
                    </Button>
                  </Link>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

"use client";

/**
 * 農場情報フォームコンポーネント
 *
 * ビジネス上の役割:
 * ユーザーの農場名と代表者名を登録・編集するフォーム
 * これらの情報は将来的に帳票やレポートの出力時に使用される
 */

import { useState, useEffect } from "react";
import { createSupabaseClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Save, Building2 } from "lucide-react";

/**
 * 農場プロフィールのデータ型
 */
interface UserProfile {
  id: string;
  userId: string;
  farmName: string;
  ownerName: string;
}

/**
 * コンポーネントのプロパティ
 */
interface UserProfileSectionProps {
  /** 現在ログイン中のユーザーID */
  userId: string;
}

export function UserProfileSection({ userId }: UserProfileSectionProps) {
  // フォームの入力値を管理
  const [farmName, setFarmName] = useState("");
  const [ownerName, setOwnerName] = useState("");

  // 既存のプロフィールID（更新時に使用）
  const [profileId, setProfileId] = useState<string | null>(null);

  // ローディング状態
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // メッセージ表示用
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  /**
   * コンポーネントマウント時にプロフィールを取得
   */
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setIsLoading(true);
        setErrorMessage(null);

        const supabase = createSupabaseClient();

        // ユーザーのプロフィールを取得（RLSで自分のデータのみ取得）
        const { data, error } = await supabase
          .from("user_profiles")
          .select("*")
          .eq("user_id", userId)
          .single();

        if (error && error.code !== "PGRST116") {
          // PGRST116: レコードが見つからない（新規ユーザーの場合は正常）
          throw error;
        }

        // プロフィールが存在する場合はフォームに反映
        if (data) {
          setProfileId(data.id);
          setFarmName(data.farm_name || "");
          setOwnerName(data.owner_name || "");
        }
      } catch (error) {
        console.error("プロフィール取得エラー:", error);
        setErrorMessage("プロフィールの読み込みに失敗しました");
      } finally {
        setIsLoading(false);
      }
    };

    if (userId) {
      fetchProfile();
    }
  }, [userId]);

  /**
   * プロフィールを保存する
   *
   * ビジネス上の流れ:
   * 1. 既存のプロフィールがある場合は更新（UPDATE）
   * 2. 新規の場合は作成（INSERT）
   * 3. 成功メッセージを表示
   */
  const handleSave = async () => {
    try {
      setIsSaving(true);
      setSuccessMessage(null);
      setErrorMessage(null);

      const supabase = createSupabaseClient();

      if (profileId) {
        // 既存プロフィールを更新
        const { error } = await supabase
          .from("user_profiles")
          .update({
            farm_name: farmName.trim() || null,
            owner_name: ownerName.trim() || null,
          })
          .eq("id", profileId);

        if (error) throw error;
      } else {
        // 新規プロフィールを作成
        const { data, error } = await supabase
          .from("user_profiles")
          .insert({
            user_id: userId,
            farm_name: farmName.trim() || null,
            owner_name: ownerName.trim() || null,
          })
          .select()
          .single();

        if (error) throw error;

        // 作成されたプロフィールIDを保存
        setProfileId(data.id);
      }

      setSuccessMessage("農場情報を保存しました");

      // 成功メッセージを3秒後に自動で消す
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      console.error("プロフィール保存エラー:", error);
      setErrorMessage("保存に失敗しました。再度お試しください。");
    } finally {
      setIsSaving(false);
    }
  };

  // ローディング中の表示
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Building2 className="h-5 w-5 text-green-600" />
            農場情報
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-green-600" />
            <span className="ml-2 text-gray-600">読み込み中...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Building2 className="h-5 w-5 text-green-600" />
          農場情報
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 成功メッセージ */}
        {successMessage && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-md text-green-700 text-sm">
            {successMessage}
          </div>
        )}

        {/* エラーメッセージ */}
        {errorMessage && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
            {errorMessage}
          </div>
        )}

        {/* 農場名入力 */}
        <div className="space-y-2">
          <Label htmlFor="farmName">農場名</Label>
          <Input
            id="farmName"
            type="text"
            placeholder="例：○○農園"
            value={farmName}
            onChange={(e) => setFarmName(e.target.value)}
            className="w-full"
          />
          <p className="text-xs text-gray-500">
            帳票やレポートに表示される農場の名称です
          </p>
        </div>

        {/* 代表者名入力 */}
        <div className="space-y-2">
          <Label htmlFor="ownerName">代表者名</Label>
          <Input
            id="ownerName"
            type="text"
            placeholder="例：山田太郎"
            value={ownerName}
            onChange={(e) => setOwnerName(e.target.value)}
            className="w-full"
          />
          <p className="text-xs text-gray-500">
            農場の代表者（経営者）のお名前です
          </p>
        </div>

        {/* 保存ボタン */}
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="w-full bg-green-600 hover:bg-green-700"
        >
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              保存中...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              保存する
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

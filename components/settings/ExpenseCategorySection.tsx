"use client";

/**
 * 勘定科目管理コンポーネント
 *
 * ビジネス上の役割:
 * ユーザーが経費を登録する際に選択する勘定科目のマスタを管理する
 * 固定費と変動費の区分を設け、一覧表示・追加・編集・削除・初期リセットができる
 *
 * 構造:
 * - このファイル: 状態管理とビジネスロジック
 * - expense-category/: UIを担当するサブコンポーネント群
 */

import { useState, useEffect, useCallback } from "react";
import { createSupabaseClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tags } from "lucide-react";

// サブコンポーネント（UIを担当）
import {
  MessageAlerts,
  ActionButtons,
  AddCategoryForm,
  CategoryTable,
  EmptyState,
  LoadingState,
} from "./expense-category";

// 型定義
import type { ExpenseCategory } from "./expense-category";

/**
 * コンポーネントのプロパティ
 */
interface ExpenseCategorySectionProps {
  /** 現在ログイン中のユーザーID */
  userId: string;
}

export function ExpenseCategorySection({
  userId,
}: ExpenseCategorySectionProps) {
  // ========================================
  // 状態管理
  // ========================================

  // 勘定科目一覧
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);

  // ローディング状態
  const [isLoading, setIsLoading] = useState(true);
  const [isResetting, setIsResetting] = useState(false);

  // 新規追加フォームの状態
  const [isAdding, setIsAdding] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryType, setNewCategoryType] = useState<"fixed" | "variable">(
    "fixed"
  );
  const [isSavingNew, setIsSavingNew] = useState(false);

  // 編集中の科目
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editCategoryType, setEditCategoryType] = useState<
    "fixed" | "variable"
  >("fixed");
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // 削除中の科目ID
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // メッセージ
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // ========================================
  // データ取得
  // ========================================

  /**
   * 勘定科目一覧を取得する
   */
  const fetchCategories = useCallback(async () => {
    try {
      setIsLoading(true);
      setErrorMessage(null);

      const supabase = createSupabaseClient();

      // RLSで自分の勘定科目のみ取得、表示順でソート
      const { data, error } = await supabase
        .from("expense_categories")
        .select("*")
        .eq("user_id", userId)
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (error) throw error;

      // データを整形
      const formattedCategories: ExpenseCategory[] =
        data?.map((item) => ({
          id: item.id,
          userId: item.user_id,
          name: item.name,
          categoryType: item.category_type as "fixed" | "variable",
          displayOrder: item.display_order,
          isActive: item.is_active,
        })) || [];

      setCategories(formattedCategories);
    } catch (error) {
      console.error("勘定科目取得エラー:", error);
      setErrorMessage("勘定科目の読み込みに失敗しました");
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  // 初回読み込み
  useEffect(() => {
    if (userId) {
      fetchCategories();
    }
  }, [userId, fetchCategories]);

  // ========================================
  // ヘルパー関数
  // ========================================

  /**
   * 成功メッセージを表示（3秒後に自動で消す）
   */
  const showSuccessMessage = (message: string) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  // ========================================
  // イベントハンドラー: 新規追加
  // ========================================

  /**
   * 新しい勘定科目を追加する
   */
  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      setErrorMessage("科目名を入力してください");
      return;
    }

    try {
      setIsSavingNew(true);
      setErrorMessage(null);

      const supabase = createSupabaseClient();

      // 現在の最大表示順を取得して+1
      const maxOrder = Math.max(0, ...categories.map((c) => c.displayOrder));

      const { error } = await supabase.from("expense_categories").insert({
        user_id: userId,
        name: newCategoryName.trim(),
        category_type: newCategoryType,
        display_order: maxOrder + 1,
        is_active: true,
      });

      if (error) {
        // 重複エラーの場合
        if (error.code === "23505") {
          setErrorMessage("同じ名前の科目が既に存在します");
          return;
        }
        throw error;
      }

      // フォームをリセットして一覧を再取得
      setNewCategoryName("");
      setNewCategoryType("fixed");
      setIsAdding(false);
      await fetchCategories();
      showSuccessMessage("勘定科目を追加しました");
    } catch (error) {
      console.error("勘定科目追加エラー:", error);
      setErrorMessage("追加に失敗しました。再度お試しください。");
    } finally {
      setIsSavingNew(false);
    }
  };

  /**
   * 追加フォームをキャンセルする
   */
  const handleCancelAdd = () => {
    setIsAdding(false);
    setNewCategoryName("");
    setNewCategoryType("fixed");
  };

  // ========================================
  // イベントハンドラー: 編集
  // ========================================

  /**
   * 編集モードを開始
   */
  const startEditing = (category: ExpenseCategory) => {
    setEditingId(category.id);
    setEditName(category.name);
    setEditCategoryType(category.categoryType);
  };

  /**
   * 編集をキャンセル
   */
  const cancelEditing = () => {
    setEditingId(null);
    setEditName("");
    setEditCategoryType("fixed");
  };

  /**
   * 勘定科目を更新する
   */
  const handleUpdateCategory = async () => {
    if (!editName.trim() || !editingId) {
      setErrorMessage("科目名を入力してください");
      return;
    }

    try {
      setIsSavingEdit(true);
      setErrorMessage(null);

      const supabase = createSupabaseClient();

      const { error } = await supabase
        .from("expense_categories")
        .update({
          name: editName.trim(),
          category_type: editCategoryType,
        })
        .eq("id", editingId);

      if (error) {
        if (error.code === "23505") {
          setErrorMessage("同じ名前の科目が既に存在します");
          return;
        }
        throw error;
      }

      cancelEditing();
      await fetchCategories();
      showSuccessMessage("勘定科目を更新しました");
    } catch (error) {
      console.error("勘定科目更新エラー:", error);
      setErrorMessage("更新に失敗しました。再度お試しください。");
    } finally {
      setIsSavingEdit(false);
    }
  };

  // ========================================
  // イベントハンドラー: 削除
  // ========================================

  /**
   * 勘定科目を削除する（論理削除: is_activeをfalseに）
   */
  const handleDeleteCategory = async (categoryId: string) => {
    // 確認ダイアログ
    if (!confirm("この勘定科目を削除しますか？")) {
      return;
    }

    try {
      setDeletingId(categoryId);
      setErrorMessage(null);

      const supabase = createSupabaseClient();

      // 論理削除（is_activeをfalseに設定）
      const { error } = await supabase
        .from("expense_categories")
        .update({ is_active: false })
        .eq("id", categoryId);

      if (error) throw error;

      await fetchCategories();
      showSuccessMessage("勘定科目を削除しました");
    } catch (error) {
      console.error("勘定科目削除エラー:", error);
      setErrorMessage("削除に失敗しました。再度お試しください。");
    } finally {
      setDeletingId(null);
    }
  };

  // ========================================
  // イベントハンドラー: 初期リセット
  // ========================================

  /**
   * デフォルト勘定科目にリセットする
   *
   * ビジネス上の流れ:
   * 1. 確認ダイアログを表示
   * 2. データベースの関数を呼び出してデフォルト科目を投入
   * 3. 一覧を再取得
   */
  const handleResetToDefault = async () => {
    // 確認ダイアログ
    if (
      !confirm(
        "すべての勘定科目を初期状態にリセットしますか？\n現在の科目はすべて削除されます。"
      )
    ) {
      return;
    }

    try {
      setIsResetting(true);
      setErrorMessage(null);

      const supabase = createSupabaseClient();

      // データベースの関数を呼び出してデフォルト勘定科目を投入
      const { error } = await supabase.rpc("insert_default_expense_categories", {
        target_user_id: userId,
      });

      if (error) throw error;

      await fetchCategories();
      showSuccessMessage("勘定科目を初期状態にリセットしました");
    } catch (error) {
      console.error("初期リセットエラー:", error);
      setErrorMessage("リセットに失敗しました。再度お試しください。");
    } finally {
      setIsResetting(false);
    }
  };

  // ========================================
  // レンダリング
  // ========================================

  // ローディング中の表示
  if (isLoading) {
    return <LoadingState />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Tags className="h-5 w-5 text-green-600" />
          勘定科目管理
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* メッセージエリア */}
        <MessageAlerts
          successMessage={successMessage}
          errorMessage={errorMessage}
        />

        {/* アクションボタン（追加・リセット） */}
        <ActionButtons
          onAddClick={() => setIsAdding(true)}
          onResetClick={handleResetToDefault}
          isAdding={isAdding}
          isResetting={isResetting}
        />

        {/* 新規追加フォーム */}
        {isAdding && (
          <AddCategoryForm
            name={newCategoryName}
            categoryType={newCategoryType}
            isSaving={isSavingNew}
            onNameChange={setNewCategoryName}
            onCategoryTypeChange={setNewCategoryType}
            onSubmit={handleAddCategory}
            onCancel={handleCancelAdd}
          />
        )}

        {/* 勘定科目一覧 or 空状態 */}
        {categories.length === 0 ? (
          <EmptyState />
        ) : (
          <CategoryTable
            categories={categories}
            editingId={editingId}
            editState={{ name: editName, categoryType: editCategoryType }}
            onEditChange={{
              setName: setEditName,
              setCategoryType: setEditCategoryType,
            }}
            onStartEdit={startEditing}
            onCancelEdit={cancelEditing}
            onUpdateCategory={handleUpdateCategory}
            onDeleteCategory={handleDeleteCategory}
            isSavingEdit={isSavingEdit}
            deletingId={deletingId}
          />
        )}

        {/* 説明テキスト */}
        <p className="text-xs text-gray-500">
          ※ 勘定科目は経費登録時の選択肢として表示されます。固定費は毎月発生する経費、変動費は売上に連動する経費を指します。
        </p>
      </CardContent>
    </Card>
  );
}

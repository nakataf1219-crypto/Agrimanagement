"use client";

/**
 * 経費登録フォームのロジックを管理するカスタムフック
 * 
 * 責務:
 * - フォーム状態の管理（入力値、エラー、成功状態など）
 * - 勘定科目マスタの取得
 * - OCRパラメータの読み込みとフォームへの自動セット
 * - フォーム送信処理（バリデーション、DB保存）
 * 
 * ビジネス上の流れ:
 * 1. ページ読み込み時に勘定科目マスタを取得
 * 2. URLパラメータにOCRデータがあれば自動入力
 * 3. ユーザーが入力・修正
 * 4. 送信ボタンで経費データをDBに保存
 */

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import type { ExpenseFormData, ExpenseCategory, UseExpenseFormReturn } from "../types";

/**
 * 今日の日付をYYYY-MM-DD形式で取得するヘルパー関数
 */
const getTodayString = (): string => new Date().toISOString().split("T")[0];

/**
 * フォームの初期値
 */
const INITIAL_FORM_DATA: ExpenseFormData = {
  date: getTodayString(),
  categoryId: "",
  categoryName: "",
  amount: "",
  description: "",
};

/**
 * 経費登録フォームのカスタムフック
 * 
 * 使用例:
 * ```
 * const { formData, handleSubmit, loading, error } = useExpenseForm();
 * ```
 */
export function useExpenseForm(): UseExpenseFormReturn {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // === 状態定義 ===
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isOcrFilled, setIsOcrFilled] = useState(false);
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [ocrSuggestedCategory, setOcrSuggestedCategory] = useState<string | null>(null);
  const [formData, setFormData] = useState<ExpenseFormData>(INITIAL_FORM_DATA);

  // === 初期化処理 ===
  useEffect(() => {
    initializeForm();
  }, [searchParams]);

  /**
   * フォーム初期化処理
   * 
   * 実行順序:
   * 1. ログインユーザーを取得
   * 2. 勘定科目マスタをDBから取得
   * 3. URLパラメータからOCRデータを読み込み、フォームに自動セット
   */
  async function initializeForm(): Promise<void> {
    const supabase = createSupabaseClient();
    
    // ステップ1: ユーザー取得
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUser(user);

    // 未ログインの場合は勘定科目取得をスキップ
    if (!user) {
      setCategoriesLoading(false);
      return;
    }

    // ステップ2: 勘定科目取得
    const categories = await fetchExpenseCategories(supabase, user.id);
    setExpenseCategories(categories);
    setCategoriesLoading(false);

    // ステップ3: OCRパラメータ適用
    applyOcrParameters(categories);
  }

  /**
   * 勘定科目マスタをDBから取得
   * 
   * @param supabase - Supabaseクライアント
   * @param userId - ユーザーID（RLSによるフィルタリング用）
   * @returns 有効な勘定科目の配列
   */
  async function fetchExpenseCategories(
    supabase: ReturnType<typeof createSupabaseClient>,
    userId: string
  ): Promise<ExpenseCategory[]> {
    const { data, error: fetchError } = await supabase
      .from("expense_categories")
      .select("id, name, category_type")
      .eq("user_id", userId)
      .eq("is_active", true)
      .order("display_order", { ascending: true });

    if (fetchError) {
      console.error("勘定科目の取得に失敗:", fetchError);
      return [];
    }
    return data || [];
  }

  /**
   * OCRからのURLパラメータをフォームに適用
   * 
   * URLパラメータ例:
   * ?date=2024-01-15&amount=3000&category=肥料費&description=春用肥料
   * 
   * @param categories - マッチング用の勘定科目リスト
   */
  function applyOcrParameters(categories: ExpenseCategory[]): void {
    // URLパラメータを取得
    const dateParam = searchParams.get("date");
    const amountParam = searchParams.get("amount");
    const categoryParam = searchParams.get("category");
    const descriptionParam = searchParams.get("description");

    // パラメータが1つもなければ何もしない
    const hasOcrData = dateParam || amountParam || categoryParam || descriptionParam;
    if (!hasOcrData) return;

    // OCRから自動入力されたことを示すフラグをON
    setIsOcrFilled(true);
    
    // OCRで推測された科目名を保存（表示用）
    if (categoryParam) {
      setOcrSuggestedCategory(categoryParam);
    }

    // 科目名のマッチング処理
    const { matchedId, matchedName } = matchCategory(categoryParam, categories);

    // フォームに値をセット
    setFormData({
      date: dateParam || getTodayString(),
      categoryId: matchedId,
      categoryName: matchedName,
      amount: amountParam || "",
      description: descriptionParam || "",
    });
  }

  /**
   * OCRの科目名を勘定科目マスタとマッチング
   * 
   * マッチング優先順位:
   * 1. 完全一致（例: "肥料費" === "肥料費"）
   * 2. 部分一致（例: "肥料" が "肥料費" に含まれる）
   * 
   * @param ocrCategory - OCRで推測された科目名
   * @param categories - 勘定科目マスタの配列
   * @returns マッチした科目のIDと名前
   */
  function matchCategory(
    ocrCategory: string | null,
    categories: ExpenseCategory[]
  ): { matchedId: string; matchedName: string } {
    // 科目名がない、または勘定科目がない場合は空を返す
    if (!ocrCategory || categories.length === 0) {
      return { matchedId: "", matchedName: "" };
    }

    // 完全一致を試みる
    const exactMatch = categories.find(category => category.name === ocrCategory);
    if (exactMatch) {
      return { matchedId: exactMatch.id, matchedName: exactMatch.name };
    }

    // 部分一致を試みる（どちらかがどちらかを含む）
    const partialMatch = categories.find(
      category => 
        category.name.includes(ocrCategory) || 
        ocrCategory.includes(category.name)
    );
    if (partialMatch) {
      return { matchedId: partialMatch.id, matchedName: partialMatch.name };
    }

    // マッチしなかった場合は空を返す
    return { matchedId: "", matchedName: "" };
  }

  // === イベントハンドラー ===

  /**
   * テキスト入力フィールドの変更処理
   * 日付、金額、摘要の入力に使用
   */
  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ): void => {
    const { name, value } = event.target;
    setFormData(previousData => ({ ...previousData, [name]: value }));
  };

  /**
   * 勘定科目ドロップダウンの選択処理
   * 選択された科目のIDと名前を両方保存する
   */
  const handleCategorySelect = (event: React.ChangeEvent<HTMLSelectElement>): void => {
    const selectedId = event.target.value;
    
    // 「選択してください」が選ばれた場合は空にリセット
    if (selectedId === "") {
      setFormData(previousData => ({
        ...previousData,
        categoryId: "",
        categoryName: "",
      }));
      return;
    }

    // 選択された科目の情報を取得
    const selectedCategory = expenseCategories.find(
      category => category.id === selectedId
    );
    
    setFormData(previousData => ({
      ...previousData,
      categoryId: selectedId,
      categoryName: selectedCategory?.name || "",
    }));
  };

  /**
   * フォーム送信処理
   * 
   * ビジネス上の流れ:
   * 1. ログインユーザーのIDを再取得（セッション切れ対策）
   * 2. 入力バリデーション（勘定科目が選択されているか）
   * 3. 経費データにユーザーID、科目ID、科目名を付与してSupabaseに保存
   * 4. 成功したらダッシュボードに遷移
   */
  const handleSubmit = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const supabase = createSupabaseClient();
      
      // ログインユーザー情報を再取得（セッション切れ対策）
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error("ログインが必要です。再度ログインしてください。");
      }

      // 勘定科目が選択されているか確認
      if (!formData.categoryId || !formData.categoryName) {
        throw new Error("勘定科目を選択してください。");
      }

      // 経費データをDBに保存
      // RLSにより、自分のuser_idでのみ登録が許可される
      const { error: insertError } = await supabase.from("expenses").insert({
        user_id: user.id,
        date: formData.date,
        category_id: formData.categoryId,    // 勘定科目マスタとの紐付け
        category: formData.categoryName,     // 科目名（後方互換性のため）
        amount: parseInt(formData.amount),
        description: formData.description || null,
      });

      if (insertError) {
        throw insertError;
      }

      // 成功処理
      setSuccess(true);
      
      // 1.5秒後にダッシュボードに遷移
      setTimeout(() => {
        router.push("/dashboard");
      }, 1500);
      
    } catch (caughtError: unknown) {
      // エラーメッセージを抽出して設定
      const errorMessage = caughtError instanceof Error 
        ? caughtError.message 
        : "エラーが発生しました";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // フックの戻り値
  return {
    formData,
    loading,
    error,
    success,
    isOcrFilled,
    expenseCategories,
    categoriesLoading,
    ocrSuggestedCategory,
    handleChange,
    handleCategorySelect,
    handleSubmit,
  };
}

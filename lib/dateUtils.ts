/**
 * 年月選択に関する再利用可能なユーティリティ関数
 * グラフ機能で年月範囲を選択する際に使用
 */

export type YearMonthOption = {
  year: number;
  month: number;
  label: string;
  value: string;
};

export type MonthRange = {
  startDate: string;
  endDate: string;
  monthKey: string;
  monthLabel: string;
};

/**
 * 利用可能な年月のオプションを生成（過去N年分）
 * @param yearsBack 過去何年分のデータを生成するか（デフォルト: 5年）
 * @returns 年月オプションの配列（新しい順）
 */
export function getYearMonthOptions(yearsBack: number = 5): YearMonthOption[] {
  const options: YearMonthOption[] = [];
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  
  // 過去N年分の年月を生成
  for (let year = currentYear; year >= currentYear - yearsBack; year--) {
    const maxMonth = year === currentYear ? currentMonth : 12;
    for (let month = maxMonth; month >= 1; month--) {
      const value = `${year}-${String(month).padStart(2, "0")}`;
      const label = `${year}年${month}月`;
      options.push({ year, month, label, value });
    }
  }
  
  return options;
}

/**
 * 選択された年月範囲に基づいて月次データの範囲を取得
 * @param startYear 開始年
 * @param startMonth 開始月（1-12）
 * @param endYear 終了年
 * @param endMonth 終了月（1-12）
 * @returns 月次データの範囲配列
 */
export function getMonthRange(
  startYear: number,
  startMonth: number,
  endYear: number,
  endMonth: number
): MonthRange[] {
  const ranges: MonthRange[] = [];
  
  // 開始年月から終了年月までループ
  let currentYear = startYear;
  let currentMonth = startMonth;
  
  while (
    currentYear < endYear || 
    (currentYear === endYear && currentMonth <= endMonth)
  ) {
    const startDate = new Date(currentYear, currentMonth - 1, 1).toISOString().split("T")[0];
    const endDate = new Date(currentYear, currentMonth, 0).toISOString().split("T")[0];
    const monthKey = `${currentYear}-${String(currentMonth).padStart(2, "0")}`;
    const monthLabel = `${currentYear}年${currentMonth}月`;

    ranges.push({ startDate, endDate, monthKey, monthLabel });
    
    // 次の月に進む
    currentMonth++;
    if (currentMonth > 12) {
      currentMonth = 1;
      currentYear++;
    }
  }

  return ranges;
}

/**
 * 過去Nヶ月の初期年月範囲を取得
 * @param monthsBack 過去何ヶ月分（デフォルト: 6ヶ月）
 * @returns 初期年月範囲
 */
export function getInitialDateRange(monthsBack: number = 6) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  
  // 過去Nヶ月前の年月を計算
  let startYear = currentYear;
  let startMonth = currentMonth - (monthsBack - 1);
  if (startMonth <= 0) {
    const yearsBack = Math.ceil(Math.abs(startMonth) / 12);
    startMonth += yearsBack * 12;
    startYear -= yearsBack;
  }
  
  return {
    startYear,
    startMonth,
    endYear: currentYear,
    endMonth: currentMonth,
  };
}

/**
 * 年月の文字列（"YYYY-MM"）を年と月に分割
 * @param yearMonthString "YYYY-MM"形式の文字列
 * @returns { year: number, month: number }
 */
export function parseYearMonth(yearMonthString: string): { year: number; month: number } {
  const [year, month] = yearMonthString.split("-").map(Number);
  return { year, month };
}

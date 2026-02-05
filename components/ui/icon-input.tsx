/**
 * アイコン付き入力フィールド
 *
 * ビジネス上の役割：
 * - 入力フィールドの左側にアイコンを表示して、入力内容を視覚的にわかりやすくする
 * - 例：メールアドレス欄にメールアイコン、パスワード欄に鍵アイコン
 */

import { LucideIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ComponentProps } from "react";

type IconInputProps = ComponentProps<typeof Input> & {
  /** 左側に表示するアイコン（lucide-reactのアイコン） */
  icon: LucideIcon;
};

export function IconInput({ icon: Icon, className, ...inputProps }: IconInputProps) {
  return (
    <div className="relative">
      <Icon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input {...inputProps} className={`pl-10 ${className || ""}`} />
    </div>
  );
}

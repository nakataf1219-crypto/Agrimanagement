/**
 * ローディング状態を表示するコンポーネント
 *
 * ビジネス上の役割:
 * データ取得中にユーザーに「読み込み中」であることを知らせる
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Tags } from "lucide-react";

export function LoadingState() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Tags className="h-5 w-5 text-green-600" />
          勘定科目管理
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

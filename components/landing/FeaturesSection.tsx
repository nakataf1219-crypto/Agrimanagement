import type { SVGProps } from "react";
import { FileText, LineChart, MessageCircleMore, Receipt } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

/**
 * 機能紹介セクション
 *
 * ビジネス上の役割：
 * - 農業経営でよくある悩み（入力の手間・集計の大変さなど）に対して、
 *   本サービスのどの機能が役立つのかを具体的に説明する
 */
export function FeaturesSection() {
  // 表示する機能一覧を配列で管理することで、将来的な文言変更や追加をしやすくする
  const featureItems: FeatureItem[] = [
    {
      icon: Receipt,
      title: "レシートを撮るだけで仕訳",
      description:
        "レシートをスマホやPCでアップロードすると、自動で日付・金額・科目を読み取り、経費として整理します。手書きでの入力作業を減らせます。",
    },
    {
      icon: FileText,
      title: "経費・売上を一元管理",
      description:
        "肥料代・資材費・人件費などの経費と、作物ごとの売上を一つの画面で管理できます。どの作物がどれだけ利益を出しているかを可視化します。",
    },
    {
      icon: LineChart,
      title: "グラフで収支を見える化",
      description:
        "月ごとの売上推移や経費の内訳をグラフで表示します。どの時期にお金が出入りしているかが分かり、投資やコスト削減の判断に役立ちます。",
    },
    {
      icon: MessageCircleMore,
      title: "AIアシスタントが経営をサポート",
      description:
        "「今年の肥料代は昨年と比べてどうか」「どこを削減できそうか」など、経営に関する質問を日本語で相談できます。数字の読み解きをサポートします。",
    },
  ];

  return (
    <section className="border-t bg-white">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl">
            農業経営に必要な機能を、これひとつに
          </h2>
          <p className="mt-3 text-sm text-gray-600 sm:text-base">
            日々のレシート整理から月次の収支確認まで、
            現場の感覚を数字で支えるための機能を揃えています。
          </p>
        </div>

        {/* 機能カード一覧：1カード = 1つの悩みと解決策を表現 */}
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {featureItems.map((featureItem) => (
            <FeatureCard
              key={featureItem.title}
              icon={featureItem.icon}
              title={featureItem.title}
              description={featureItem.description}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

/**
 * 機能カード1つ分の情報を表す型
 * - icon: カード左上に表示するアイコン
 * - title: 機能名（ユーザーにとっての分かりやすい言葉）
 * - description: その機能でどんな悩みを解決できるかの説明
 */
type FeatureItem = {
  icon: (props: SVGProps<SVGSVGElement>) => JSX.Element;
  title: string;
  description: string;
};

type FeatureCardProps = FeatureItem;

/**
 * 機能カードコンポーネント
 *
 * 1枚のカードが「1つの機能とその効果」を説明する役割を持つ
 */
function FeatureCard({ icon: Icon, title, description }: FeatureCardProps) {
  return (
    <Card className="h-full border-gray-100 shadow-sm">
      <CardContent className="p-6">
        <div className="inline-flex rounded-full bg-green-50 p-3 text-green-600">
          <Icon className="h-5 w-5" />
        </div>
        <h3 className="mt-4 text-base font-semibold text-gray-900">{title}</h3>
        <p className="mt-2 text-sm text-gray-600">{description}</p>
      </CardContent>
    </Card>
  );
}


import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";

/**
 * 管理画面の一覧で「登録日時 / 更新日時」を昇順・降順で並べ替えるコントロール。
 *
 * 各ボタンはトグル: 非選択なら降順で選択、選択中ならクリックで asc⇄desc 反転。
 * 並び替え方向はアイコンで示す (未選択=ArrowUpDown / 昇順=ArrowUp / 降順=ArrowDown)。
 * backend は ?sort=created_at|updated_at & ?order=asc|desc を受ける (SortsListByDate)。
 */
export type SortField = "created_at" | "updated_at" | "access_rank";
export type SortOrder = "asc" | "desc";
export interface SortState {
  sort: SortField;
  order: SortOrder;
}

const LABELS: Record<SortField, string> = {
  created_at: "登録日時",
  updated_at: "更新日時",
  access_rank: "アクセス数",
};

export function SortControl({
  value,
  onChange,
  fields = ["created_at", "updated_at"],
}: {
  value: SortState;
  onChange: (next: SortState) => void;
  fields?: SortField[];
}) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-[11px] text-muted-foreground mr-0.5">並び替え</span>
      {fields.map((field) => {
        const active = value.sort === field;
        const Icon = !active ? ArrowUpDown : value.order === "asc" ? ArrowUp : ArrowDown;
        return (
          <button
            key={field}
            type="button"
            onClick={() =>
              onChange(
                active
                  ? { sort: field, order: value.order === "asc" ? "desc" : "asc" }
                  : { sort: field, order: "desc" },
              )
            }
            aria-pressed={active}
            title={`${LABELS[field]}で並べ替え（${active ? (value.order === "asc" ? "昇順" : "降順") : "クリックで降順"}）`}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[12px] border transition ${
              active
                ? "border-gray-300 bg-gray-50 text-gray-900"
                : "border-transparent text-gray-500 hover:bg-gray-50 hover:text-gray-700"
            }`}
          >
            {LABELS[field]}
            <Icon className="w-3.5 h-3.5" />
          </button>
        );
      })}
    </div>
  );
}

export default SortControl;

import { Fragment, useEffect, useState } from "react";
import {
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  Eye,
  ExternalLink,
  Link2,
  Loader2,
  MousePointerClick,
  Pencil,
  Percent,
  Plus,
  Route,
  Search,
  Trash2,
  UserPlus,
} from "lucide-react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Badge } from "~/components/ui/badge";
import { Skeleton } from "~/components/ui/skeleton";
import { api } from "~/lib/api";
import type {
  AnalyticsBreakdown,
  AnalyticsBreakdownRow,
  AnalyticsOverview,
  AnalyticsRankRow,
  TrackingLink,
} from "~/lib/types";

type RankDimension = "store" | "area" | "column";

/** source キー → 管理者向けの日本語ラベル（画面・配置名）。 */
const SOURCE_LABELS: Record<string, string> = {
  "tab:bottom": "下タブ",
  "fab:line": "右下FAB",
  "top:chat-end": "トップ:チャット末尾",
  "store-detail:chat-inline": "店舗詳細:チャット内",
  "store-detail:docs-inline": "店舗詳細:必要書類",
  "store-detail:map-card": "店舗詳細:地図",
  "store-detail:bottom-card": "店舗詳細:下部カード",
  "store-detail:floating": "店舗詳細:フローティング",
  "store-detail:compare-result": "比較結果",
  "store-detail:chat-end": "店舗詳細:チャット末尾",
  "column:end": "コラム末尾",
  "relocate:end": "上京ページ末尾",
  "chat:line-cta": "AIチャット",
  "contact-page": "問い合わせ",
  affiliate: "外部リンク(発行)",
};

function sourceLabel(source: string): string {
  return SOURCE_LABELS[source] ?? source;
}

const DAY_OPTIONS: { value: number; label: string }[] = [
  { value: 7, label: "7日" },
  { value: 30, label: "30日" },
  { value: 90, label: "90日" },
  { value: 365, label: "1年" },
];

type RankTab = "stores" | "areas" | "columns" | "routes";

const RANK_TABS: { key: RankTab; label: string }[] = [
  { key: "stores", label: "店舗" },
  { key: "areas", label: "エリア" },
  { key: "columns", label: "コラム" },
  { key: "routes", label: "LINE導線（画面別）" },
];

function nf(n: number): string {
  return n.toLocaleString("ja-JP");
}

/**
 * アクセス解析セクション（FB 2026-06-05 A2-A4）。
 *
 * 旧「エリア別/カテゴリ別 公開店舗数」分布チャートの置き換え。
 * - 店舗/エリア/コラム別アクセスランキング（PV・LINE追加クリック・CV率）
 * - LINE追加クリックの経路ランキング
 * - 計測リンク（アフィリエイト/店舗別LINE導線/SNS）の発行・コピー
 *
 * 注: 「LINE追加クリック」は intent（CTAクリック）であり、友だち追加「実績」
 * (line_friends) は LINE 仕様上ブラウザ経路と紐付かないため別指標として表示する。
 */
export function AnalyticsSection() {
  const [days, setDays] = useState(30);
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<RankTab>("stores");

  useEffect(() => {
    let alive = true;
    setLoading(true);
    api
      .get<AnalyticsOverview>(`/admin/analytics/overview?days=${days}`)
      .then((res) => alive && setOverview(res))
      .catch(() => alive && setOverview(null))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [days]);

  const summary = overview?.summary;
  const tabCount = (key: RankTab): number =>
    key === "routes" ? overview?.line_routes?.length ?? 0 : overview?.[key]?.length ?? 0;

  return (
    <div className="space-y-5">
      {/* Page header + range selector */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-foreground" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700 }}>
            アクセス解析
          </h2>
          <p className="text-[13px] text-muted-foreground mt-0.5 max-w-2xl">
            PV・LINE導線・CV率を店舗 / エリア / コラム別に。「LINE導線」はCTAの押下（どの画面から進んだか）で、
            実際の友だち追加とは別。友だち追加の実数は右端のカードに全体数で出る（LINE仕様で経路別には割れない）。
          </p>
        </div>
        <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5 shrink-0">
          {DAY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setDays(opt.value)}
              className={`px-3 py-1.5 text-[12px] rounded-md transition-colors ${
                days === opt.value
                  ? "bg-card shadow-sm font-medium"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <SummaryCard label="PV（期間内）" value={summary ? nf(summary.pv) : "—"} icon={Eye} accent="#6366f1" loading={loading} />
        <SummaryCard
          label="LINE導線クリック"
          value={summary ? nf(summary.line_clicks) : "—"}
          hint="CTA押下（実追加ではない）"
          icon={MousePointerClick}
          accent="#06c755"
          loading={loading}
        />
        <SummaryCard
          label="導線CV率"
          value={summary ? `${summary.cv_rate}%` : "—"}
          hint="導線クリック ÷ PV"
          icon={Percent}
          accent="#059669"
          loading={loading}
        />
        <SummaryCard
          label="友だち追加 実績"
          value={summary ? nf(summary.line_friends_total) : "—"}
          hint={summary ? `期間内 +${nf(summary.line_friends_in_range)}（全体）` : "公式アカ追加・全体"}
          icon={UserPlus}
          accent="#06c755"
          loading={loading}
        />
      </div>

      {/* Rankings */}
      <div className="bg-card border border-border rounded-xl p-4 sm:p-5">
        <div className="flex items-center gap-1 border-b border-border mb-3 overflow-x-auto">
          {RANK_TABS.map((t) => {
            const active = tab === t.key;
            const count = tabCount(t.key);
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={`px-3 py-2 text-[12px] -mb-px border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                  active ? "border-foreground font-medium" : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {t.label}
                {!loading && count > 0 && (
                  <span className={`text-[10px] px-1.5 rounded-full tabular-nums ${active ? "bg-foreground text-background" : "bg-muted text-muted-foreground"}`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        ) : tab === "routes" ? (
          <RouteTable rows={overview?.line_routes ?? []} />
        ) : (
          <RankTable
            rows={overview?.[tab] ?? []}
            unit={tab === "areas" ? "エリア" : tab === "columns" ? "コラム" : "店舗"}
            dimension={tab === "areas" ? "area" : tab === "columns" ? "column" : "store"}
            days={days}
          />
        )}
      </div>

      {/* Tracking links */}
      <div className="bg-card border border-border rounded-xl p-4 sm:p-5">
        <TrackingLinks />
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  hint,
  loading,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  hint?: string;
  loading: boolean;
  icon?: typeof Eye;
  accent?: string;
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] text-muted-foreground">{label}</p>
        {Icon && (
          <div className="size-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${accent}14` }}>
            <Icon className="size-3.5" style={{ color: accent }} />
          </div>
        )}
      </div>
      {loading ? (
        <Skeleton className="h-7 w-20 mt-2" />
      ) : (
        <p className="text-2xl font-semibold mt-1.5 tabular-nums">{value}</p>
      )}
      {hint && <p className="text-[10.5px] text-muted-foreground mt-1">{hint}</p>}
    </div>
  );
}

function RankTable({
  rows,
  unit,
  dimension,
  days,
}: {
  rows: AnalyticsRankRow[];
  unit: string;
  dimension: RankDimension;
  days: number;
}) {
  // 展開中の行キーと、画面別内訳のキャッシュ（"loading" or 行配列）。
  const [expanded, setExpanded] = useState<string | null>(null);
  const [cache, setCache] = useState<Record<string, AnalyticsBreakdownRow[] | "loading">>({});
  const [search, setSearch] = useState("");

  // 期間 / ディメンション変更時は展開・キャッシュ・検索をリセット。
  useEffect(() => {
    setExpanded(null);
    setCache({});
    setSearch("");
  }, [dimension, days]);

  const rowKey = (row: AnalyticsRankRow) => String(row.id ?? row.name);

  const toggle = (row: AnalyticsRankRow) => {
    const key = rowKey(row);
    if (expanded === key) {
      setExpanded(null);
      return;
    }
    setExpanded(key);
    if (!cache[key]) {
      setCache((c) => ({ ...c, [key]: "loading" }));
      api
        .get<AnalyticsBreakdown>(
          `/admin/analytics/breakdown?type=${dimension}&key=${encodeURIComponent(key)}&days=${days}`,
        )
        .then((res) => setCache((c) => ({ ...c, [key]: res.rows })))
        .catch(() => setCache((c) => ({ ...c, [key]: [] })));
    }
  };

  if (rows.length === 0) {
    return <EmptyRows message={`${unit}のアクセスデータがまだありません`} />;
  }

  // 順位（PV降順の元の並び）は保ったまま検索で絞り込む。
  const q = search.trim().toLowerCase();
  const ranked = rows.map((row, idx) => ({ row, rank: idx + 1 }));
  const visible = q ? ranked.filter(({ row }) => row.name.toLowerCase().includes(q)) : ranked;

  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-2">
        <p className="text-[10.5px] text-muted-foreground">
          行をクリックで、その{unit}のLINE導線を画面別に展開。CV率5%以上は緑。
        </p>
        {rows.length > 8 && (
          <div className="relative shrink-0">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-3 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`${unit}名で検索`}
              className="h-7 w-44 pl-6 pr-2 text-[11px] rounded-md border border-input bg-transparent focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
        )}
      </div>
      <div className="overflow-auto max-h-[440px] rounded-md border border-border/60">
        <table className="w-full text-[12px]">
          <thead className="sticky top-0 bg-card z-10">
            <tr className="text-muted-foreground text-[10.5px] uppercase tracking-wider border-b border-border">
              <th className="text-left font-normal py-2 px-2 w-8" />
              <th className="text-left font-normal py-2 w-6">#</th>
              <th className="text-left font-normal py-2">{unit}</th>
              <th className="text-right font-normal py-2 w-16">PV</th>
              <th className="text-right font-normal py-2 w-20">LINE導線</th>
              <th className="text-right font-normal py-2 px-2 w-16">CV率</th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-6 text-center text-[11px] text-muted-foreground">
                  「{search}」に一致する{unit}はありません
                </td>
              </tr>
            ) : (
              visible.map(({ row, rank }) => {
                const key = rowKey(row);
                const isOpen = expanded === key;
                const detail = cache[key];
                return (
                  <Fragment key={key}>
                    <tr
                      className="border-t border-border/60 cursor-pointer hover:bg-muted/40"
                      onClick={() => toggle(row)}
                    >
                      <td className="py-1.5 px-2 text-muted-foreground">
                        {isOpen ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
                      </td>
                      <td className="py-1.5 text-muted-foreground tabular-nums">{rank}</td>
                      <td className="py-1.5 pr-2 truncate max-w-[220px]" title={row.name}>
                        {row.name}
                      </td>
                      <td className="py-1.5 text-right tabular-nums">{nf(row.pv)}</td>
                      <td className="py-1.5 text-right tabular-nums">{nf(row.line_clicks)}</td>
                      <td className="py-1.5 px-2 text-right tabular-nums">
                        <span className={row.cv_rate >= 5 ? "text-emerald-600 font-medium" : ""}>
                          {row.cv_rate}%
                        </span>
                      </td>
                    </tr>
                    {isOpen && (
                      <tr className="bg-muted/30">
                        <td />
                        <td colSpan={5} className="py-2 pr-2">
                          <BreakdownDetail detail={detail} unit={unit} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      <p className="text-[10px] text-muted-foreground mt-1.5 text-right">
        {q ? `${visible.length} / ${rows.length} 件` : `上位 ${rows.length} 件（最大100）`}
      </p>
    </div>
  );
}

function BreakdownDetail({
  detail,
  unit,
}: {
  detail: AnalyticsBreakdownRow[] | "loading" | undefined;
  unit: string;
}) {
  if (detail === "loading" || detail === undefined) {
    return (
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <Loader2 className="size-3 animate-spin" /> 読み込み中…
      </div>
    );
  }
  if (detail.length === 0) {
    return (
      <p className="text-[11px] text-muted-foreground">
        この{unit}からのLINE導線クリックはまだありません。
      </p>
    );
  }
  return (
    <div className="pl-2">
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
        画面別 LINE導線
      </p>
      <ul className="space-y-0.5">
        {detail.map((d) => (
          <li key={d.source} className="flex items-center justify-between text-[11.5px] py-0.5">
            <span className="truncate pr-2">{sourceLabel(d.source)}</span>
            <span className="tabular-nums text-muted-foreground shrink-0">{nf(d.clicks)} click</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function RouteTable({ rows }: { rows: AnalyticsOverview["line_routes"] }) {
  if (rows.length === 0) {
    return <EmptyRows message="LINE導線クリックがまだありません" />;
  }
  return (
    <div>
      <p className="text-[10.5px] text-muted-foreground mb-2">
        LINE導線クリックを「サイト内の画面（CTA配置）」「外部リンク（発行した計測リンク）」別に集計。
      </p>
      <div className="overflow-auto max-h-[440px] rounded-md border border-border/60">
        <table className="w-full text-[12px]">
          <thead className="sticky top-0 bg-card z-10">
            <tr className="text-muted-foreground text-[10.5px] uppercase tracking-wider border-b border-border">
              <th className="text-left font-normal py-2 px-2 w-8">#</th>
              <th className="text-left font-normal py-2">画面 / 経路</th>
              <th className="text-left font-normal py-2 w-28">種別</th>
              <th className="text-right font-normal py-2 px-2 w-20">クリック</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={`${row.route}-${i}`} className="border-t border-border/60">
                <td className="py-1.5 px-2 text-muted-foreground tabular-nums">{i + 1}</td>
                <td className="py-1.5 pr-2 truncate max-w-[260px]" title={row.route}>
                  {sourceLabel(row.route)}
                </td>
                <td className="py-1.5">
                  <Badge variant={row.kind === "affiliate" ? "default" : "secondary"}>
                    {row.kind === "affiliate" ? "外部リンク(発行)" : "サイト内(画面)"}
                  </Badge>
                </td>
                <td className="py-1.5 px-2 text-right tabular-nums">{nf(row.clicks)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function EmptyRows({ message }: { message: string }) {
  return (
    <div className="py-8 text-center text-[12px] text-muted-foreground">{message}</div>
  );
}

/** 計測リンクの一覧 + 発行フォーム（A4: アフィリエイトリンク即時発行）。 */
function TrackingLinks() {
  const [links, setLinks] = useState<TrackingLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  const load = () => {
    setLoading(true);
    api
      .get<TrackingLink[]>("/admin/tracking-links")
      .then((res) => setLinks(Array.isArray(res) ? res : []))
      .catch(() => setLinks([]))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const remove = async (id: number) => {
    if (!confirm("この計測リンクを削除しますか？（クリック履歴も消えます）")) return;
    await api.delete(`/admin/tracking-links/${id}`).catch(() => {});
    setLinks((prev) => prev.filter((l) => l.id !== id));
  };

  return (
    <div>
      <div className="flex items-start justify-between mb-1 gap-2">
        <div className="flex items-center gap-2">
          <Link2 className="size-4 text-muted-foreground" />
          <h4 className="text-[13px] font-medium">計測リンク（経路別クリック計測）</h4>
        </div>
        <Button size="sm" variant={open ? "secondary" : "default"} onClick={() => setOpen((v) => !v)}>
          <Plus className="size-3.5" />
          発行
        </Button>
      </div>
      <p className="text-[10.5px] text-muted-foreground mb-3 leading-snug">
        SNS / アフィリエイト等に貼る短縮URL。クリック数がラベル別に上の「LINE導線」に出る。飛び先は既定でLINE友だち追加。
      </p>

      {open && (
        <IssueForm
          onCreated={(link) => {
            setLinks((prev) => [link, ...prev]);
            setOpen(false);
          }}
        />
      )}

      {loading ? (
        <div className="space-y-2 mt-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : links.length === 0 ? (
        <EmptyRows message="まだ計測リンクがありません。「発行」から作成できます。" />
      ) : (
        <ul className="space-y-1.5 mt-2">
          {links.map((link) => (
            <LinkRow
              key={link.id}
              link={link}
              onDelete={() => remove(link.id)}
              onUpdated={(u) => setLinks((prev) => prev.map((l) => (l.id === u.id ? u : l)))}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function LinkRow({
  link,
  onDelete,
  onUpdated,
}: {
  link: TrackingLink;
  onDelete: () => void;
  onUpdated: (l: TrackingLink) => void;
}) {
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(link.label);
  const [saving, setSaving] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link.public_url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard 不可環境では何もしない */
    }
  };

  const save = async () => {
    const v = draft.trim();
    if (!v || v === link.label) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      const updated = await api.put<TrackingLink>(`/admin/tracking-links/${link.id}`, { label: v });
      onUpdated(updated);
      setEditing(false);
    } catch {
      /* 失敗時は編集状態のまま */
    } finally {
      setSaving(false);
    }
  };

  return (
    <li className="flex items-center gap-2 bg-muted/40 border border-border rounded-lg px-3 py-2">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {editing ? (
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") save();
                if (e.key === "Escape") setEditing(false);
              }}
              autoFocus
              className="h-7 text-[12px]"
            />
          ) : (
            <span className="text-[12px] font-medium truncate" title={link.label}>
              {link.label}
            </span>
          )}
          {!link.is_active && <Badge variant="outline">停止中</Badge>}
        </div>
        <code className="text-[11px] text-muted-foreground truncate block">{link.public_url}</code>
      </div>
      <span className="text-[11px] text-muted-foreground tabular-nums shrink-0">
        {nf(link.clicks_count ?? 0)} click
      </span>
      {editing ? (
        <Button size="icon" variant="ghost" className="size-8 shrink-0" onClick={save} disabled={saving} title="ラベルを保存">
          {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5 text-emerald-600" />}
        </Button>
      ) : (
        <Button
          size="icon"
          variant="ghost"
          className="size-8 shrink-0"
          onClick={() => {
            setDraft(link.label);
            setEditing(true);
          }}
          title="ラベルを編集"
        >
          <Pencil className="size-3.5" />
        </Button>
      )}
      <Button size="icon" variant="ghost" className="size-8 shrink-0" onClick={copy} title="URLをコピー">
        {copied ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
      </Button>
      <a
        href={link.public_url}
        target="_blank"
        rel="noopener noreferrer"
        className="size-8 shrink-0 inline-flex items-center justify-center rounded-md hover:bg-muted"
        title="リンクを開く"
      >
        <ExternalLink className="size-3.5" />
      </a>
      <Button size="icon" variant="ghost" className="size-8 shrink-0" onClick={onDelete} title="削除">
        <Trash2 className="size-3.5 text-destructive" />
      </Button>
    </li>
  );
}

function IssueForm({ onCreated }: { onCreated: (link: TrackingLink) => void }) {
  const [label, setLabel] = useState("");
  const [destination, setDestination] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = label.trim().length > 0;

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const link = await api.post<TrackingLink>("/admin/tracking-links", {
        label: label.trim(),
        destination_url: destination.trim() || undefined,
      });
      onCreated(link);
    } catch (e) {
      setError(e instanceof Error ? e.message : "発行に失敗しました");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-muted/40 border border-border rounded-lg p-3 mb-3 space-y-2.5">
      <div className="grid grid-cols-1 gap-2.5">
        <div>
          <label className="text-[11px] text-muted-foreground">
            ラベル（経路がわかる名前。例: インスタbio / 店舗X用 / アフィリA）
          </label>
          <Input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="例: インスタbio"
            className="h-8 text-[12px] mt-0.5"
          />
        </div>
        <div>
          <label className="text-[11px] text-muted-foreground">
            リダイレクト先URL（空欄ならLINE公式アカウント友だち追加）
          </label>
          <Input
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            placeholder="https://line.me/R/ti/p/@..."
            className="h-8 text-[12px] mt-0.5"
          />
        </div>
      </div>

      {error && <p className="text-[11px] text-destructive">{error}</p>}

      <div className="flex justify-end">
        <Button size="sm" onClick={submit} disabled={!canSubmit || submitting}>
          {submitting ? <Loader2 className="size-3.5 animate-spin" /> : <Route className="size-3.5" />}
          発行してURLを作成
        </Button>
      </div>
    </div>
  );
}

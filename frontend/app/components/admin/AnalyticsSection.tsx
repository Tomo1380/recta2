import { Fragment, useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  ExternalLink,
  Link2,
  Loader2,
  Plus,
  Route,
  Trash2,
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

const TARGET_LABELS: Record<TrackingLink["target_type"], string> = {
  standalone: "SNS/直リンク",
  store: "店舗",
  area: "エリア",
  column: "コラム",
};

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

  return (
    <div className="bg-card border border-border rounded-xl p-4 sm:p-5 space-y-5">
      {/* Header + range selector */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <BarChart3 className="size-4 text-muted-foreground" />
          <div>
            <h3 className="text-sm font-medium">アクセス解析</h3>
            <p className="text-[10.5px] text-muted-foreground leading-tight mt-0.5">
              「LINE導線」はボタン押下（どの画面から進んだか）。実際の友だち追加は
              下の「友だち追加 実績」で全体数を表示（LINE仕様で経路別には割れません）。
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5">
          {DAY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setDays(opt.value)}
              className={`px-2.5 py-1 text-[11px] rounded-md transition-colors ${
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

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <SummaryCard label="PV (期間内)" value={summary ? nf(summary.pv) : "—"} loading={loading} />
        <SummaryCard
          label="LINE導線クリック"
          value={summary ? nf(summary.line_clicks) : "—"}
          hint="ボタン押下（実追加ではない）"
          loading={loading}
        />
        <SummaryCard
          label="導線CV率"
          value={summary ? `${summary.cv_rate}%` : "—"}
          hint="導線クリック ÷ PV"
          loading={loading}
        />
        <SummaryCard
          label="友だち追加 実績"
          value={summary ? nf(summary.line_friends_total) : "—"}
          hint={summary ? `期間内 +${nf(summary.line_friends_in_range)}（全体）` : "公式アカ追加・全体"}
          loading={loading}
        />
      </div>

      {/* Ranking tabs */}
      <div>
        <div className="flex items-center gap-1 border-b border-border mb-3">
          {RANK_TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`px-3 py-2 text-[12px] -mb-px border-b-2 transition-colors ${
                tab === t.key
                  ? "border-foreground font-medium"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
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

      {/* Tracking link issuer */}
      <TrackingLinks />
    </div>
  );
}

function SummaryCard({
  label,
  value,
  hint,
  loading,
}: {
  label: string;
  value: string;
  hint?: string;
  loading: boolean;
}) {
  return (
    <div className="bg-muted/40 border border-border rounded-lg p-3">
      <p className="text-[10.5px] text-muted-foreground uppercase tracking-wider">{label}</p>
      {loading ? (
        <Skeleton className="h-6 w-16 mt-1" />
      ) : (
        <p className="text-xl font-semibold mt-0.5 tabular-nums">{value}</p>
      )}
      {hint && <p className="text-[10px] text-muted-foreground mt-0.5">{hint}</p>}
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

  // 期間 / ディメンション変更時は展開とキャッシュをリセット。
  useEffect(() => {
    setExpanded(null);
    setCache({});
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

  return (
    <div className="overflow-x-auto">
      <p className="text-[10.5px] text-muted-foreground mb-1.5">
        行をクリックすると、その{unit}のLINE導線を画面別に展開します。
      </p>
      <table className="w-full text-[12px]">
        <thead>
          <tr className="text-muted-foreground text-[10.5px] uppercase tracking-wider">
            <th className="text-left font-normal py-1.5 w-8" />
            <th className="text-left font-normal py-1.5 w-6">#</th>
            <th className="text-left font-normal py-1.5">{unit}</th>
            <th className="text-right font-normal py-1.5 w-16">PV</th>
            <th className="text-right font-normal py-1.5 w-20">LINE導線</th>
            <th className="text-right font-normal py-1.5 w-16">CV率</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const key = rowKey(row);
            const isOpen = expanded === key;
            const detail = cache[key];
            return (
              <Fragment key={`${key}-${i}`}>
                <tr
                  className="border-t border-border/60 cursor-pointer hover:bg-muted/40"
                  onClick={() => toggle(row)}
                >
                  <td className="py-1.5 text-muted-foreground">
                    {isOpen ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
                  </td>
                  <td className="py-1.5 text-muted-foreground tabular-nums">{i + 1}</td>
                  <td className="py-1.5 pr-2 truncate max-w-[200px]" title={row.name}>
                    {row.name}
                  </td>
                  <td className="py-1.5 text-right tabular-nums">{nf(row.pv)}</td>
                  <td className="py-1.5 text-right tabular-nums">{nf(row.line_clicks)}</td>
                  <td className="py-1.5 text-right tabular-nums">
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
          })}
        </tbody>
      </table>
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
    <div className="overflow-x-auto">
      <table className="w-full text-[12px]">
        <thead>
          <tr className="text-muted-foreground text-[10.5px] uppercase tracking-wider">
            <th className="text-left font-normal py-1.5 w-8">#</th>
            <th className="text-left font-normal py-1.5">画面 / 経路</th>
            <th className="text-left font-normal py-1.5 w-28">種別</th>
            <th className="text-right font-normal py-1.5 w-20">クリック</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={`${row.route}-${i}`} className="border-t border-border/60">
              <td className="py-1.5 text-muted-foreground tabular-nums">{i + 1}</td>
              <td className="py-1.5 pr-2 truncate max-w-[260px]" title={row.route}>
                {row.route}
              </td>
              <td className="py-1.5">
                <Badge variant={row.kind === "affiliate" ? "default" : "secondary"}>
                  {row.kind === "affiliate" ? "外部リンク(発行)" : "サイト内(画面)"}
                </Badge>
              </td>
              <td className="py-1.5 text-right tabular-nums">{nf(row.clicks)}</td>
            </tr>
          ))}
        </tbody>
      </table>
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
    <div className="border-t border-border pt-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Link2 className="size-4 text-muted-foreground" />
          <h4 className="text-[13px] font-medium">計測リンク（アフィリエイト / SNS / 店舗別）</h4>
        </div>
        <Button size="sm" variant={open ? "secondary" : "default"} onClick={() => setOpen((v) => !v)}>
          <Plus className="size-3.5" />
          発行
        </Button>
      </div>

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
            <LinkRow key={link.id} link={link} onDelete={() => remove(link.id)} />
          ))}
        </ul>
      )}
    </div>
  );
}

function LinkRow({ link, onDelete }: { link: TrackingLink; onDelete: () => void }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link.public_url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard 不可環境では何もしない */
    }
  };

  return (
    <li className="flex items-center gap-2 bg-muted/40 border border-border rounded-lg px-3 py-2">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-medium truncate" title={link.label}>
            {link.label}
          </span>
          <Badge variant="secondary">{TARGET_LABELS[link.target_type]}</Badge>
          {!link.is_active && <Badge variant="outline">停止中</Badge>}
        </div>
        <code className="text-[11px] text-muted-foreground truncate block">{link.public_url}</code>
      </div>
      <span className="text-[11px] text-muted-foreground tabular-nums shrink-0">
        {nf(link.clicks_count ?? 0)} click
      </span>
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
  const [targetType, setTargetType] = useState<TrackingLink["target_type"]>("standalone");
  const [storeId, setStoreId] = useState("");
  const [articleId, setArticleId] = useState("");
  const [area, setArea] = useState("");
  const [destination, setDestination] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    if (!label.trim()) return false;
    if (targetType === "store" && !storeId.trim()) return false;
    if (targetType === "column" && !articleId.trim()) return false;
    if (targetType === "area" && !area.trim()) return false;
    return true;
  }, [label, targetType, storeId, articleId, area]);

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        label: label.trim(),
        target_type: targetType,
        destination_url: destination.trim() || undefined,
      };
      if (targetType === "store") body.store_id = Number(storeId);
      if (targetType === "column") body.article_id = Number(articleId);
      if (targetType === "area") body.area = area.trim();
      const link = await api.post<TrackingLink>("/admin/tracking-links", body);
      onCreated(link);
    } catch (e) {
      setError(e instanceof Error ? e.message : "発行に失敗しました");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-muted/40 border border-border rounded-lg p-3 mb-3 space-y-2.5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <div>
          <label className="text-[11px] text-muted-foreground">ラベル（管理用の名前）</label>
          <Input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="例: X投稿_体入キャンペーン"
            className="h-8 text-[12px] mt-0.5"
          />
        </div>
        <div>
          <label className="text-[11px] text-muted-foreground">種別</label>
          <select
            value={targetType}
            onChange={(e) => setTargetType(e.target.value as TrackingLink["target_type"])}
            className="mt-0.5 h-8 w-full text-[12px] rounded-md border border-input bg-transparent px-2"
          >
            <option value="standalone">SNS/直リンク</option>
            <option value="store">店舗別</option>
            <option value="area">エリア別</option>
            <option value="column">コラム別</option>
          </select>
        </div>
        {targetType === "store" && (
          <div>
            <label className="text-[11px] text-muted-foreground">店舗ID</label>
            <Input
              value={storeId}
              onChange={(e) => setStoreId(e.target.value)}
              inputMode="numeric"
              placeholder="例: 12"
              className="h-8 text-[12px] mt-0.5"
            />
          </div>
        )}
        {targetType === "column" && (
          <div>
            <label className="text-[11px] text-muted-foreground">コラムID</label>
            <Input
              value={articleId}
              onChange={(e) => setArticleId(e.target.value)}
              inputMode="numeric"
              placeholder="例: 3"
              className="h-8 text-[12px] mt-0.5"
            />
          </div>
        )}
        {targetType === "area" && (
          <div>
            <label className="text-[11px] text-muted-foreground">エリア名</label>
            <Input
              value={area}
              onChange={(e) => setArea(e.target.value)}
              placeholder="例: 六本木"
              className="h-8 text-[12px] mt-0.5"
            />
          </div>
        )}
        <div className="sm:col-span-2">
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

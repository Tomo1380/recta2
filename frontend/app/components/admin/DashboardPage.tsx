import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Bot,
  Building2,
  Clock,
  MessageCircle,
  MessageSquare,
  Minus,
  Star,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { useEffect, useId, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { Skeleton } from "~/components/ui/skeleton";
import { api } from "~/lib/api";
import type { DashboardData, DashboardKpiWithDelta } from "~/lib/types";
import { AnalyticsSection } from "~/components/admin/AnalyticsSection";

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------

const numberFmt = new Intl.NumberFormat("ja-JP");

function formatRelativeTime(iso: string | null): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  const diffMs = Date.now() - d.getTime();
  const diffMin = Math.round(diffMs / 60000);
  if (diffMin < 1) return "たった今";
  if (diffMin < 60) return `${diffMin}分前`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}時間前`;
  const diffDay = Math.round(diffHr / 24);
  if (diffDay < 30) return `${diffDay}日前`;
  return d.toLocaleDateString("ja-JP", { month: "2-digit", day: "2-digit" });
}

function formatShortDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function getDelta(kpi: DashboardKpiWithDelta): number | null {
  if (typeof kpi.delta_30d === "number") return kpi.delta_30d;
  if (typeof kpi.delta_vs_prev === "number") return kpi.delta_vs_prev;
  if (typeof kpi.delta_vs_yesterday === "number") return kpi.delta_vs_yesterday;
  return null;
}

const modeLabels: Record<string, string> = {
  agent: "Agent",
  finetuned: "Fine-tuned",
};

const reviewStatusLabels: Record<string, { label: string; className: string }> = {
  published: { label: "公開", className: "bg-emerald-50 text-emerald-700" },
  unpublished: { label: "非公開", className: "bg-amber-50 text-amber-700" },
  deleted: { label: "削除", className: "bg-rose-50 text-rose-700" },
};

// ----------------------------------------------------------------
// Sub-components
// ----------------------------------------------------------------

function KpiCard({
  icon: Icon,
  label,
  value,
  unit,
  kpi,
  deltaSuffix,
  hint,
}: {
  icon: typeof Users;
  label: string;
  value: number | string;
  unit?: string;
  kpi?: DashboardKpiWithDelta;
  deltaSuffix?: string;
  hint?: string;
}) {
  const delta = kpi ? getDelta(kpi) : null;
  const trendIcon =
    delta === null
      ? null
      : delta > 0
      ? <ArrowUpRight className="w-3 h-3" />
      : delta < 0
      ? <ArrowDownRight className="w-3 h-3" />
      : <Minus className="w-3 h-3" />;
  const trendColor =
    delta === null
      ? "text-muted-foreground"
      : delta > 0
      ? "text-emerald-600"
      : delta < 0
      ? "text-rose-600"
      : "text-muted-foreground";

  return (
    <div className="bg-card border border-border rounded-xl p-4 sm:p-5 hover:border-indigo-200 transition-colors duration-200 min-h-[120px]">
      <div className="flex items-center justify-between mb-3">
        <Icon className="w-4 h-4 text-muted-foreground" />
        {delta !== null && (
          <span
            className={`flex items-center gap-0.5 text-[11px] ${trendColor}`}
          >
            {trendIcon}
            {delta > 0 ? "+" : ""}
            {numberFmt.format(delta)}
            {deltaSuffix ?? ""}
          </span>
        )}
      </div>
      <p
        className="text-2xl sm:text-3xl text-foreground tracking-tight"
        style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700 }}
      >
        {typeof value === "number" ? numberFmt.format(value) : value}
        {unit && (
          <span className="text-base text-muted-foreground ml-1">{unit}</span>
        )}
      </p>
      <p className="text-[12px] text-muted-foreground mt-0.5">
        {label}
        {hint && <span className="ml-1.5 text-[11px]">({hint})</span>}
      </p>
    </div>
  );
}

function SectionHeader({
  title,
  badge,
  href,
  navigate,
  icon: Icon,
}: {
  title: string;
  badge?: string;
  href?: string;
  navigate?: ReturnType<typeof useNavigate>;
  icon?: typeof Activity;
}) {
  return (
    <div className="px-4 sm:px-5 py-3 border-b border-border flex items-center justify-between">
      <div className="flex items-center gap-2">
        {Icon && <Icon className="w-4 h-4 text-muted-foreground" />}
        <h3 className="text-sm">{title}</h3>
        {badge && (
          <span className="text-[11px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-md">
            {badge}
          </span>
        )}
      </div>
      {href && navigate && (
        <button
          onClick={() => navigate(href)}
          className="text-[12px] text-muted-foreground hover:text-foreground transition flex items-center gap-0.5"
        >
          すべて表示 <ArrowUpRight className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="px-4 sm:px-5 py-10 text-center text-[13px] text-muted-foreground">
      {message}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-[120px] rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Skeleton className="h-[300px] rounded-xl" />
        <Skeleton className="h-[300px] rounded-xl" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <Skeleton className="h-[400px] rounded-xl" />
        <Skeleton className="h-[400px] rounded-xl" />
        <Skeleton className="h-[400px] rounded-xl" />
      </div>
    </div>
  );
}

// ----------------------------------------------------------------
// Page
// ----------------------------------------------------------------

export function DashboardPage() {
  const rawId = useId();
  const chartId = rawId.replace(/:/g, "");
  const navigate = useNavigate();

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .get<DashboardData>("/admin/dashboard")
      .then((res) => {
        if (cancelled) return;
        setData(res);
        setLastUpdated(
          new Date().toLocaleString("ja-JP", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          })
        );
      })
      .catch((err) => {
        console.error("Failed to load dashboard", err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const chatTrendData = useMemo(() => {
    if (!data) return [];
    return data.chat_trend.map((p) => ({
      date: formatShortDate(p.date),
      Agent: p.agent,
      "Fine-tuned": p.finetuned,
    }));
  }, [data]);

  const lineFriendTrendData = useMemo(() => {
    if (!data) return [];
    return data.line_friend_trend.map((p) => ({
      date: formatShortDate(p.date),
      count: p.count,
    }));
  }, [data]);

  if (loading || !data) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-1">
          <div>
            <h2
              className="text-foreground"
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700 }}
            >
              ダッシュボード
            </h2>
            <p className="text-[13px] text-muted-foreground mt-0.5">
              Recta Admin の概要データ
            </p>
          </div>
        </div>
        <LoadingSkeleton />
      </div>
    );
  }

  const k = data.kpis;

  return (
    // 並び順は CSS order で制御 (2026-06-06 FB: 直近3リストをグラフの上に)。
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-1">
        <div>
          <h2
            className="text-foreground"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700 }}
          >
            ダッシュボード
          </h2>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            Recta Admin の概要データ
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
          <Clock className="w-3.5 h-3.5" />
          最終更新: {lastUpdated}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="order-1 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <KpiCard
          icon={Building2}
          label="公開店舗数"
          value={k.published_stores.value}
          unit="店"
          kpi={k.published_stores}
          deltaSuffix="（30日）"
        />
        <KpiCard
          icon={Users}
          label="アクティブユーザー"
          value={k.active_users_30d.value}
          unit="人"
          kpi={k.active_users_30d}
          hint="30日"
        />
        <KpiCard
          icon={MessageCircle}
          label="LINE友だち数"
          value={k.line_friends.value}
          unit="人"
          kpi={k.line_friends}
          deltaSuffix="（30日）"
        />
        <KpiCard
          icon={Star}
          label="今日の口コミ"
          value={k.reviews_today.value}
          unit="件"
          kpi={k.reviews_today}
          deltaSuffix="（前日比）"
        />
        <KpiCard
          icon={Bot}
          label="今日のAIチャット"
          value={k.chat_today.value}
          unit="件"
          hint={`平均 ${numberFmt.format(k.chat_today.avg_tokens ?? 0)} tok`}
        />
      </div>

      {/* Time-series charts */}
      <div className="order-3 grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* AI Chat trend by mode */}
        <div className="bg-card border border-border rounded-xl p-4 sm:p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Bot className="w-4 h-4 text-muted-foreground" />
              <h3 className="text-sm">AIチャット利用数（モード別）</h3>
            </div>
            <span className="text-[11px] text-muted-foreground bg-muted px-2 py-1 rounded-md">
              30日
            </span>
          </div>
          <div className="min-h-[260px] h-[260px] sm:h-[280px]">
            {chatTrendData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chatTrendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10 }}
                    stroke="#9ca3af"
                    axisLine={false}
                    tickLine={false}
                    interval="preserveStartEnd"
                    minTickGap={20}
                  />
                  <YAxis
                    tick={{ fontSize: 10 }}
                    stroke="#9ca3af"
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "8px",
                      border: "1px solid #e7e5e4",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
                      fontSize: "12px",
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="Agent" stackId="a" fill="#6366f1" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="Fine-tuned" stackId="a" fill="#a78bfa" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState message="チャット利用ログがまだありません" />
            )}
          </div>
        </div>

        {/* LINE friends trend */}
        <div className="bg-card border border-border rounded-xl p-4 sm:p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
              <h3 className="text-sm">LINE友だち追加（日別）</h3>
            </div>
            <span className="text-[11px] text-muted-foreground bg-muted px-2 py-1 rounded-md">
              30日
            </span>
          </div>
          <div className="min-h-[260px] h-[260px] sm:h-[280px]">
            {lineFriendTrendData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={lineFriendTrendData}>
                  <defs>
                    <linearGradient
                      id={`lineGrad-${chartId}`}
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="5%" stopColor="#06c755" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#06c755" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10 }}
                    stroke="#9ca3af"
                    axisLine={false}
                    tickLine={false}
                    interval="preserveStartEnd"
                    minTickGap={20}
                  />
                  <YAxis
                    tick={{ fontSize: 10 }}
                    stroke="#9ca3af"
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "8px",
                      border: "1px solid #e7e5e4",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
                      fontSize: "12px",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="count"
                    name="新規追加"
                    stroke="#06c755"
                    strokeWidth={2}
                    fill={`url(#lineGrad-${chartId})`}
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState message="LINE友だちのデータがまだありません" />
            )}
          </div>
        </div>
      </div>

      {/* アクセス解析: 店舗/エリア/コラム ランキング + LINE経路 + 計測リンク発行 (FB A2-A4) */}
      <div className="order-4">
        <AnalyticsSection />
      </div>

      {/* Secondary indicators */}
      <div className="order-5 grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wider">
            未読LINE
          </p>
          <p
            className="text-2xl mt-1"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700 }}
          >
            {numberFmt.format(data.secondary.unread_messages)}
          </p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wider">
            非公開口コミ
          </p>
          <p
            className="text-2xl mt-1"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700 }}
          >
            {numberFmt.format(data.secondary.pending_reviews)}
          </p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wider">
            公開コラム
          </p>
          <p
            className="text-2xl mt-1"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700 }}
          >
            {numberFmt.format(data.secondary.published_articles)}
          </p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wider">
            Fine-tuning Q&amp;A
          </p>
          <p
            className="text-2xl mt-1"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700 }}
          >
            {numberFmt.format(data.secondary.fine_tuning_qa_active)}
          </p>
        </div>
      </div>

      {/* Recent activity grids (FB: グラフより上に出す) */}
      <div className="order-2 grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Recent reviews */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <SectionHeader
            title="直近の口コミ"
            icon={MessageSquare}
            href="/admin/reviews"
            navigate={navigate}
          />
          <div className="divide-y divide-border max-h-[420px] overflow-y-auto">
            {data.recent_reviews.length === 0 ? (
              <EmptyState message="まだ口コミがありません" />
            ) : (
              data.recent_reviews.map((r) => {
                const status = reviewStatusLabels[r.status] ?? {
                  label: r.status,
                  className: "bg-muted text-muted-foreground",
                };
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => navigate("/admin/reviews")}
                    className="w-full text-left px-4 sm:px-5 py-3 hover:bg-muted/40 transition"
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="flex items-center gap-0.5 text-amber-500 shrink-0">
                          <Star className="w-3 h-3 fill-amber-500" />
                          <span className="text-[12px] text-foreground">
                            {r.rating.toFixed(1)}
                          </span>
                        </div>
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded-md shrink-0 ${status.className}`}
                        >
                          {status.label}
                        </span>
                        <span className="text-[12px] text-muted-foreground truncate">
                          {r.store_name ?? "(店舗不明)"}
                        </span>
                      </div>
                      <span className="text-[11px] text-muted-foreground shrink-0">
                        {formatRelativeTime(r.created_at)}
                      </span>
                    </div>
                    <p className="text-[12px] text-muted-foreground line-clamp-2">
                      {r.body || "(本文なし)"}
                    </p>
                    <p className="text-[11px] text-muted-foreground/80 mt-1">
                      by {r.user_name}
                    </p>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Recent LINE messages */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <SectionHeader
            title="LINE受信メッセージ"
            icon={MessageCircle}
            badge={
              data.secondary.unread_messages > 0
                ? `未読 ${data.secondary.unread_messages}`
                : undefined
            }
            href="/admin/users"
            navigate={navigate}
          />
          <div className="divide-y divide-border max-h-[420px] overflow-y-auto">
            {data.recent_messages.length === 0 ? (
              <EmptyState message="LINE受信メッセージはまだありません" />
            ) : (
              data.recent_messages.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() =>
                    navigate(
                      m.line_user_id
                        ? `/admin/people/${m.line_user_id}`
                        : "/admin/users"
                    )
                  }
                  className={`w-full text-left px-4 sm:px-5 py-3 flex items-start gap-3 hover:bg-muted/40 transition ${
                    m.unread ? "bg-indigo-50/50" : ""
                  }`}
                >
                  <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-500 text-[12px] shrink-0">
                    {m.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`text-[13px] truncate ${
                          m.unread ? "text-foreground" : "text-muted-foreground"
                        }`}
                      >
                        {m.name}
                      </span>
                      <span className="text-[11px] text-muted-foreground shrink-0">
                        {formatRelativeTime(m.created_at)}
                      </span>
                    </div>
                    <p
                      className={`text-[12px] truncate mt-0.5 ${
                        m.unread ? "text-foreground" : "text-muted-foreground"
                      }`}
                    >
                      {m.message || "(本文なし)"}
                    </p>
                  </div>
                  {m.unread && (
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0 mt-2" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>

        {/* Recent AI chats */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <SectionHeader
            title="AIチャット直近"
            icon={Bot}
            href="/admin/ai-chat"
            navigate={navigate}
          />
          <div className="divide-y divide-border max-h-[420px] overflow-y-auto">
            {data.recent_chats.length === 0 ? (
              <EmptyState message="AIチャットの履歴がまだありません" />
            ) : (
              data.recent_chats.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => navigate("/admin/ai-chat")}
                  className="w-full text-left px-4 sm:px-5 py-3 hover:bg-muted/40 transition"
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded-md shrink-0 ${
                          c.mode === "finetuned"
                            ? "bg-violet-50 text-violet-700"
                            : "bg-indigo-50 text-indigo-700"
                        }`}
                      >
                        {modeLabels[c.mode ?? ""] ?? c.mode ?? "?"}
                      </span>
                      <span className="text-[11px] text-muted-foreground truncate">
                        {c.user_name}
                      </span>
                    </div>
                    <span className="text-[11px] text-muted-foreground shrink-0">
                      {formatRelativeTime(c.created_at)}
                    </span>
                  </div>
                  <p className="text-[12px] text-foreground line-clamp-2">
                    {c.user_message || "(空のメッセージ)"}
                  </p>
                  <p className="text-[11px] text-muted-foreground/80 mt-1">
                    {numberFmt.format(c.total_tokens)} tokens
                    {c.page_type ? ` ・ ${c.page_type}` : ""}
                  </p>
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

import {
  Users,
  Building2,
  MessageSquare,
  Bot,
  UserPlus,
  MessageCircle,
  ArrowUpRight,
  Clock,
  Activity,
  Loader2,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import { useId, useState, useEffect } from "react";
import { api } from "~/lib/api";
import type { DashboardData } from "~/lib/types";

// TODO: LINE messages, activity logs, and LINE stats will be populated
// when LINE integration API is added. Using placeholder data for now.
const lineMessages = [
  {
    id: 1,
    name: "山田 美咲",
    avatar: "M",
    message: "面接の予約をしたいのですが、来週の火曜日は空いていますか？",
    time: "14:32",
    unread: true,
  },
  {
    id: 2,
    name: "佐藤 あゆみ",
    avatar: "A",
    message: "体入の時給について詳しく教えてください",
    time: "13:15",
    unread: true,
  },
  {
    id: 3,
    name: "高橋 ゆい",
    avatar: "Y",
    message: "ありがとうございます！確認しました。",
    time: "12:48",
    unread: false,
  },
  {
    id: 4,
    name: "田中 りさ",
    avatar: "R",
    message: "新宿エリアで未経験OKのお店はありますか？",
    time: "11:20",
    unread: false,
  },
  {
    id: 5,
    name: "中村 さくら",
    avatar: "S",
    message: "明日の面接、よろしくお願いします！",
    time: "10:05",
    unread: false,
  },
];

// TODO: Will be populated when activity log API is added.
const activityLogs = [
  { time: "14:32", user: "田中太郎", action: "店舗「CLUB LUNA」を更新", type: "update" },
  { time: "14:15", user: "佐藤花子", action: "口コミ #892 を承認", type: "approve" },
  { time: "13:48", user: "山本一郎", action: "新規ユーザー登録", type: "create" },
  { time: "13:20", user: "鈴木美咲", action: "AIチャット設定を変更", type: "update" },
  { time: "12:55", user: "高橋健太", action: "店舗「Lounge ARIA」を新規作成", type: "create" },
  { time: "12:30", user: "伊藤あゆみ", action: "ユーザー #456 を停止", type: "warning" },
];

// TODO: Will be populated when LINE integration API is added.
const lineStats = {
  friends: 2847,
  friendsChange: "+128",
  todayAdded: 12,
  unreadMessages: 8,
};

const typeColors: Record<string, string> = {
  update: "bg-blue-500",
  approve: "bg-emerald-500",
  create: "bg-violet-500",
  warning: "bg-amber-500",
};

export function DashboardPage() {
  const rawId = useId();
  const chartId = rawId.replace(/:/g, "");

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string>("");

  useEffect(() => {
    api.get<DashboardData>("/admin/dashboard").then((res) => {
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
      setLoading(false);
    });
  }, []);

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const stats = [
    {
      label: "登録ユーザー数",
      value: data.stats.user_count.toLocaleString(),
      unit: "人",
      icon: Users,
    },
    {
      label: "店舗数",
      value: data.stats.store_count.toLocaleString(),
      unit: "店舗",
      icon: Building2,
    },
    {
      label: "口コミ件数",
      value: data.stats.review_count.toLocaleString(),
      unit: "件",
      icon: MessageSquare,
    },
    {
      label: "本日のチャット",
      value: data.stats.today_chat_count.toLocaleString(),
      unit: "件",
      icon: Bot,
    },
  ];

  const userTrend = data.user_trend.map((item) => ({
    month: item.month,
    users: item.count,
  }));

  const chatTrend = data.chat_trend.map((item) => ({
    day: item.date,
    count: item.count,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-1">
        <div>
          <h2 className="text-foreground" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700 }}>ダッシュボード</h2>
          <p className="text-[13px] text-muted-foreground mt-0.5">Recta Admin の概要データ</p>
        </div>
        <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
          <Clock className="w-3.5 h-3.5" />
          最終更新: {lastUpdated}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="bg-card border border-border rounded-xl p-4 sm:p-5 hover:border-indigo-200 transition-colors duration-200"
          >
            <div className="flex items-center justify-between mb-3">
              <stat.icon className="w-4 h-4 text-muted-foreground" />
            </div>
            <p className="text-2xl sm:text-3xl text-foreground tracking-tight" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700 }}>
              {stat.value}
            </p>
            <p className="text-[12px] text-muted-foreground mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        {/* LINE Stats - compact */}
        <div className="lg:col-span-4 bg-gradient-to-br from-[#06c755] to-[#04a847] rounded-xl p-5 text-white relative overflow-hidden">
          <div className="relative">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 bg-white/20 rounded-md flex items-center justify-center">
                <MessageCircle className="w-3.5 h-3.5" />
              </div>
              <span className="text-[13px] text-white/80">公式LINE</span>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-white/60 text-[11px] uppercase tracking-wider">友だち数</p>
                <p className="text-3xl text-white mt-1" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700 }}>
                  {lineStats.friends.toLocaleString()}
                </p>
                <p className="text-[12px] text-white/70 mt-1 flex items-center gap-1">
                  <UserPlus className="w-3 h-3 text-white" />
                  <span className="text-white">今月 {lineStats.friendsChange}</span>
                </p>
              </div>
              <div className="flex gap-4">
                <div>
                  <p className="text-white/60 text-[11px]">本日追加</p>
                  <p className="text-lg text-white" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 600 }}>{lineStats.todayAdded}</p>
                </div>
                <div>
                  <p className="text-white/60 text-[11px]">未読</p>
                  <p className="text-lg text-white" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 600 }}>{lineStats.unreadMessages}</p>
                </div>
              </div>
            </div>
          </div>
          {/* Decorative circles */}
          <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-white/10" />
          <div className="absolute -bottom-4 -right-4 w-16 h-16 rounded-full bg-white/5" />
        </div>

        {/* User trend chart */}
        <div className="lg:col-span-8 bg-card border border-border rounded-xl p-4 sm:p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm">ユーザー登録数の推移</h3>
            <span className="text-[11px] text-muted-foreground bg-muted px-2 py-1 rounded-md">6ヶ月</span>
          </div>
          <div className="h-[200px] sm:h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={userTrend}>
                <defs>
                  <linearGradient id={`userGrad-${chartId}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.12} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0ef" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="#9ca3af" axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} stroke="#9ca3af" axisLine={false} tickLine={false} />
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
                  dataKey="users"
                  stroke="#6366f1"
                  strokeWidth={2}
                  fill={`url(#userGrad-${chartId})`}
                  dot={{ fill: "#6366f1", r: 3, strokeWidth: 0 }}
                  name="ユーザー数"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* LINE Messages */}
        <div className="lg:col-span-7 bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-4 sm:px-5 py-3 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-sm">メッセージ</h3>
              <span className="text-[11px] bg-red-50 text-red-600 px-1.5 py-0.5 rounded-md">
                {lineStats.unreadMessages}件
              </span>
            </div>
            <button className="text-[12px] text-muted-foreground hover:text-foreground transition flex items-center gap-0.5">
              すべて表示 <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
          <div className="divide-y divide-border">
            {lineMessages.map((msg) => (
              <div
                key={msg.id}
                className={`px-4 sm:px-5 py-3 flex items-start gap-3 hover:bg-muted/40 transition cursor-pointer ${
                  msg.unread ? "bg-indigo-50/50" : ""
                }`}
              >
                <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-400 text-[12px] shrink-0">
                  {msg.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-[13px] ${msg.unread ? "text-foreground" : "text-muted-foreground"}`}>
                      {msg.name}
                    </span>
                    <span className="text-[11px] text-muted-foreground shrink-0">{msg.time}</span>
                  </div>
                  <p className={`text-[13px] truncate mt-0.5 ${msg.unread ? "text-foreground" : "text-muted-foreground"}`}>
                    {msg.message}
                  </p>
                </div>
                {msg.unread && (
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0 mt-2" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Chat trend chart */}
        <div className="lg:col-span-5 bg-card border border-border rounded-xl p-4 sm:p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm">AIチャット利用数</h3>
            <span className="text-[11px] text-muted-foreground bg-muted px-2 py-1 rounded-md">7日間</span>
          </div>
          <div className="h-[200px] sm:h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chatTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0ef" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} stroke="#9ca3af" axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} stroke="#9ca3af" axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    borderRadius: "8px",
                    border: "1px solid #e7e5e4",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
                    fontSize: "12px",
                  }}
                />
                <Bar
                  dataKey="count"
                  fill="#6366f1"
                  radius={[4, 4, 0, 0]}
                  name="利用数"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Activity Log */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-4 sm:px-5 py-3 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-sm">アクティビティ</h3>
          </div>
          <button className="text-[12px] text-muted-foreground hover:text-foreground transition flex items-center gap-0.5">
            すべて表示 <ArrowUpRight className="w-3 h-3" />
          </button>
        </div>
        {/* Desktop table */}
        <div className="hidden sm:block">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left py-2.5 px-5 text-muted-foreground text-[11px] uppercase tracking-wider">日時</th>
                <th className="text-left py-2.5 px-5 text-muted-foreground text-[11px] uppercase tracking-wider">ユーザー</th>
                <th className="text-left py-2.5 px-5 text-muted-foreground text-[11px] uppercase tracking-wider">アクション</th>
              </tr>
            </thead>
            <tbody>
              {activityLogs.map((log, i) => (
                <tr key={i} className="border-b border-border last:border-0 hover:bg-muted/20 transition">
                  <td className="py-2.5 px-5 text-muted-foreground whitespace-nowrap">{log.time}</td>
                  <td className="py-2.5 px-5">
                    <div className="flex items-center gap-2">
                      <div className={`w-1.5 h-1.5 rounded-full ${typeColors[log.type] || "bg-stone-400"}`} />
                      <span>{log.user}</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-5 text-muted-foreground">{log.action}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Mobile card list */}
        <div className="sm:hidden divide-y divide-border">
          {activityLogs.map((log, i) => (
            <div key={i} className="px-4 py-3 space-y-0.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full ${typeColors[log.type] || "bg-stone-400"}`} />
                  <span className="text-[13px]">{log.user}</span>
                </div>
                <span className="text-[11px] text-muted-foreground">{log.time}</span>
              </div>
              <p className="text-[13px] text-muted-foreground pl-3.5">{log.action}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ==============================================================
// Recta2 - Top Page Source Bundle for Claude Design
// ==============================================================
// This is a concatenation of the live source files that build the
// top page at https://recta.isayama-dev.com/.
// Stack: React Router v7 (SSR), React 19, TypeScript, Tailwind 4,
// shadcn/ui. Mobile-first, target viewport iPhone 14 Pro (390px).
//
// Brand tokens used in styles:
//   GOLD     #D4AF37
//   DARK     #1b2528
//   LINE     #06C755
//   BG       #fafeff
// Fonts: 'Noto Sans JP' (ja text), 'Outfit' (latin/numeric headings)
//
// Each file below is delimited by // ===== <path> =====
// ==============================================================

// ===== frontend/app/lib/types.ts =====
// Pagination wrapper from Laravel
export interface Paginated<T> {
  current_page: number;
  data: T[];
  first_page_url: string;
  from: number | null;
  last_page: number;
  last_page_url: string;
  next_page_url: string | null;
  path: string;
  per_page: number;
  prev_page_url: string | null;
  to: number | null;
  total: number;
}

export interface User {
  id: number;
  line_user_id: string | null;
  line_display_name: string | null;
  line_picture_url: string | null;
  use_line_avatar: boolean;
  nickname: string | null;
  age: number | null;
  preferred_area: string | null;
  preferred_category: string | null;
  experience: string | null;
  bio: string | null;
  admin_notes: string | null;
  status: "active" | "suspended";
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
  reviews_count?: number;
  reviews?: Review[];
  is_line_friend: boolean;
  line_friend?: LineFriend | null;
}

export interface UserIndexResponse {
  users: Paginated<User>;
  line_stats: {
    total_users: number;
    line_friend_count: number;
  };
}

export interface UserShowResponse {
  user: User;
  line_messages: LineMessage[];
}

export interface Store {
  id: number;
  name: string;
  area: string;
  address: string | null;
  nearest_station: string | null;
  category: string | null;
  // 営業時間（文字列は後方互換、opening_time/closing_timeが正）
  business_hours: string | null;
  opening_time: string | null;   // 例: "20:00"
  closing_time: string | null;   // 例: "1:00", "LAST"
  holidays: string | null;
  shift_info: string | null;     // 例: "週2日〜OK。シフト自由制。"
  phone: string | null;
  website_url: string | null;
  hourly_min: number | null;
  hourly_max: number | null;
  daily_estimate: string | null;
  back_items: { label: string; amount: string }[] | null;
  fee_items: { label: string; amount: string }[] | null;
  salary_notes: string | null;
  guarantee_period: string | null;
  guarantee_details: string | null;
  norma_info: string | null;
  unit_wage_type: string | null;
  payroll_system_type: string | null;
  payroll_system_description: string | null;
  trial_avg_hourly: string | null;
  trial_hourly: string | null;
  // 面接可能時間（文字列は後方互換、interview_start/interview_endが正）
  interview_hours: string | null;
  interview_start: string | null; // 例: "14:00"
  interview_end: string | null;   // 例: "19:00"
  same_day_trial: boolean;
  feature_tags: string[] | null;
  description: string | null;
  features_text: string | null;
  dress_code: string | null;
  images: { url: string; order: number }[] | null;
  video_url: string | null;
  analysis: Record<string, unknown> | null;
  interview_info: Record<string, unknown> | null;
  required_documents: { notes: string; documents: string[] } | null;
  schedule: Record<string, unknown> | null;
  recent_hires: Record<string, unknown>[] | null;
  recent_hires_summary: string | null;
  popular_features: string[] | null;
  recruitment_standards: string | null;
  rank: string | null;
  gal_point: number | null;
  loose_point: number | null;
  age_point: number | null;
  waiwai_point: number | null;
  cute_point: number | null;
  champagne_description: string | null;
  transfer_description: string | null;
  transfer_km: string | null;
  qa: { question: string; answer: string }[] | null;
  staff_comment: { name: string; role: string; comment: string; supports: string[] } | null;
  publish_status: "published" | "unpublished" | "draft";
  created_at: string;
  updated_at: string;
  reviews_count?: number;
}

export interface Review {
  id: number;
  user_id: number;
  store_id: number;
  rating: number;
  body: string;
  status: "published" | "unpublished" | "deleted";
  created_at: string;
  updated_at: string;
  user?: User;
  store?: Store;
}

export interface AiChatSetting {
  id: number;
  page_type: "top" | "list" | "detail";
  enabled: boolean;
  system_prompt: string;
  tone: "casual" | "formal" | "friendly";
  suggest_buttons: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface AdminUser {
  id: number;
  name: string;
  email: string;
  role: "super_admin" | "admin";
  status: "active" | "inactive";
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DashboardData {
  stats: {
    user_count: number;
    store_count: number;
    review_count: number;
    today_chat_count: number;
  };
  user_trend: { month: string; count: number }[];
  chat_trend: { date: string; count: number }[];
  line_stats: {
    friends: number;
    friends_change: string;
    today_added: number;
    unread_messages: number;
  };
  recent_messages: {
    id: number;
    user_id: number | null;
    name: string;
    avatar: string;
    message: string;
    time: string;
    unread: boolean;
  }[];
  activity_logs: {
    time: string;
    user: string;
    action: string;
    type: string;
  }[];
}

export interface LineFriend {
  id: number;
  user_id: number | null;
  line_user_id: string;
  display_name: string | null;
  picture_url: string | null;
  followed_at: string | null;
  unfollowed_at: string | null;
  is_following: boolean;
  created_at: string;
  updated_at: string;
  messages_count?: number;
  user?: User;
}

export interface LineMessage {
  id: number;
  line_user_id: string;
  user_id: number | null;
  direction: "inbound" | "outbound";
  message_type: string;
  content: string;
  line_message_id: string | null;
  read_at: string | null;
  created_at: string;
  updated_at: string;
}

// Area & Category management
export interface Area {
  id: number;
  name: string;
  slug: string;
  tier: "gold" | "standard";
  visible: boolean;
  sort_order: number;
  shop_count: number;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  color: string;
  visible: boolean;
  sort_order: number;
  shop_count: number;
}

// Content management
export interface PickupShop {
  id: number;
  store_id: number;
  sort_order: number;
  is_pr: boolean;
  visible: boolean;
  store: {
    id: number;
    name: string;
    area: string;
    category: string | null;
  };
  average_rating: number | null;
}

export interface Consultation {
  id: number;
  question: string;
  tag: string;
  count: number;
  visible: boolean;
  sort_order: number;
}

export interface BannerSettings {
  hero_tagline: string;
  hero_subtitle: string;
  hero_badge: string;
  hero_ai_label: string;
}

// コラム記事 (CMS)
export interface Article {
  id: number;
  slug: string;
  title: string;
  excerpt: string | null;
  body: Record<string, unknown> | null;   // TipTap JSON
  body_html: string | null;
  thumbnail_url: string | null;
  category: string | null;
  tags: string[] | null;
  status: "draft" | "published";
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ArticleSummary {
  id: number;
  slug: string;
  title: string;
  excerpt: string | null;
  thumbnail_url: string | null;
  category: string | null;
  tags?: string[] | null;
  published_at: string | null;
}

export interface PublicArticleIndexResponse {
  articles: Paginated<ArticleSummary>;
  categories: string[];
}

export interface PublicArticleShowResponse {
  article: Article;
  related: ArticleSummary[];
}

export interface AiChatStats {
  daily_stats: { date: string; count: number; total_tokens: number }[];
  top_users: { name: string; count: number }[];
  monthly_total: number;
  monthly_tokens: number;
  mode_stats?: {
    mode: string;
    count: number;
    total_input_tokens: number;
    total_output_tokens: number;
    total_tokens: number;
    avg_tokens: number;
  }[];
  mode_daily_stats?: {
    date: string;
    mode: string;
    count: number;
    total_tokens: number;
    avg_tokens: number;
  }[];
}


// ===== frontend/app/lib/user-auth.tsx =====
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { userApi } from "./api";
import type { User } from "./types";

interface UserAuthContextValue {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (token: string) => Promise<void>;
  logout: () => Promise<void>;
}

const UserAuthContext = createContext<UserAuthContextValue | null>(null);

export function UserAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    if (typeof window === "undefined") return null;
    const stored = localStorage.getItem("user_data");
    return stored ? JSON.parse(stored) : null;
  });
  const [token, setToken] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("user_token");
  });
  const [loading, setLoading] = useState(false);

  const fetchUser = useCallback(async (t: string) => {
    setLoading(true);
    try {
      const u = await userApi.get<User>("/user/me", t);
      setUser(u);
      localStorage.setItem("user_data", JSON.stringify(u));
    } catch {
      localStorage.removeItem("user_token");
      localStorage.removeItem("user_data");
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const login = useCallback(
    async (newToken: string) => {
      localStorage.setItem("user_token", newToken);
      setToken(newToken);
      await fetchUser(newToken);
    },
    [fetchUser],
  );

  const logout = useCallback(async () => {
    try {
      const t =
        typeof window !== "undefined"
          ? localStorage.getItem("user_token")
          : null;
      if (t) {
        await userApi.post("/user/logout", undefined, t);
      }
    } catch {
      // ignore errors on logout
    }
    localStorage.removeItem("user_token");
    localStorage.removeItem("user_data");
    setToken(null);
    setUser(null);
  }, []);

  // Verify token on mount
  useEffect(() => {
    if (!token) return;
    fetchUser(token);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <UserAuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user && !!token,
        loading,
        login,
        logout,
      }}
    >
      {children}
    </UserAuthContext.Provider>
  );
}

export function useUserAuth() {
  const ctx = useContext(UserAuthContext);
  if (!ctx)
    throw new Error("useUserAuth must be used within UserAuthProvider");
  return ctx;
}


// ===== frontend/app/components/user/shared/Footer.tsx =====
import { Link } from "react-router";

interface FooterProps {
  className?: string;
}

const footerLinks = [
  { label: "利用規約", to: "/terms" },
  { label: "プライバシーポリシー", to: "/privacy" },
  { label: "運営会社", to: "/company" },
  { label: "お問い合わせ", to: "/contact" },
  { label: "よくある質問", to: "/faq" },
  { label: "ヘルプセンター", to: "/help" },
];

export default function Footer({ className }: FooterProps) {
  return (
    <footer
      className={`px-4 py-12 sm:px-6 lg:px-8 ${className ?? ""}`}
      style={{ backgroundColor: "#1b2528" }}
    >
      <div className="mx-auto max-w-6xl">
        {/* Logo */}
        <div className="mb-8">
          <span
            className="text-2xl font-bold text-white"
            style={{ fontFamily: "'Domine', 'Noto Sans JP', sans-serif" }}
          >
            Recta
            <span style={{ color: "#D4AF37" }}>●</span>
          </span>
          <p className="mt-3 text-[11px] leading-relaxed" style={{ color: "rgba(255,255,255,0.45)", fontFamily: "'Noto Sans JP', sans-serif", fontWeight: 300, maxWidth: "274px" }}>
            AIがあなたにぴったりのナイトワークを提案。安心・安全な求人情報をお届けします。
          </p>
        </div>

        {/* Links grid */}
        <nav className="mb-8 grid grid-cols-2 gap-x-8 gap-y-3 sm:max-w-md">
          {footerLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="text-sm transition-colors"
              style={{ color: "rgba(255,255,255,0.6)" }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "#ffffff";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "rgba(255,255,255,0.6)";
              }}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Divider */}
        <div
          className="mb-6"
          style={{ borderTop: "1px solid rgba(255,255,255,0.1)" }}
        />

        {/* Social icons + Copyright */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex size-8 items-center justify-center rounded-[10px]" style={{ backgroundColor: "rgba(255,255,255,0.06)", border: "0.5px solid rgba(255,255,255,0.08)" }}>
                <div className="size-3.5 rounded-full" style={{ backgroundColor: "rgba(255,255,255,0.4)" }} />
              </div>
            ))}
          </div>
          <p className="text-[9px] tracking-wider" style={{ color: "rgba(255,255,255,0.2)", fontFamily: "'Domine', 'Noto Sans JP', sans-serif" }}>
            &copy; 2026 Recta Inc.
          </p>
        </div>
      </div>
    </footer>
  );
}


// ===== frontend/app/components/user/shared/BottomTabBar.tsx =====
import { Link, useLocation } from "react-router";
import { Home, Search, MessageCircle } from "lucide-react";
import { openLineFriendAdd } from "~/lib/line";

const tabs = [
  { label: "ホーム", icon: Home, to: "/" },
  { label: "一覧", icon: Search, to: "/stores" },
  { label: "LINEで相談", icon: MessageCircle, action: "line" as const },
];

export default function BottomTabBar({ inline = false }: { inline?: boolean }) {
  const location = useLocation();

  return (
    <nav
      className={
        inline
          ? "bg-white"
          : "fixed bottom-0 left-0 right-0 z-50 bg-white"
      }
      style={{ borderTop: "1px solid rgba(27,37,40,0.08)" }}
    >
      <div className="mx-auto flex max-w-md items-center justify-around py-2">
        {tabs.map((tab) => {
          const isActive =
            tab.to === "/"
              ? location.pathname === "/"
              : tab.to
                ? location.pathname.startsWith(tab.to)
                : false;

          const Icon = tab.icon;

          if (tab.action === "line") {
            return (
              <button
                key={tab.label}
                type="button"
                onClick={openLineFriendAdd}
                className="flex flex-col items-center gap-0.5 px-3 py-1"
              >
                <Icon
                  size={22}
                  strokeWidth={1.8}
                  style={{ color: "rgba(20,39,46,0.62)" }}
                />
                <span
                  className="text-[11px] font-medium leading-tight"
                  style={{
                    color: "rgba(20,39,46,0.62)",
                    fontFamily: "'Outfit', 'Noto Sans JP', sans-serif",
                  }}
                >
                  {tab.label}
                </span>
              </button>
            );
          }

          return (
            <Link
              key={tab.label}
              to={tab.to!}
              className="flex flex-col items-center gap-0.5 px-3 py-1"
            >
              <Icon
                size={22}
                strokeWidth={1.8}
                style={{ color: isActive ? "#D4AF37" : "rgba(20,39,46,0.62)" }}
              />
              <span
                className="text-[11px] font-medium leading-tight"
                style={{
                  color: isActive ? "#D4AF37" : "rgba(20,39,46,0.62)",
                  fontFamily: "'Outfit', 'Noto Sans JP', sans-serif",
                }}
              >
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}


// ===== frontend/app/components/user/shared/RecentlyViewedStores.tsx =====
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { Clock } from "lucide-react";

import { getViewedStores, type ViewedStore } from "~/lib/viewed-stores";

interface RecentlyViewedStoresProps {
  /** Hide this store id from the list (e.g. while on its own detail page) */
  excludeId?: number;
  /** Max items to render (default 5) */
  limit?: number;
  /** Optional title override */
  title?: string;
  /** Visual variant — `card` for white card with shadow (detail page),
   *  `flush` for horizontal scroller (top page). */
  variant?: "card" | "flush";
}

const GOLD = "#D4AF37";
const DARK = "#1b2528";

function formatHourly(min?: number, max?: number): string | null {
  if (!min && !max) return null;
  if (min && max) return `時給 ¥${min.toLocaleString()}〜¥${max.toLocaleString()}`;
  if (min) return `時給 ¥${min.toLocaleString()}〜`;
  return `時給 〜¥${max!.toLocaleString()}`;
}

export default function RecentlyViewedStores({
  excludeId,
  limit = 5,
  title = "あなたが見た記事",
  variant = "card",
}: RecentlyViewedStoresProps) {
  // Hydration-safe: render nothing on the server, populate on the client.
  const [items, setItems] = useState<ViewedStore[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
    setItems(getViewedStores());
  }, []);

  if (!hydrated) return null;

  const filtered = items
    .filter((s) => (excludeId ? s.id !== excludeId : true))
    .slice(0, limit);

  if (filtered.length === 0) return null;

  if (variant === "flush") {
    return (
      <section className="mt-6 px-5 pb-2">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div
              className="w-1 h-5 rounded-full"
              style={{ background: `linear-gradient(180deg,${GOLD},#c8960c)` }}
            />
            <h2
              style={{
                fontFamily: "'Outfit',sans-serif",
                fontWeight: 700,
                fontSize: "17px",
                letterSpacing: "-0.02em",
                color: DARK,
                margin: 0,
              }}
            >
              {title}
            </h2>
          </div>
        </div>
        <div
          className="flex gap-3 overflow-x-auto pb-2"
          style={{ scrollbarWidth: "none" }}
        >
          {filtered.map((store) => (
            <Link
              key={store.id}
              to={`/stores/${store.id}`}
              className="shrink-0 rounded-2xl overflow-hidden"
              style={{
                width: "180px",
                background: "white",
                boxShadow:
                  "0 4px 20px rgba(0,0,0,.06), 0 1px 3px rgba(0,0,0,.04)",
                border: "1px solid rgba(27,37,40,.06)",
                textDecoration: "none",
              }}
            >
              <div
                className="relative w-full overflow-hidden"
                style={{ height: "100px" }}
              >
                {store.image_url ? (
                  <img
                    src={store.image_url}
                    alt={store.name}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                ) : (
                  <div
                    className="absolute inset-0 flex items-center justify-center"
                    style={{
                      background:
                        "linear-gradient(135deg, #1b2528, #2a3a3f)",
                    }}
                  >
                    <span
                      style={{ fontSize: "22px", fontWeight: 700, color: GOLD }}
                    >
                      {store.name.charAt(0)}
                    </span>
                  </div>
                )}
              </div>
              <div className="px-3 py-2.5">
                <p
                  className="truncate"
                  style={{
                    fontFamily: "'Noto Sans JP',sans-serif",
                    fontWeight: 600,
                    fontSize: "12.5px",
                    color: DARK,
                    margin: 0,
                  }}
                >
                  {store.name}
                </p>
                {store.area && (
                  <p
                    className="truncate"
                    style={{
                      fontFamily: "'Noto Sans JP',sans-serif",
                      fontWeight: 400,
                      fontSize: "10px",
                      color: "rgba(27,37,40,.5)",
                      margin: "2px 0 0",
                    }}
                  >
                    {store.area}
                    {store.category ? ` / ${store.category}` : ""}
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      </section>
    );
  }

  // `card` variant — used on the StoreDetailPage to keep visual consistency
  // with the surrounding `SectionCard`s.
  return (
    <div
      className="overflow-hidden rounded-[16px] bg-white"
      style={{
        boxShadow:
          "0px 4px 20px rgba(0,0,0,0.06), 0px 1px 3px rgba(0,0,0,0.04)",
        border: "1px solid rgba(27,37,40,0.06)",
      }}
    >
      <div className="px-5 pt-5 pb-3">
        <h2
          className="font-heading flex items-center gap-2 pl-3 text-lg font-bold"
          style={{
            fontFamily: "'Domine', 'Noto Sans JP', sans-serif",
            color: DARK,
            borderLeft: `4px solid ${GOLD}`,
          }}
        >
          <Clock size={20} style={{ color: GOLD }} />
          {title}
        </h2>
      </div>
      <div className="px-5 pb-5">
        <div className="flex gap-3 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          {filtered.map((store) => {
            const wage = formatHourly(store.hourly_min, store.hourly_max);
            return (
              <Link
                key={store.id}
                to={`/stores/${store.id}`}
                className="shrink-0 rounded-xl overflow-hidden"
                style={{
                  width: "160px",
                  background: "#fcfeff",
                  border: "1px solid rgba(27,37,40,.06)",
                  textDecoration: "none",
                }}
              >
                <div className="relative w-full" style={{ height: "90px" }}>
                  {store.image_url ? (
                    <img
                      src={store.image_url}
                      alt={store.name}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  ) : (
                    <div
                      className="absolute inset-0 flex items-center justify-center"
                      style={{
                        background:
                          "linear-gradient(135deg, #1b2528, #2a3a3f)",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "20px",
                          fontWeight: 700,
                          color: GOLD,
                        }}
                      >
                        {store.name.charAt(0)}
                      </span>
                    </div>
                  )}
                </div>
                <div className="px-2.5 py-2">
                  <p
                    className="truncate text-xs font-bold"
                    style={{ color: DARK }}
                  >
                    {store.name}
                  </p>
                  {store.area && (
                    <p
                      className="truncate text-[10px]"
                      style={{ color: "rgba(27,37,40,.5)" }}
                    >
                      {store.area}
                    </p>
                  )}
                  {wage && (
                    <p
                      className="truncate text-[10px] mt-0.5"
                      style={{ color: GOLD, fontWeight: 600 }}
                    >
                      {wage}
                    </p>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}


// ===== frontend/app/components/user/AiChatPanel.tsx =====
import { useState, useEffect, useRef, useCallback } from "react";
import { openLineFriendAdd } from "~/lib/line";
import {
  Send,
  Loader2,
  Star,
  MapPin,
  Sparkles,
  Zap,
  BookOpen,
  Clock,
  Hash,
  Wrench,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Follow-up suggestion generator (client-side, replaces server-side logic)
// ---------------------------------------------------------------------------

function generateFollowUps(
  pageType: "top" | "list" | "detail",
  userMessage: string,
  aiResponse: string,
): string[] {
  if (pageType === "detail") {
    return ["体入の流れと時給", "バック・保証の詳細", "実際の雰囲気は？"];
  }

  const combined = userMessage + " " + aiResponse;
  const discussed = {
    area: /六本木|新宿|銀座|渋谷|池袋|恵比寿|麻布|表参道|歌舞伎町/.test(combined),
    salary: /時給|給料|給与|バック|稼/.test(combined),
    beginner: /未経験|初めて|初心者/.test(combined),
    trial: /体入|体験入店/.test(combined),
    norma: /ノルマ/.test(combined),
    guarantee: /保証/.test(combined),
  };

  const suggestions: string[] = [];
  if (!discussed.trial) suggestions.push("体入できるお店");
  if (!discussed.salary) suggestions.push("高時給ランキング");
  if (!discussed.beginner) suggestions.push("未経験でも安心なお店");
  if (!discussed.norma) suggestions.push("ノルマなしのお店");
  if (!discussed.guarantee) suggestions.push("保証制度があるお店");

  return suggestions.slice(0, 3).length > 0
    ? suggestions.slice(0, 3)
    : ["未経験OKのお店", "高時給のお店", "体入できるお店"];
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface StoreInfo {
  name: string;
  area?: string;
  category?: string;
  nearest_station?: string;
  hourly_min?: number;
  hourly_max?: number;
  feature_tags?: string[];
  description?: string;
  business_hours?: string;
  same_day_trial?: boolean;
  trial_hourly?: string | number | null;
}

interface AiChatPanelProps {
  pageType: "top" | "list" | "detail";
  storeId?: number;
  storeName?: string;
  /** Store data for detail page intro summary */
  storeInfo?: StoreInfo;
  className?: string;
  /** Preview mode: disables API calls, uses provided suggest buttons */
  preview?: boolean;
  /** Override suggest buttons (used in preview mode) */
  previewSuggestButtons?: string[];
}

interface StoreCard {
  id: number;
  name: string;
  area?: string;
  category?: string;
  nearest_station?: string;
  hourly_min?: number;
  hourly_max?: number;
  description?: string;
  images?: { url: string; order?: number }[];
}

interface MessageMeta {
  mode: string;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  response_ms: number;
  tool_calls: number;
  model?: string;
}

interface ChatMessage {
  role: "user" | "ai";
  content: string;
  stores?: StoreCard[];
  follow_ups?: string[];
  meta?: MessageMeta;
  showLineCta?: boolean;
}

type ChatMode = "agent" | "finetuned";

interface ChatConfigResponse {
  enabled: boolean;
  suggest_buttons: string[];
}

interface ChatApiResponse {
  message: string;
  stores?: StoreCard[];
  follow_ups?: string[];
  meta?: MessageMeta;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function fetchConfig(pageType: string): Promise<ChatConfigResponse> {
  const res = await fetch(`/api/chat/config?page_type=${pageType}`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error("Failed to fetch chat config");
  return res.json();
}

interface LimitError {
  message: string;
  limit_type: string;
}

async function sendMessage(
  message: string,
  pageType: string,
  history: { role: string; content: string }[],
  mode: ChatMode,
  storeId?: number,
  userArea?: string,
): Promise<ChatApiResponse> {
  // Include user token if available for optional auth
  const token = typeof window !== "undefined" ? localStorage.getItem("user_token") : null;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch("/api/chat", {
    method: "POST",
    headers,
    body: JSON.stringify({
      message,
      page_type: pageType,
      store_id: storeId,
      history,
      mode,
      user_area: userArea,
    }),
  });

  if (res.status === 429) {
    const data: LimitError = await res.json();
    const err = new Error(data.message) as Error & { limitType?: string };
    err.limitType = data.limit_type;
    throw err;
  }

  if (!res.ok) throw new Error("Failed to send message");
  return res.json();
}

function formatWage(min?: number, max?: number): string {
  if (min == null && max == null) return "";
  const fmt = (n: number) => n.toLocaleString();
  if (min != null && max != null) return `${fmt(min)}~${fmt(max)}円/h`;
  if (min != null) return `${fmt(min)}円~/h`;
  return `~${fmt(max!)}円/h`;
}

// ---------------------------------------------------------------------------
// Suggest action buttons data
// ---------------------------------------------------------------------------

const SUGGEST_ACTIONS = [
  {
    title: "質問する",
    subtitle: "AIに直接聞いてみる",
    chips: ["未経験でも大丈夫？", "ノルマなしのお店は？", "給与の相場を教えて", "日払いできる？", "昼職と掛け持ちできる？"],
  },
  {
    title: "状況を話す",
    subtitle: "自分の状況をAIに伝える",
    chips: ["週2〜3日だけ働きたい", "昼職があって夜も働きたい", "人見知りでも大丈夫？", "子育て中でも働ける？", "体験入店が怖い"],
  },
  {
    title: "不安を解消",
    subtitle: "本音の心配をそのまま",
    chips: ["バレないか心配", "安全なお店を探したい", "初日の流れは？", "面接はどんな感じ？", "体験入店って何？"],
  },
  {
    title: "条件で絞る",
    subtitle: "希望条件をそのまま入力",
    chips: ["渋谷・恵比寿エリア", "月収50万以上", "送迎あり", "個室あり", "ノルマなし・自由出勤"],
  },
];

// ---------------------------------------------------------------------------
// Intro animation script (per page type)
// ---------------------------------------------------------------------------

function formatCurrencyShort(n?: number) {
  if (!n) return "";
  return n.toLocaleString();
}

function getIntroScript(
  pageType: string,
  storeName?: string,
  storeInfo?: StoreInfo,
) {
  if (pageType === "detail" && storeInfo) {
    const s = storeInfo;
    const hourly =
      s.hourly_min && s.hourly_max
        ? `時給${formatCurrencyShort(s.hourly_min)}〜${formatCurrencyShort(s.hourly_max)}円`
        : "";
    const location = [s.area, s.nearest_station].filter(Boolean).join("・");
    const tags = (s.feature_tags ?? []).slice(0, 4).join("、");
    const trial = s.same_day_trial
      ? `体入OK${s.trial_hourly ? `（体入時給: ${s.trial_hourly}）` : ""}`
      : "";

    let summary = `${s.name}の情報をまとめますね！\n\n`;
    if (s.category && location) summary += `${s.category} ／ ${location}\n`;
    if (hourly) summary += `${hourly}\n`;
    if (s.business_hours) summary += `営業: ${s.business_hours}\n`;
    if (trial) summary += `${trial}\n`;
    if (tags) summary += `特徴: ${tags}\n`;
    summary += `\n気になることがあれば何でも聞いてくださいね。`;

    return {
      userMessage: `${s.name}について教えて`,
      aiMessage: summary,
    };
  }
  if (pageType === "detail" && storeName) {
    return {
      userMessage: `${storeName}について教えて`,
      aiMessage: `${storeName}の情報をお伝えしますね！時給や待遇、雰囲気など気になることがあれば何でも聞いてください。`,
    };
  }
  if (pageType === "list") {
    return {
      userMessage: "条件に合うお店を探したいです",
      aiMessage:
        "お任せください！エリアや時給、雰囲気などの希望を教えていただければ、ぴったりのお店をお探しします。",
    };
  }
  return {
    userMessage: "Rectaで良いお店みつかりますか？",
    aiMessage:
      "こんにちは！Rectaへようこそ。\nお仕事探しや業界についてのご相談、何でもお気軽にお聞きください！",
  };
}

// ---------------------------------------------------------------------------
// Meta badge component
// ---------------------------------------------------------------------------

function MetaBadge({ meta }: { meta: MessageMeta }) {
  return (
    <div className="mt-1.5 ml-8 flex flex-wrap items-center gap-1.5">
      {/* Mode */}
      <span
        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium"
        style={{
          backgroundColor:
            meta.mode === "agent"
              ? "rgba(212,175,55,0.12)"
              : "rgba(99,102,241,0.12)",
          color: meta.mode === "agent" ? "#D4AF37" : "#6366f1",
        }}
      >
        {meta.mode === "agent" ? (
          <Zap className="size-2.5" />
        ) : (
          <BookOpen className="size-2.5" />
        )}
        {meta.mode === "agent" ? "Agent" : "Fine-tuned"}
      </span>

      {/* Tokens */}
      <span
        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px]"
        style={{
          backgroundColor: "rgba(27,37,40,0.06)",
          color: "rgba(27,37,40,0.5)",
        }}
      >
        <Hash className="size-2.5" />
        {meta.total_tokens.toLocaleString()} tok
      </span>

      {/* Response time */}
      <span
        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px]"
        style={{
          backgroundColor: "rgba(27,37,40,0.06)",
          color: "rgba(27,37,40,0.5)",
        }}
      >
        <Clock className="size-2.5" />
        {meta.response_ms >= 1000
          ? `${(meta.response_ms / 1000).toFixed(1)}s`
          : `${meta.response_ms}ms`}
      </span>

      {/* Tool calls (agent mode only) */}
      {meta.tool_calls > 0 && (
        <span
          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px]"
          style={{
            backgroundColor: "rgba(212,175,55,0.08)",
            color: "#9a7a20",
          }}
        >
          <Wrench className="size-2.5" />
          {meta.tool_calls} tool{meta.tool_calls > 1 ? "s" : ""}
        </span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Suggest actions carousel (touch-scroll on mobile, arrow buttons on PC)
// ---------------------------------------------------------------------------

function SuggestActionsCarousel({
  actions,
  isLoading,
  onSend,
}: {
  actions: typeof SUGGEST_ACTIONS;
  isLoading: boolean;
  onSend: (text: string) => void;
}) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(0);

  const checkScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 2);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 2);
  }, []);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    checkScroll();
    el.addEventListener("scroll", checkScroll, { passive: true });
    const ro = new ResizeObserver(checkScroll);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", checkScroll);
      ro.disconnect();
    };
  }, [checkScroll]);

  const scroll = (direction: "left" | "right") => {
    const el = scrollContainerRef.current;
    if (!el) return;
    el.scrollBy({ left: direction === "left" ? -150 : 150, behavior: "smooth" });
  };

  const selectedChips = actions[selectedIdx]?.chips ?? [];

  return (
    <div>
      {/* Category tabs */}
      <div className="relative group">
        <style>{`.suggest-carousel::-webkit-scrollbar { display: none; }`}</style>
        <div
          ref={scrollContainerRef}
          className="suggest-carousel flex gap-2 px-5 pb-2 overflow-x-auto"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {actions.map((action, idx) => {
            const active = selectedIdx === idx;
            return (
              <button
                key={action.title}
                type="button"
                onClick={() => setSelectedIdx(idx)}
                disabled={isLoading}
                className="flex shrink-0 flex-col items-start gap-px rounded-[10px] bg-white pl-3 pr-3 py-[7px] text-left transition-all hover:shadow-md disabled:opacity-50"
                style={{
                  border: active
                    ? "0.5px solid rgba(27,37,40,0.22)"
                    : "0.5px solid rgba(27,37,40,0.15)",
                  boxShadow: active
                    ? "0px 1.5px 6px rgba(27,37,40,0.13), 0px 0.5px 2px rgba(27,37,40,0.08)"
                    : "none",
                }}
              >
                <span
                  className="text-[11px] leading-tight whitespace-nowrap"
                  style={{
                    color: active ? "#1b2528" : "rgba(27,37,40,0.7)",
                    fontWeight: active ? 500 : 400,
                  }}
                >
                  {action.title}
                </span>
                <span
                  className="text-[9px] leading-tight whitespace-nowrap"
                  style={{
                    color: active ? "rgba(27,37,40,0.45)" : "rgba(27,37,40,0.32)",
                    letterSpacing: "0.18px",
                  }}
                >
                  {action.subtitle}
                </span>
              </button>
            );
          })}
        </div>

        {/* Left arrow (PC hover) */}
        {canScrollLeft && (
          <button
            type="button"
            onClick={() => scroll("left")}
            className="absolute left-1 top-1/2 -translate-y-1/2 hidden sm:flex size-7 items-center justify-center rounded-full bg-white/90 shadow-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white"
            style={{ border: "0.5px solid rgba(27,37,40,0.12)" }}
          >
            <ChevronLeft className="size-4" style={{ color: "rgba(27,37,40,0.6)" }} />
          </button>
        )}

        {/* Right arrow (PC hover) */}
        {canScrollRight && (
          <button
            type="button"
            onClick={() => scroll("right")}
            className="absolute right-1 top-1/2 -translate-y-1/2 hidden sm:flex size-7 items-center justify-center rounded-full bg-white/90 shadow-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white"
            style={{ border: "0.5px solid rgba(27,37,40,0.12)" }}
          >
            <ChevronRight className="size-4" style={{ color: "rgba(27,37,40,0.6)" }} />
          </button>
        )}

        {/* Right fade hint */}
        {canScrollRight && (
          <div
            className="pointer-events-none absolute right-0 top-0 bottom-0 w-10"
            style={{ background: "linear-gradient(270deg, white 0%, transparent 100%)" }}
          />
        )}

        {/* Left fade hint */}
        {canScrollLeft && (
          <div
            className="pointer-events-none absolute left-0 top-0 bottom-0 w-10"
            style={{ background: "linear-gradient(90deg, white 0%, transparent 100%)" }}
          />
        )}
      </div>

      {/* Chips grid */}
      <div style={{ padding: "0 20px 14px" }}>
        <div style={{ overflowX: "auto", overflowY: "visible", scrollbarWidth: "none" as const, padding: "3px", margin: "-3px" }}>
          <div style={{ display: "grid", gridTemplateRows: "repeat(2, 30px)", gridAutoFlow: "column", gridAutoColumns: "max-content", gap: "8px" }}>
            {selectedChips.map((chip, i) => (
              <button
                key={chip}
                type="button"
                onClick={() => onSend(chip)}
                disabled={isLoading}
                className="flex items-center justify-center rounded-full bg-white transition-all active:scale-95 hover:shadow-md disabled:opacity-50"
                style={{
                  height: "30px",
                  padding: "0 13px",
                  border: "none",
                  boxShadow: "0px 1px 4px rgba(27,37,40,0.13), 0px 0px 0px 0.5px rgba(27,37,40,0.07)",
                  fontSize: "11px",
                  color: "#1b2528",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                {chip}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AiChatPanel({
  pageType,
  storeId,
  storeName,
  storeInfo,
  className,
  preview = false,
  previewSuggestButtons,
}: AiChatPanelProps) {
  const introScript = getIntroScript(pageType, storeName, storeInfo);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [suggestButtons, setSuggestButtons] = useState<string[]>([]);
  const [followUpButtons, setFollowUpButtons] = useState<string[]>([]);
  const [enabled, setEnabled] = useState(true);
  const [mode, setMode] = useState<ChatMode>("agent");
  const [limitReached, setLimitReached] = useState(false);

  // Intro animation state
  const [introPhase, setIntroPhase] = useState<
    "idle" | "typing-user" | "show-user" | "typing-ai" | "show-ai" | "done"
  >("idle");
  const [introUserText, setIntroUserText] = useState("");
  const [introAiText, setIntroAiText] = useState("");
  const [introPlayed, setIntroPlayed] = useState(false);

  const [userArea, setUserArea] = useState<string>("");

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // ---- Detect user area from geolocation (best-effort, once) ----
  useEffect(() => {
    if (preview) return;
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json&accept-language=ja`,
          );
          const data = await res.json();
          const area =
            data?.address?.city ||
            data?.address?.town ||
            data?.address?.county ||
            data?.address?.state ||
            "";
          if (area) setUserArea(area);
        } catch {
          // silently ignore
        }
      },
      () => {
        // permission denied or error — default to empty (Tokyo assumed)
      },
      { timeout: 5000 },
    );
  }, []);

  // ---- Load config ----
  useEffect(() => {
    if (preview) return;
    fetchConfig(pageType)
      .then((cfg) => {
        setEnabled(cfg.enabled);
        setSuggestButtons(cfg.suggest_buttons ?? []);
      })
      .catch(() => {});
  }, [pageType, preview]);

  // In preview mode, use previewSuggestButtons directly
  const activeSuggestButtons = preview ? (previewSuggestButtons ?? []) : suggestButtons;

  // ---- Intro animation: IntersectionObserver ----
  useEffect(() => {
    if (introPlayed || messages.length > 0) return;

    // In preview mode, start intro immediately
    if (preview) {
      if (introPhase === "idle") setIntroPhase("typing-user");
      return;
    }

    const el = panelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && introPhase === "idle") {
          setIntroPhase("typing-user");
          observer.disconnect();
        }
      },
      { threshold: 0.3 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [introPlayed, introPhase, messages.length, preview]);

  // ---- Intro animation: typewriter effect ----
  useEffect(() => {
    if (introPhase === "typing-user") {
      const fullText = introScript.userMessage;
      let i = 0;
      const interval = setInterval(() => {
        i++;
        setIntroUserText(fullText.slice(0, i));
        if (i >= fullText.length) {
          clearInterval(interval);
          setTimeout(() => setIntroPhase("show-user"), 300);
        }
      }, 50);
      return () => clearInterval(interval);
    }

    if (introPhase === "show-user") {
      const timer = setTimeout(() => setIntroPhase("typing-ai"), 800);
      return () => clearTimeout(timer);
    }

    if (introPhase === "typing-ai") {
      const timer = setTimeout(() => setIntroPhase("show-ai"), 1200);
      return () => clearTimeout(timer);
    }

    if (introPhase === "show-ai") {
      const fullText = introScript.aiMessage;
      let i = 0;
      const interval = setInterval(() => {
        i += 2;
        setIntroAiText(fullText.slice(0, i));
        if (i >= fullText.length) {
          clearInterval(interval);
          setIntroAiText(fullText);
          setTimeout(() => {
            setIntroPhase("done");
            setIntroPlayed(true);
          }, 500);
        }
      }, 30);
      return () => clearInterval(interval);
    }
  }, [introPhase]);

  // ---- Auto-scroll to bottom ----
  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      const el = scrollRef.current;
      if (el) {
        el.scrollTop = el.scrollHeight;
      }
    });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, scrollToBottom]);

  // ---- Send handler ----
  const handleSend = useCallback(
    async (text?: string) => {
      const msg = (text ?? input).trim();
      if (!msg || isLoading || limitReached || preview) return;

      if (introPhase !== "done" && introPhase !== "idle") {
        setIntroPhase("done");
        setIntroPlayed(true);
      }

      const userMessage: ChatMessage = { role: "user", content: msg };
      setMessages((prev) => [...prev, userMessage]);
      setInput("");
      setIsLoading(true);

      try {
        const history = [...messages, userMessage].map((m) => ({
          role: m.role === "ai" ? "assistant" : "user",
          content: m.content,
        }));

        const res = await sendMessage(msg, pageType, history, mode, storeId, userArea);

        // Strip [STORE:ID] markers and LINE boilerplate from AI text
        const cleanedMessage = res.message
          .replace(/\[STORE:\d+\]\s*/g, "")
          .replace(/\n*もっと詳しく知りたい方は、?LINEで担当者に直接相談できます[！!]?\s*/g, "")
          .replace(/\n*より詳しく知りたい方は、?LINEで担当者に直接相談できます[！!]?\s*/g, "")
          .trim();

        const aiMessage: ChatMessage = {
          role: "ai",
          content: cleanedMessage,
          stores: res.stores,
          follow_ups: res.follow_ups,
          meta: res.meta,
          showLineCta: true,
        };
        setMessages((prev) => [...prev, aiMessage]);
        setFollowUpButtons(generateFollowUps(pageType, input, cleanedMessage));
      } catch (err) {
        const error = err as Error & { limitType?: string };
        if (error.limitType) {
          // Usage limit reached
          const limitMessage: ChatMessage = {
            role: "ai",
            content: error.message,
          };
          setMessages((prev) => [...prev, limitMessage]);
          setLimitReached(true);
        } else {
          const errMessage: ChatMessage = {
            role: "ai",
            content:
              "申し訳ございません。エラーが発生しました。もう一度お試しください。",
          };
          setMessages((prev) => [...prev, errMessage]);
        }
      } finally {
        setIsLoading(false);
      }
    },
    [input, isLoading, messages, pageType, storeId, introPhase, mode, userArea, limitReached],
  );

  if (!enabled) return null;

  const hasMessages = messages.length > 0;
  const showIntro =
    !hasMessages &&
    introPhase !== "idle" &&
    (introPhase !== "done" || introPlayed);

  const showFollowUp =
    followUpButtons.length > 0 &&
    !isLoading &&
    messages.length > 0 &&
    messages[messages.length - 1]?.role === "ai";

  // Whether category chips are shown (top page, no messages yet)
  const showCategoryChips = !hasMessages && pageType === "top";

  return (
    <div
      ref={panelRef}
      className={`overflow-hidden rounded-[16px] ${className ?? ""}`}
      style={{
        backgroundColor: "#ffffff",
        border: "1px solid rgba(73,100,110,0.2)",
        boxShadow: "0px 4px 16px rgba(0,0,0,0.12), 0px 1px 4px rgba(0,0,0,0.08)",
        position: "relative",
        zIndex: 3,
        isolation: "isolate",
      }}
    >
      {/* ---- Header ---- */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <div
            className="flex size-[22px] shrink-0 items-center justify-center rounded-[10px]"
            style={{ background: "linear-gradient(135deg, #D4AF37 0%, #9a7a20 100%)" }}
          >
            <Sparkles className="size-3.5 text-white" />
          </div>
          <span
            className="text-[14px] font-bold"
            style={{ color: "#1b2528", fontFamily: "'Outfit', 'Noto Sans JP', sans-serif" }}
          >
            Recta AI
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* Mode toggle */}
          <button
            type="button"
            onClick={() => setMode(mode === "agent" ? "finetuned" : "agent")}
            className="rounded-full px-2 py-0.5 text-[9px] font-semibold transition-colors"
            style={{
              backgroundColor: mode === "agent" ? "rgba(212,175,55,0.12)" : "rgba(99,102,241,0.12)",
              color: mode === "agent" ? "#D4AF37" : "#6366f1",
              border: `0.5px solid ${mode === "agent" ? "rgba(212,175,55,0.3)" : "rgba(99,102,241,0.3)"}`,
            }}
          >
            {mode === "agent" ? "Agent" : "FT"}
          </button>
        </div>
      </div>

      {/* ---- Intro greeting (chat bubble style with typing animation) ---- */}
      {!hasMessages && introPhase !== "idle" && (
        <div className="flex flex-col gap-3 px-4 py-3.5">
          {/* User bubble */}
          {(introPhase === "show-user" || introPhase === "typing-ai" || introPhase === "show-ai" || introPhase === "done") && (
            <div className="flex justify-end">
              <div
                className="max-w-[80%] px-3.5 py-2.5 text-[13px] whitespace-pre-wrap leading-relaxed rounded-bl-[18px] rounded-br-[4px] rounded-tl-[18px] rounded-tr-[18px]"
                style={{
                  backgroundColor: "#eae7e3",
                  color: "rgba(27,37,40,0.88)",
                  boxShadow: "0px 1px 3px rgba(27,37,40,0.06)",
                }}
              >
                {introPhase === "show-user" ? introUserText : introScript.userMessage}
              </div>
            </div>
          )}
          {/* Typing dots */}
          {(introPhase === "typing-user") && (
            <div className="flex justify-end">
              <div
                className="px-3.5 py-2.5 rounded-bl-[18px] rounded-br-[4px] rounded-tl-[18px] rounded-tr-[18px]"
                style={{ backgroundColor: "#eae7e3" }}
              >
                <div className="flex items-center gap-1 py-0.5">
                  <span className="size-1.5 rounded-full animate-bounce [animation-delay:0ms]" style={{ backgroundColor: "rgba(27,37,40,0.35)" }} />
                  <span className="size-1.5 rounded-full animate-bounce [animation-delay:150ms]" style={{ backgroundColor: "rgba(27,37,40,0.35)" }} />
                  <span className="size-1.5 rounded-full animate-bounce [animation-delay:300ms]" style={{ backgroundColor: "rgba(27,37,40,0.35)" }} />
                </div>
              </div>
            </div>
          )}
          {/* AI typing dots */}
          {introPhase === "typing-ai" && (
            <div className="flex justify-start">
              <div
                className="mr-2 mt-auto flex size-6 shrink-0 items-center justify-center rounded-[10px]"
                style={{ background: "linear-gradient(135deg, #D4AF37 0%, #9a7a20 100%)" }}
              >
                <Sparkles className="size-3.5 text-white" />
              </div>
              <div
                className="px-3.5 py-2.5 rounded-bl-[18px] rounded-br-[18px] rounded-tl-[4px] rounded-tr-[18px]"
                style={{ backgroundColor: "white", border: "0.5px solid rgba(212,175,55,0.25)", boxShadow: "0px 2px 8px rgba(27,37,40,0.07)" }}
              >
                <div className="flex items-center gap-1 py-0.5">
                  <span className="size-1.5 rounded-full animate-bounce [animation-delay:0ms]" style={{ backgroundColor: "rgba(212,175,55,0.5)" }} />
                  <span className="size-1.5 rounded-full animate-bounce [animation-delay:150ms]" style={{ backgroundColor: "rgba(212,175,55,0.5)" }} />
                  <span className="size-1.5 rounded-full animate-bounce [animation-delay:300ms]" style={{ backgroundColor: "rgba(212,175,55,0.5)" }} />
                </div>
              </div>
            </div>
          )}
          {/* AI bubble */}
          {(introPhase === "show-ai" || introPhase === "done") && (
            <div className="flex justify-start">
              <div
                className="mr-2 mt-auto flex size-6 shrink-0 items-center justify-center rounded-[10px]"
                style={{ background: "linear-gradient(135deg, #D4AF37 0%, #9a7a20 100%)" }}
              >
                <Sparkles className="size-3.5 text-white" />
              </div>
              <div
                className="max-w-[80%] px-3.5 py-2.5 text-[13px] whitespace-pre-wrap leading-relaxed rounded-bl-[18px] rounded-br-[18px] rounded-tl-[4px] rounded-tr-[18px]"
                style={{
                  backgroundColor: "white",
                  color: "#1b2528",
                  border: "0.5px solid rgba(212,175,55,0.25)",
                  boxShadow: "0px 2px 8px rgba(27,37,40,0.07)",
                }}
              >
                {introAiText}
                {introPhase === "show-ai" && (
                  <span
                    className="inline-block w-0.5 h-3.5 ml-0.5 align-text-bottom animate-pulse"
                    style={{ backgroundColor: "rgba(212,175,55,0.4)" }}
                  />
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ---- Suggest actions (top page only) ---- */}
      {showCategoryChips && (
        <div className="pt-3">
          <SuggestActionsCarousel
            actions={SUGGEST_ACTIONS}
            isLoading={isLoading}
            onSend={handleSend}
          />
        </div>
      )}

      {/* ---- Quick question pills (hidden when category chips are shown) ---- */}
      {!hasMessages && !showCategoryChips && activeSuggestButtons.length > 0 && (
        <div className="px-5 pt-2 pb-4">
          <div className="flex flex-wrap gap-2">
            {activeSuggestButtons.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => handleSend(q)}
                disabled={isLoading}
                className="flex items-center justify-center rounded-full bg-white px-3.5 py-1.5 text-[11px] transition-all hover:shadow-md disabled:opacity-50"
                style={{
                  color: "#1b2528",
                  boxShadow: "0px 1px 4px rgba(27,37,40,0.13), 0px 0px 0px rgba(27,37,40,0.07)",
                }}
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ---- Messages area ---- */}
      {hasMessages && (
        <div
          ref={scrollRef}
          className="max-h-[360px] overflow-y-auto"
          style={{
            scrollBehavior: "smooth",
          }}
        >
          <div className="flex flex-col gap-3 px-4 py-3.5">
            {messages.map((msg, i) => {
              const isLimitMsg = limitReached && msg.role === "ai" && i === messages.length - 1;
              return (
              <div key={i}>
                <div
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {msg.role === "ai" && (
                    <div
                      className="mr-2 mt-auto flex size-6 shrink-0 items-center justify-center rounded-[10px]"
                      style={{
                        background: isLimitMsg
                          ? "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)"
                          : "linear-gradient(135deg, #D4AF37 0%, #9a7a20 100%)",
                      }}
                    >
                      {isLimitMsg ? <AlertTriangle className="size-3.5 text-white" /> : <Sparkles className="size-3.5 text-white" />}
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] px-3.5 py-2.5 text-[13px] whitespace-pre-wrap leading-relaxed ${
                      msg.role === "user"
                        ? "rounded-bl-[18px] rounded-br-[4px] rounded-tl-[18px] rounded-tr-[18px]"
                        : "rounded-bl-[18px] rounded-br-[18px] rounded-tl-[4px] rounded-tr-[18px]"
                    }`}
                    style={
                      msg.role === "user"
                        ? {
                            backgroundColor: "#eae7e3",
                            color: "rgba(27,37,40,0.88)",
                            boxShadow: "0px 1px 3px rgba(27,37,40,0.06)",
                          }
                        : isLimitMsg
                          ? {
                              backgroundColor: "#fffbeb",
                              color: "#92400e",
                              border: "1px solid rgba(245,158,11,0.35)",
                              boxShadow: "0px 2px 8px rgba(27,37,40,0.07)",
                            }
                          : {
                              backgroundColor: "white",
                              color: "#1b2528",
                              border: "0.5px solid rgba(212,175,55,0.25)",
                              boxShadow: "0px 2px 8px rgba(27,37,40,0.07)",
                            }
                    }
                  >
                    {msg.content}
                  </div>
                </div>

                {/* Meta info badge — hidden on top page where category chips exist */}
                {msg.role === "ai" && msg.meta && pageType !== "top" && (
                  <MetaBadge meta={msg.meta} />
                )}

                {/* Store cards (max 3) */}
                {(msg.stores ?? []).length > 0 && (
                  <div className="flex flex-col gap-2 mt-2 ml-8">
                    {(msg.stores ?? []).slice(0, 3).map((store) => {
                      const imgUrl = store.images?.[0]?.url;
                      return (
                        <a
                          key={store.id}
                          href={`/stores/${store.id}`}
                          className="flex gap-3 rounded-[10px] p-2.5 transition-all hover:shadow-sm"
                          style={{
                            border: "1px solid rgba(27,37,40,0.1)",
                            backgroundColor: "#ffffff",
                          }}
                        >
                          {/* Thumbnail */}
                          <div
                            className="shrink-0 rounded-[8px] overflow-hidden"
                            style={{
                              width: 110,
                              height: 81,
                              backgroundColor: "rgba(27,37,40,0.06)",
                            }}
                          >
                            {imgUrl ? (
                              <img
                                src={imgUrl}
                                alt={store.name}
                                className="size-full object-cover"
                              />
                            ) : (
                              <div className="flex size-full items-center justify-center">
                                <Star
                                  className="size-6"
                                  style={{ color: "rgba(27,37,40,0.15)" }}
                                />
                              </div>
                            )}
                          </div>

                          {/* Info */}
                          <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5">
                            <div
                              className="text-[13px] font-bold leading-tight truncate"
                              style={{ color: "#1b2528" }}
                            >
                              {store.name}
                            </div>
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px]" style={{ color: "rgba(27,37,40,0.5)" }}>
                              {(store.hourly_min != null || store.hourly_max != null) && (
                                <span className="font-medium" style={{ color: "#D4AF37" }}>
                                  {formatWage(store.hourly_min, store.hourly_max)}
                                </span>
                              )}
                              {store.nearest_station && (
                                <span className="flex items-center gap-0.5">
                                  <MapPin className="size-2.5 shrink-0" />
                                  {store.nearest_station}
                                </span>
                              )}
                              {!store.nearest_station && store.area && (
                                <span className="flex items-center gap-0.5">
                                  <MapPin className="size-2.5 shrink-0" />
                                  {store.area}
                                </span>
                              )}
                            </div>
                            {store.description && (
                              <p
                                className="text-[10px] leading-snug mt-0.5 line-clamp-2"
                                style={{ color: "rgba(27,37,40,0.55)" }}
                              >
                                {store.description}
                              </p>
                            )}
                          </div>
                        </a>
                      );
                    })}
                  </div>
                )}

                {/* LINE CTA card — shown when stores are returned OR AI mentioned LINE */}
                {msg.role === "ai" && msg.showLineCta && (
                  <div className="mt-2 ml-8">
                    <div
                      className="rounded-[16px] px-4 py-3.5"
                      style={{ backgroundColor: "#f3f2ee" }}
                    >
                      <p
                        className="text-[13px] leading-relaxed mb-2.5"
                        style={{ color: "rgba(27,37,40,0.7)" }}
                      >
                        より詳しい最新の情報を聞きたい場合{"\n"}
                        <span className="font-medium" style={{ color: "#1b2528" }}>
                          LINE登録して直接ご相談下さい！
                        </span>
                      </p>
                      <button
                        type="button"
                        onClick={openLineFriendAdd}
                        className="flex w-full items-center justify-center gap-2 rounded-[8px] py-2.5 text-[13px] font-bold text-white transition-opacity hover:opacity-90"
                        style={{ backgroundColor: "#06C755" }}
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                          <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
                        </svg>
                        LINE公式で直接相談する
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
            })}

            {/* Loading indicator */}
            {isLoading && (
              <div className="flex items-end gap-2">
                <div
                  className="flex size-6 shrink-0 items-center justify-center rounded-[10px]"
                  style={{
                    background:
                      "linear-gradient(135deg, #D4AF37 0%, #9a7a20 100%)",
                  }}
                >
                  <Sparkles className="size-3.5 text-white" />
                </div>
                <div
                  className="rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-1"
                  style={{
                    backgroundColor: "white",
                    border: "1px solid rgba(212,175,55,0.25)",
                    boxShadow: "0px 2px 8px rgba(27,37,40,0.07)",
                  }}
                >
                  <span
                    className="size-2 rounded-full animate-bounce [animation-delay:0ms]"
                    style={{ backgroundColor: "rgba(27,37,40,0.3)" }}
                  />
                  <span
                    className="size-2 rounded-full animate-bounce [animation-delay:150ms]"
                    style={{ backgroundColor: "rgba(27,37,40,0.3)" }}
                  />
                  <span
                    className="size-2 rounded-full animate-bounce [animation-delay:300ms]"
                    style={{ backgroundColor: "rgba(27,37,40,0.3)" }}
                  />
                </div>
              </div>
            )}

            {/* Follow-up pills */}
            {showFollowUp && (
              <div className="flex flex-wrap gap-2 mt-1">
                {followUpButtons.map((label) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => handleSend(label)}
                    className="rounded-full bg-white px-3.5 py-1.5 text-[11px] transition-all hover:shadow-md"
                    style={{
                      color: "#1b2528",
                      boxShadow: "0px 1px 4px rgba(27,37,40,0.13), 0px 0px 0px rgba(27,37,40,0.07)",
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ---- Chat input ---- */}
      <div className="px-4 pb-3 pt-3">
        <form
          className="flex items-center gap-2.5"
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
        >
          <div
            className="relative flex flex-1 items-center rounded-[16px] px-4"
            style={{
              backgroundColor: "#ffffff",
              height: "32px",
              border: "1px solid rgba(0,0,0,0.2)",
            }}
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={limitReached ? "利用上限に達しました" : "何でも聞いてください"}
              disabled={isLoading || limitReached}
              className="h-full w-full bg-transparent text-[13px] outline-none disabled:opacity-50"
              style={{
                color: "#1b2528",
                fontFamily: "'Noto Sans JP', sans-serif",
              }}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading || limitReached}
              className="flex size-8 shrink-0 items-center justify-center rounded-[14px] transition-opacity disabled:opacity-30"
              style={{
                backgroundColor: "rgba(27,37,40,0.1)",
              }}
              aria-label="送信"
            >
              {isLoading ? (
                <Loader2
                  className="size-3.5 animate-spin"
                  style={{ color: "rgba(27,37,40,0.35)" }}
                />
              ) : (
                <Send
                  className="size-3.5"
                  style={{ color: "rgba(27,37,40,0.35)" }}
                />
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


// ===== frontend/app/components/user/TopPage.tsx =====
import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router";
import AiChatPanel from "~/components/user/AiChatPanel";
import Footer from "~/components/user/shared/Footer";
import BottomTabBar from "~/components/user/shared/BottomTabBar";
import RecentlyViewedStores from "~/components/user/shared/RecentlyViewedStores";
import { useUserAuth } from "~/lib/user-auth";

// ─── Constants ─────────────────────────────────────
const GOLD = "#D4AF37";
const DARK = "#1b2528";
const J = "'Noto Sans JP',sans-serif";
const AI_AVATAR_BG = "linear-gradient(135deg,#D4AF37,#9a7a20)";
const ROBOT_SVG_PATH = "M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1a7 7 0 0 1-7 7H9a7 7 0 0 1-7-7H1a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73A2 2 0 0 1 12 2zm-4 9a1 1 0 1 0 0 2 1 1 0 0 0 0-2zm8 0a1 1 0 1 0 0 2 1 1 0 0 0 0-2z";
const BASE_GRADIENT = `linear-gradient(180deg, ${DARK} 0px, ${DARK} 40px, rgba(27,37,40,.85) 80px, rgba(27,37,40,.55) 120px, rgba(27,37,40,.25) 162px, rgba(27,37,40,.07) 198px, #f5f5f5 230px, #f5f5f5 100%)`;

// ─── Types ─────────────────────────────────────────
interface PickupShop {
  id: number;
  name: string;
  area?: string;
  category?: string;
  hourly_min?: number;
  hourly_max?: number;
  feature_tags?: string[];
  images?: (string | { url: string })[];
  is_pr?: boolean;
  reviews_count?: number;
  average_rating?: number;
}

interface Area {
  id: number;
  name: string;
  slug: string;
  tier?: string;
  store_count?: number;
}

interface Category {
  id: number;
  name: string;
  slug: string;
  color: string;
  store_count?: number;
}

interface RecentReviewUser {
  line_display_name?: string | null;
  line_picture_url?: string | null;
  use_line_avatar?: boolean;
  nickname?: string | null;
}

interface RecentReview {
  id: number;
  rating: number;
  body: string;
  tweet_id?: string | null;
  tweet_author_screen_name?: string | null;
  created_at: string;
  store: { id: number; name: string; area: string; category: string } | null;
  user: RecentReviewUser | null;
}

interface HomeData {
  banner?: { hero_tagline?: string; hero_subtitle?: string };
  pickup_shops?: PickupShop[];
  consultations?: { id: number; question: string; tag?: string; answer?: string; count?: number }[];
  areas?: Area[];
  categories?: Category[];
  recent_reviews?: RecentReview[];
}

// ─── Helpers ───────────────────────────────────────

function formatRelative(iso: string): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const diffMs = Date.now() - t;
  const sec = Math.max(0, Math.floor(diffMs / 1000));
  if (sec < 60) return "たった今";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}分前`;
  const hour = Math.floor(min / 60);
  if (hour < 24) return `${hour}時間前`;
  const day = Math.floor(hour / 24);
  if (day < 7) return `${day}日前`;
  const week = Math.floor(day / 7);
  if (week < 5) return `${week}週間前`;
  const month = Math.floor(day / 30);
  if (month < 12) return `${month}ヶ月前`;
  return `${Math.floor(day / 365)}年前`;
}

// ─── Static Data ────────────────────────────────────

const TRENDING_POOL = [
  { q: "未経験だけどラウンジで働ける？", count: "1.2k", tag: "未経験", a: "はい、大丈夫です！ラウンジは未経験からスタートする方がとても多い業種です。お店側も丁寧に研修してくれるところが多いので、安心してチャレンジできますよ。" },
  { q: "キャバクラとラウンジの違いは？", count: "980", tag: "比較", a: "大きな違いは接客スタイルです。キャバクラは指名制でマンツーマン、ラウンジはフリーで複数のお客様と会話するスタイルが一般的。ラウンジの方がカジュアルな雰囲気のお店が多いです。" },
  { q: "日払いできるお店を探してます", count: "870", tag: "給与", a: "日払い対応のお店はたくさんありますよ！Rectaでは「日払いOK」の条件で絞り込み検索ができます。体験入店でも当日払いのお店が多いです。" },
  { q: "週2だけでも大丈夫なお店ある？", count: "1.5k", tag: "シフト", a: "もちろんです！週1〜2日OKのお店も増えています。特にラウンジやスナックは自由出勤制のところが多く、学生さんやWワークの方にも人気ですよ。" },
  { q: "送迎ありのお店が知りたい", count: "640", tag: "待遇", a: "送迎サービスは多くのお店で用意されています。自宅近くまで送ってもらえるお店や、駅までの送迎など形態はさまざま。Rectaで「送迎あり」で検索してみてくださいね。" },
  { q: "体験入店ってどんな流れ？", count: "2.1k", tag: "体入", a: "一般的には、①お店に到着→②簡単な説明→③ドレスに着替え→④2〜3時間ほど接客体験→⑤体験終了・お給料受け取り、という流れです。気軽に雰囲気を見られるので、まずは体験からがおすすめです。" },
  { q: "昼職と掛け持ちできますか？", count: "1.8k", tag: "Wワーク", a: "掛け持ちしている方はとても多いです！週末だけ、平日の夜だけなど柔軟に働けるお店を選べば無理なく両立できます。Rectaでは勤務時間帯でも絞り込みできますよ。" },
  { q: "ノルマなしのお店は本当にある？", count: "1.1k", tag: "条件", a: "あります！特にラウンジやスナックはノルマなしのお店が多いです。キャバクラでも最近はノルマなしを打ち出すお店が増えています。求人情報で確認してみてくださいね。" },
  { q: "面接では何を聞かれるの？", count: "760", tag: "面接", a: "主に「希望の出勤日数」「いつから働けるか」「経験の有無」など基本的なことが中心です。堅苦しい面接ではなく、カジュアルな面談形式がほとんどなのでリラックスして大丈夫ですよ。" },
  { q: "渋谷エリアの時給相場は？", count: "920", tag: "エリア", a: "渋谷エリアの相場は、ラウンジで時給3,000〜5,000円、キャバクラで時給4,000〜7,000円程度が目安です。もちろんお店や経験によって変動しますので、詳しくはRectaで比較してみてください。" },
  { q: "容姿に自信がなくても大丈夫？", count: "1.4k", tag: "不安", a: "大丈夫です！ナイトワークは容姿だけでなく、会話力や雰囲気、気配りなど総合的な魅力が大切です。お店によって求める雰囲気も違うので、自分に合ったお店がきっと見つかりますよ。" },
  { q: "お酒が飲めなくても働ける？", count: "1.6k", tag: "不安", a: "飲めなくても問題ないお店はたくさんあります！ソフトドリンクやノンアルコールで対応できるお店も多いです。面接時に正直に伝えれば、配慮してもらえますよ。" },
  { q: "バレずに働ける方法はある？", count: "2.3k", tag: "プライバシー", a: "多くのお店がプライバシー保護に配慮しています。源氏名の使用、写真掲載NG、特定エリアのお客様ブロックなど対策はさまざま。面接時に相談すれば柔軟に対応してくれるお店が多いです。" },
  { q: "銀座のクラブと六本木の違いは？", count: "530", tag: "エリア", a: "銀座はフォーマルで落ち着いた大人の社交場、六本木はカジュアルで華やかな雰囲気が特徴です。銀座は時給が高めですがマナーや身だしなみの基準も厳しめ。自分のスタイルに合うエリアを選ぶのがおすすめです。" },
  { q: "子育て中でもナイトワークできる？", count: "710", tag: "ライフスタイル", a: "働いているママさんも多いですよ！早い時間帯のシフトや週末のみなど、お子さんの生活に合わせた働き方ができるお店もあります。送迎付きなら帰宅時間も安心ですね。" },
];

const CATEGORY_IMAGES: Record<string, string> = {
  "ラウンジ": "https://images.unsplash.com/photo-1573830540758-68d5a242fc79?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400",
  "キャバクラ": "https://images.unsplash.com/photo-1620022604911-126743712882?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400",
  "クラブ": "https://images.unsplash.com/photo-1628500548389-3557986eba8c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400",
  "ガールズバー": "https://images.unsplash.com/photo-1758526348234-2dd7170514d0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400",
  "コンカフェ": "https://images.unsplash.com/photo-1612452556802-f9e9ab097eaf?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400",
};


// ─── Helper Components ─────────────────────────────

function AiAvatar({ size }: { size: number }) {
  const iconSize = size * 0.625;
  return (
    <div
      style={{
        width: size, height: size,
        borderRadius: size * 0.44,
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0, background: AI_AVATAR_BG,
      }}
    >
      <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none">
        <path d={ROBOT_SVG_PATH} fill="white" />
      </svg>
    </div>
  );
}

function GlowOrbs() {
  return (
    <div style={{ position: "absolute", inset: 0, height: "260px", overflow: "hidden", pointerEvents: "none", zIndex: 1 }}>
      <div style={{ position: "absolute", top: "-30px", left: "50%", transform: "translateX(-50%)", width: "200px", height: "200px", borderRadius: "50%", background: "rgba(212,175,55,.45)", filter: "blur(60px)", animation: "orbFloat1 6s ease-in-out infinite" }} />
      <div style={{ position: "absolute", top: "30px", right: "-20px", width: "150px", height: "150px", borderRadius: "50%", background: "rgba(200,96,128,.35)", filter: "blur(55px)", animation: "orbFloat2 7s ease-in-out infinite" }} />
      <div style={{ position: "absolute", top: "60px", left: "-30px", width: "130px", height: "130px", borderRadius: "50%", background: "rgba(0,126,172,.25)", filter: "blur(50px)", animation: "orbFloat3 8s ease-in-out infinite" }} />
      <div style={{ position: "absolute", top: "10px", left: "35%", width: "80px", height: "80px", borderRadius: "50%", background: "rgba(255,220,100,.3)", filter: "blur(35px)", animation: "orbFloat2 5s ease-in-out infinite reverse" }} />
    </div>
  );
}

function EdgeTop() {
  return (
    <div style={{ position: "relative", height: "54px", marginBottom: "-1px" }}>
      <div style={{ position: "absolute", top: "-8px", left: "8%", width: "84%", height: "28px", background: "radial-gradient(ellipse 100% 100%, rgba(212,175,55,.18) 0%, transparent 70%)", pointerEvents: "none" }} />
      <svg viewBox="0 0 430 54" preserveAspectRatio="none" style={{ width: "100%", height: "100%", display: "block", filter: "drop-shadow(0 6px 18px rgba(27,37,40,.25))" }}>
        <defs>
          <linearGradient id="eT1g" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor={GOLD} stopOpacity="0.15" /><stop offset="25%" stopColor={GOLD} stopOpacity="0.7" /><stop offset="50%" stopColor={GOLD} stopOpacity="0.25" /><stop offset="75%" stopColor={GOLD} stopOpacity="0.8" /><stop offset="100%" stopColor={GOLD} stopOpacity="0.2" /></linearGradient>
        </defs>
        <path d="M0,54 L430,54 L430,14 C380,4 310,26 250,16 C190,6 130,28 70,22 C35,19 10,30 0,36 Z" fill={DARK} />
        <path d="M0,36 C10,30 35,19 70,22 C130,28 190,6 250,16 C310,26 380,4 430,14" fill="none" stroke={GOLD} strokeWidth="12" opacity="0.08" />
        <path d="M0,36 C10,30 35,19 70,22 C130,28 190,6 250,16 C310,26 380,4 430,14" fill="none" stroke="url(#eT1g)" strokeWidth="2.5" />
        <path d="M0,35 C10,29 35,18 70,21 C130,27 190,5 250,15 C310,25 380,3 430,13" fill="none" stroke="rgba(255,255,255,.15)" strokeWidth="0.8" />
      </svg>
    </div>
  );
}

function EdgeBottom() {
  return (
    <div style={{ position: "relative", height: "54px", marginTop: "-1px" }}>
      <svg viewBox="0 0 430 54" preserveAspectRatio="none" style={{ width: "100%", height: "100%", display: "block", filter: "drop-shadow(0 -6px 18px rgba(27,37,40,.25))" }}>
        <defs><linearGradient id="eB1g" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor={GOLD} stopOpacity="0.2" /><stop offset="30%" stopColor={GOLD} stopOpacity="0.8" /><stop offset="55%" stopColor={GOLD} stopOpacity="0.2" /><stop offset="80%" stopColor={GOLD} stopOpacity="0.7" /><stop offset="100%" stopColor={GOLD} stopOpacity="0.15" /></linearGradient></defs>
        <path d="M0,0 L430,0 L430,40 C380,48 310,28 250,38 C190,48 130,26 70,34 C35,38 10,28 0,20 Z" fill={DARK} />
        <path d="M0,20 C10,28 35,38 70,34 C130,26 190,48 250,38 C310,28 380,48 430,40" fill="none" stroke={GOLD} strokeWidth="12" opacity="0.08" />
        <path d="M0,20 C10,28 35,38 70,34 C130,26 190,48 250,38 C310,28 380,48 430,40" fill="none" stroke="url(#eB1g)" strokeWidth="2.5" />
        <path d="M0,19 C10,27 35,37 70,33 C130,25 190,47 250,37 C310,27 380,47 430,39" fill="none" stroke="rgba(255,255,255,.15)" strokeWidth="0.8" />
      </svg>
      <div style={{ position: "absolute", bottom: "-6px", left: "8%", width: "84%", height: "20px", background: "radial-gradient(ellipse, rgba(212,175,55,.15) 0%, transparent 70%)", pointerEvents: "none" }} />
    </div>
  );
}

function EdgeTopFooter() {
  return (
    <div style={{ position: "relative", height: "44px", marginBottom: "-1px" }}>
      <div style={{ position: "absolute", top: "-6px", left: "10%", width: "80%", height: "18px", background: "radial-gradient(ellipse, rgba(212,175,55,.14) 0%, transparent 70%)", pointerEvents: "none" }} />
      <svg viewBox="0 0 430 44" preserveAspectRatio="none" style={{ width: "100%", height: "100%", display: "block", filter: "drop-shadow(0 5px 16px rgba(27,37,40,.2))" }}>
        <defs><linearGradient id="eF1g" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor={GOLD} stopOpacity="0.4" /><stop offset="40%" stopColor={GOLD} stopOpacity="0.2" /><stop offset="70%" stopColor={GOLD} stopOpacity="0.6" /><stop offset="100%" stopColor={GOLD} stopOpacity="0.15" /></linearGradient></defs>
        <path d="M0,44 L430,44 L430,10 C370,4 290,20 215,12 C140,4 70,18 0,24 Z" fill={DARK} />
        <path d="M0,24 C70,18 140,4 215,12 C290,20 370,4 430,10" fill="none" stroke="url(#eF1g)" strokeWidth="2" />
        <path d="M0,23 C70,17 140,3 215,11 C290,19 370,3 430,9" fill="none" stroke="rgba(255,255,255,.12)" strokeWidth="0.7" />
      </svg>
    </div>
  );
}

// ─── Trending Topics ───────────────────────────────

interface TrendingItem {
  q: string;
  a: string;
  tag?: string;
  count?: string;
}

function shuffleAndPick<T>(pool: T[], count: number, exclude?: T[]): T[] {
  const available = exclude ? pool.filter(p => !exclude.includes(p)) : [...pool];
  for (let i = available.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [available[i], available[j]] = [available[j], available[i]];
  }
  return available.slice(0, count);
}

function TrendingTopics({ pool }: { pool: TrendingItem[] }) {
  const DISPLAY_COUNT = 4;
  const safePool = pool.length > 0 ? pool : TRENDING_POOL;
  const [items, setItems] = useState(() => shuffleAndPick(safePool, DISPLAY_COUNT));
  const [visibleCount, setVisibleCount] = useState(0);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const answerRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [answerHeights, setAnswerHeights] = useState<number[]>([]);
  const cycleRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const CYCLE_INTERVAL = 12000;
  const isAccordionOpen = openIdx !== null;

  useEffect(() => {
    if (isRegenerating) return;
    requestAnimationFrame(() => {
      const heights = answerRefs.current.map(el => el?.scrollHeight ?? 0);
      setAnswerHeights(heights);
    });
  }, [items, isRegenerating]);

  const regenerate = useCallback((manual = false) => {
    setIsRegenerating(true);
    setVisibleCount(0);
    setProgress(0);
    setOpenIdx(null);
    setTimeout(() => {
      setItems(prev => shuffleAndPick(safePool, DISPLAY_COUNT, prev));
      setIsRegenerating(false);
    }, manual ? 500 : 400);
  }, [safePool]);

  useEffect(() => {
    if (isRegenerating) return;
    let i = 0;
    const iv = setInterval(() => {
      i++;
      setVisibleCount(i);
      if (i >= DISPLAY_COUNT) clearInterval(iv);
    }, 120);
    return () => clearInterval(iv);
  }, [items, isRegenerating]);

  useEffect(() => {
    if (isRegenerating || isAccordionOpen) return;
    const startTime = Date.now();
    const piv = setInterval(() => {
      const elapsed = Date.now() - startTime;
      setProgress(Math.min(elapsed / CYCLE_INTERVAL, 1));
    }, 50);
    cycleRef.current = setTimeout(() => { regenerate(false); }, CYCLE_INTERVAL);
    return () => {
      clearInterval(piv);
      if (cycleRef.current) clearTimeout(cycleRef.current);
    };
  }, [items, isRegenerating, regenerate, isAccordionOpen]);

  return (
    <div className="mt-8 px-5">
      <div style={{ height: "1px", background: "linear-gradient(90deg, transparent, rgba(212,175,55,.25) 20%, rgba(200,96,128,.18) 80%, transparent)", marginBottom: "20px" }} />

      <div className="flex items-center justify-between mb-1">
        <h2 style={{ fontFamily: J, fontWeight: 600, fontSize: "15px", color: DARK, margin: 0 }}>みんなの相談</h2>
        <button
          onClick={() => { if (cycleRef.current) clearTimeout(cycleRef.current); regenerate(true); }}
          className="flex items-center gap-1 active:scale-95"
          style={{ background: "none", border: "none", cursor: "pointer", padding: "4px 0" }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" style={{ transition: "transform .4s ease", transform: isRegenerating ? "rotate(180deg)" : "rotate(0deg)" }}>
            <path d="M21 2v6h-6M3 12a9 9 0 0 1 15-6.7L21 8M3 22v-6h6M21 12a9 9 0 0 1-15 6.7L3 16" stroke={GOLD} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span style={{ fontFamily: J, fontWeight: 400, fontSize: "11px", color: "rgba(212,175,55,.8)" }}>更新</span>
        </button>
      </div>
      <div className="flex items-center gap-2 mb-3">
        <p style={{ fontFamily: J, fontWeight: 300, fontSize: "11px", color: "rgba(27,37,40,.4)", margin: 0 }}>AIがリアルタイムで分析したトレンド相談</p>
        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded" style={{ background: "rgba(212,175,55,.08)" }}>
          <span className="relative flex h-[5px] w-[5px]">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60" style={{ background: GOLD }} />
            <span className="relative inline-flex rounded-full h-[5px] w-[5px]" style={{ background: GOLD }} />
          </span>
          <span style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 600, fontSize: "8px", letterSpacing: "0.12em", color: "rgba(212,175,55,.9)" }}>LIVE</span>
        </div>
      </div>

      <div style={{ height: "1.5px", background: "rgba(27,37,40,.06)", borderRadius: "1px", marginBottom: "10px", overflow: "hidden" }}>
        <div style={{ height: "100%", width: isAccordionOpen ? "0%" : `${progress * 100}%`, background: `linear-gradient(90deg,${GOLD},rgba(212,175,55,.3))`, borderRadius: "1px", transition: progress === 0 || isAccordionOpen ? "none" : "width .1s linear" }} />
      </div>

      <div className="flex flex-col gap-2.5" style={{ minHeight: "240px" }}>
        {isRegenerating ? (
          <div className="flex items-center justify-center gap-2" style={{ animation: "slideInLeft .3s ease both", minHeight: "240px" }}>
            <AiAvatar size={20} />
            <div className="flex items-center gap-[5px]">
              {[0, 1, 2].map(i => (
                <span key={i} className="inline-block w-[5px] h-[5px] rounded-full" style={{ background: GOLD, animation: `typingWave 1.3s ease-in-out ${i * 0.18}s infinite`, opacity: 0.7 }} />
              ))}
            </div>
            <span style={{ fontFamily: J, fontWeight: 400, fontSize: "11px", color: "rgba(27,37,40,.4)" }}>トレンドを分析中…</span>
          </div>
        ) : items.map((item, i) => {
          const isOpen = openIdx === i;
          return (
            <div
              key={`${item.q}-${i}`}
              className="rounded-xl"
              style={{
                background: "white",
                border: isOpen ? "1px solid rgba(212,175,55,.25)" : "1px solid rgba(27,37,40,.08)",
                boxShadow: "0 1px 4px rgba(0,0,0,.04)",
                overflow: "hidden",
                opacity: i < visibleCount ? 1 : 0,
                transform: i < visibleCount ? "translateY(0)" : "translateY(8px)",
                transition: "opacity .35s ease, transform .35s ease, border-color .25s ease",
              }}
            >
              <button
                onClick={() => setOpenIdx(prev => prev === i ? null : i)}
                className="flex items-center gap-3 px-4 w-full"
                style={{ background: "transparent", border: "none", height: "52px", cursor: "pointer" }}
              >
                <div className="flex items-center justify-center shrink-0" style={{ width: "26px", height: "26px", borderRadius: "8px", background: "linear-gradient(135deg,rgba(212,175,55,.12),rgba(212,175,55,.04))", border: "1px solid rgba(212,175,55,.18)" }}>
                  <AiAvatar size={16} />
                </div>
                <div className="flex-1 text-left" style={{ minWidth: 0 }}>
                  <p style={{ fontFamily: J, fontWeight: isOpen ? 500 : 400, fontSize: "12px", color: DARK, margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.q}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span style={{ fontFamily: J, fontWeight: 400, fontSize: "9.5px", color: "rgba(27,37,40,.35)" }}>{item.count}件の相談</span>
                    <span style={{ fontFamily: J, fontWeight: 500, fontSize: "9px", color: "rgba(200,96,128,.7)", background: "rgba(200,96,128,.08)", padding: "1px 6px", borderRadius: "4px" }}>#{item.tag}</span>
                  </div>
                </div>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="shrink-0" style={{ transition: "transform .25s ease", transform: isOpen ? "rotate(90deg)" : "rotate(0deg)" }}>
                  <path d="M9 18l6-6-6-6" stroke={isOpen ? GOLD : "rgba(27,37,40,.25)"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transition: "stroke .25s" }} />
                </svg>
              </button>

              <div style={{ height: isOpen ? `${answerHeights[i] ?? 0}px` : "0px", overflow: "hidden", transition: "height .3s cubic-bezier(.4,0,.2,1)" }}>
                <div ref={(el) => { answerRefs.current[i] = el; }} style={{ padding: "0 16px 14px" }}>
                  <div style={{ borderTop: "1px solid rgba(27,37,40,.06)", paddingTop: "12px" }}>
                    <div className="flex gap-2.5" style={{ marginLeft: "4px" }}>
                      <AiAvatar size={20} />
                      <div className="flex-1" style={{ background: "rgba(212,175,55,.04)", borderRadius: "4px 12px 12px 12px", padding: "10px 12px", border: "1px solid rgba(212,175,55,.12)" }}>
                        <p style={{ fontFamily: J, fontWeight: 400, fontSize: "12px", color: DARK, margin: 0, lineHeight: 1.75 }}>{item.a}</p>
                      </div>
                    </div>
                    <div className="flex items-center mt-2.5" style={{ marginLeft: "32px" }}>
                      <button style={{ fontFamily: J, fontWeight: 500, fontSize: "10.5px", color: GOLD, background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                        この相談をする →
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Helper ────────────────────────────────────────

function getImageUrl(image: string | { url: string } | undefined): string | undefined {
  if (!image) return undefined;
  if (typeof image === "string") return image;
  return image.url;
}

// ─── Main Component ────────────────────────────────

export default function TopPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<HomeData | null>(null);
  // Real LINE auth state from the user-auth context. Local toggle below is
  // only used for the "preview" affordance on the locked overlay.
  const { isAuthenticated } = useUserAuth();
  const [lineLoggedIn, setLineLoggedIn] = useState(false);

  useEffect(() => {
    fetch("/api/home")
      .then((res) => res.json())
      .then((json: HomeData) => { setData(json); setLoading(false); })
      .catch(() => { setLoading(false); });
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: "#f5f5f5" }}>
        <div className="flex flex-col items-center gap-4">
          <div className="size-10 animate-spin rounded-full border-4" style={{ borderColor: "rgba(212,175,55,0.2)", borderTopColor: GOLD }} />
          <p className="text-sm" style={{ color: "rgba(27,37,40,0.5)", fontFamily: J }}>読み込み中...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: "#f5f5f5" }}>
        <p style={{ color: "rgba(27,37,40,0.5)" }}>データの取得に失敗しました。再度お試しください。</p>
      </div>
    );
  }

  const pickupShops = data.pickup_shops ?? [];
  const areas = data.areas ?? [];
  const categories = data.categories ?? [];
  const recentReviews = data.recent_reviews ?? [];
  const consultations = data.consultations ?? [];

  return (
    <div style={{ fontFamily: "'Outfit','Noto Sans JP',sans-serif" }} className="min-h-screen bg-[#f5f5f5] flex justify-center">
      <div className="relative w-full max-w-[430px] bg-[#f5f5f5] min-h-screen flex flex-col pb-[68px]">

        {/* ══ HERO ══ */}
        <div className="relative w-full" style={{ height: "82vw", maxHeight: "360px", minHeight: "260px" }}>
          <img src="/hero-top.jpg" alt="" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0" style={{ background: "linear-gradient(180deg,rgba(8,6,16,.52) 0%,rgba(8,6,16,.1) 45%,rgba(8,6,16,.78) 100%)" }} />
          <div className="absolute bottom-0 left-0 right-0" style={{ height: "1.5px", background: `linear-gradient(90deg,transparent,rgba(212,175,55,.9) 30%,#ffe066 50%,rgba(212,175,55,.9) 70%,transparent)` }} />
          <div className="absolute top-5 left-5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full" style={{ background: "linear-gradient(135deg,rgba(212,175,55,.22),rgba(212,175,55,.06))", border: "1px solid rgba(212,175,55,.55)", backdropFilter: "blur(8px)" }}>
              <span className="relative flex h-[6px] w-[6px]">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: "rgba(212,175,55,.9)" }} />
                <span className="relative inline-flex rounded-full h-[6px] w-[6px]" style={{ background: GOLD }} />
              </span>
              <span style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 500, fontSize: "9.5px", letterSpacing: "0.18em", color: "rgba(255,220,100,.95)" }}>AI MATCHING</span>
            </div>
          </div>
          <div className="absolute bottom-6 left-5 right-5">
            <div className="mb-2 inline-flex">
              <span className="px-2.5 py-0.5 rounded-sm" style={{ background: "rgba(200,96,128,.85)", fontFamily: J, fontWeight: 700, fontSize: "10px", letterSpacing: "0.14em", color: "white" }}>ナイトワーク求人</span>
            </div>
            <div className="flex items-end gap-2 mb-2">
              <h1 style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 700, fontSize: "clamp(36px,11vw,46px)", letterSpacing: "0.04em", lineHeight: 1, color: "#fff", textShadow: "0 2px 24px rgba(0,0,0,.5)", margin: 0 }}>Recta</h1>
              <div className="mb-1.5 w-[5px] h-[5px] rounded-full shrink-0" style={{ background: GOLD, boxShadow: "0 0 8px rgba(212,175,55,.8)" }} />
            </div>
            <div className="mb-3" style={{ width: "52px", height: "1px", background: "linear-gradient(90deg,rgba(212,175,55,.9),transparent)" }} />
            <p style={{ fontFamily: J, fontWeight: 500, fontSize: "15px", letterSpacing: "0.04em", color: "rgba(255,255,255,.96)", lineHeight: 1.5, textShadow: "0 1px 12px rgba(0,0,0,.5)", margin: "0 0 4px" }}>AIと探す、理想のナイトワーク</p>
            <p style={{ fontFamily: J, fontWeight: 300, fontSize: "11px", letterSpacing: "0.08em", color: "rgba(255,240,180,.88)", margin: 0 }}>キャバクラ・ラウンジ・クラブ｜全国1,200件以上</p>
          </div>
        </div>

        {/* ══ AI CHAT ══ */}
        <div style={{ background: BASE_GRADIENT, padding: "14px 12px 16px", position: "relative" }}>
          <GlowOrbs />
          <AiChatPanel pageType="top" />
        </div>

        {/* ══ PICKUP STORES ══ */}
        <div className="mt-4">
          <div className="flex items-center justify-between px-5 mb-3">
            <div className="flex items-center gap-2">
              <div className="w-1 h-5 rounded-full" style={{ background: `linear-gradient(180deg,${GOLD},#c8960c)` }} />
              <h2 style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 700, fontSize: "17px", letterSpacing: "-0.02em", color: DARK, margin: 0 }}>ピックアップ店舗</h2>
              <span className="px-2 py-0.5 rounded" style={{ background: `linear-gradient(135deg,${DARK},#2c3e46)`, border: `1px solid rgba(212,175,55,.4)`, fontFamily: "'Outfit',sans-serif", fontWeight: 600, fontSize: "8.5px", letterSpacing: "0.12em", color: GOLD }}>PR</span>
            </div>
            <Link to="/stores" style={{ fontFamily: J, fontWeight: 400, fontSize: "12px", color: GOLD, textDecoration: "none" }}>すべて見る →</Link>
          </div>
          <div className="flex gap-3 px-5 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" as const }}>
            {pickupShops.map((store, idx) => {
              const imageUrl = store.images && store.images.length > 0 ? getImageUrl(store.images[0]) : undefined;
              return (
                <Link key={store.id} to={`/stores/${store.id}`} className="shrink-0 rounded-2xl overflow-hidden" style={{ width: "200px", background: "white", boxShadow: "0 4px 20px rgba(0,0,0,.08), 0 1px 3px rgba(0,0,0,.06)", border: "1px solid rgba(27,37,40,.06)", textDecoration: "none" }}>
                  <div className="relative w-full overflow-hidden" style={{ height: "130px" }}>
                    {imageUrl ? (
                      <img src={imageUrl} alt={store.name} className="absolute inset-0 w-full h-full object-cover" />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center" style={{ background: "linear-gradient(135deg, #1b2528, #2a3a3f)" }}>
                        <span style={{ fontSize: "24px", fontWeight: 700, color: GOLD }}>{store.name.charAt(0)}</span>
                      </div>
                    )}
                    <div className="absolute inset-0" style={{ background: "linear-gradient(180deg,transparent 30%,rgba(0,0,0,.5) 100%)" }} />
                    {store.category && (
                      <div className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-md" style={{ background: "rgba(200,96,128,.9)", backdropFilter: "blur(4px)" }}>
                        <span style={{ fontFamily: J, fontSize: "9px", fontWeight: 600, color: "white", letterSpacing: "0.04em" }}>{store.category}</span>
                      </div>
                    )}
                    {idx === 0 && (
                      <div className="absolute top-2.5 right-2.5 w-6 h-6 rounded-full flex items-center justify-center" style={{ background: `linear-gradient(135deg,${GOLD},#c8960c)`, boxShadow: "0 2px 8px rgba(212,175,55,.4)" }}>
                        <span style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 700, fontSize: "10px", color: "white" }}>1</span>
                      </div>
                    )}
                    {(store.hourly_min || store.hourly_max) && (
                      <div className="absolute bottom-2.5 left-2.5 right-2.5">
                        <p style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 700, fontSize: "13px", color: "white", margin: 0, textShadow: "0 1px 6px rgba(0,0,0,.5)" }}>
                          時給 {store.hourly_min?.toLocaleString()}〜{store.hourly_max?.toLocaleString()}円
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="px-3.5 py-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <p style={{ fontFamily: J, fontWeight: 600, fontSize: "13px", color: DARK, margin: 0 }}>{store.name}</p>
                      {store.average_rating && store.average_rating > 0 && (
                        <div className="flex items-center gap-1">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill={GOLD}><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
                          <span style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 600, fontSize: "11px", color: DARK }}>{store.average_rating.toFixed(1)}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mb-2">
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="none"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="rgba(20,39,46,.4)" /></svg>
                      <span style={{ fontFamily: J, fontWeight: 400, fontSize: "10px", color: "rgba(20,39,46,.5)" }}>{store.area}</span>
                      {store.reviews_count !== undefined && store.reviews_count > 0 && (
                        <>
                          <span style={{ fontFamily: J, fontWeight: 400, fontSize: "10px", color: "rgba(20,39,46,.25)" }}>|</span>
                          <span style={{ fontFamily: J, fontWeight: 400, fontSize: "10px", color: "rgba(20,39,46,.4)" }}>{store.reviews_count}件の口コミ</span>
                        </>
                      )}
                    </div>
                    {store.feature_tags && store.feature_tags.length > 0 && (
                      <div className="flex gap-1.5 flex-wrap">
                        {store.feature_tags.slice(0, 2).map(tag => (
                          <span key={tag} className="px-2 py-0.5 rounded" style={{ background: "rgba(212,175,55,.08)", border: "1px solid rgba(212,175,55,.15)", fontFamily: J, fontWeight: 500, fontSize: "9px", color: "rgba(168,130,20,.8)" }}>
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* ══ 上京サポート BANNER ══ */}
        <div className="mt-6 px-5">
          <Link
            to="/relocate-support"
            className="block rounded-2xl overflow-hidden active:scale-[0.99] transition-transform"
            style={{
              background: `linear-gradient(135deg, ${DARK} 0%, #2c3e46 60%, rgba(200,96,128,.4) 100%)`,
              border: `1px solid rgba(212,175,55,.3)`,
              boxShadow: "0 8px 24px rgba(0,0,0,.18)",
              textDecoration: "none",
              position: "relative",
            }}
          >
            <div style={{ position: "absolute", top: 0, right: 0, bottom: 0, width: "44%", background: `radial-gradient(circle at 70% 50%, rgba(212,175,55,.18), transparent 60%)`, pointerEvents: "none" }} />
            <div className="flex items-center gap-3 p-4 relative">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(212,175,55,.15)", border: "1px solid rgba(212,175,55,.35)" }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path d="M3 21V11l9-7 9 7v10" stroke={GOLD} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M9 21v-6h6v6" stroke={GOLD} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 700, fontSize: "9.5px", letterSpacing: "0.14em", color: GOLD, textTransform: "uppercase" }}>Relocate Support</span>
                  <span className="px-1.5 py-0 rounded" style={{ background: "rgba(255,255,255,.1)", fontFamily: J, fontWeight: 600, fontSize: "8.5px", color: "rgba(255,255,255,.85)" }}>家紹介あり</span>
                </div>
                <p style={{ fontFamily: J, fontWeight: 700, fontSize: "14.5px", color: "white", margin: 0, lineHeight: 1.4 }}>地方から東京で働きたい方へ</p>
                <p style={{ fontFamily: J, fontWeight: 400, fontSize: "11px", color: "rgba(255,255,255,.7)", margin: "2px 0 0", lineHeight: 1.5 }}>体験確約・オンライン面接・住居サポートまで一気通貫</p>
              </div>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="shrink-0"><path d="M9 18l6-6-6-6" stroke={GOLD} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </div>
          </Link>
        </div>

        {/* ══ REVIEWS ══ */}
        <div className="mt-6 px-5 pb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-1 h-5 rounded-full" style={{ background: `linear-gradient(180deg,${GOLD},#c8960c)` }} />
              <h2 style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 700, fontSize: "17px", letterSpacing: "-0.02em", color: DARK, margin: 0 }}>新着クチコミ</h2>
              <span className="px-2 py-0.5 rounded" style={{ background: "rgba(200,96,128,.1)", fontFamily: J, fontWeight: 600, fontSize: "9px", color: "rgba(200,96,128,.8)" }}>{recentReviews.length}件</span>
            </div>
          </div>
          {recentReviews.length === 0 ? (
            <div className="px-5 py-8 text-center" style={{ fontFamily: J, fontSize: "12px", color: "rgba(27,37,40,.45)" }}>
              まだ口コミは投稿されていません。
            </div>
          ) : (
          <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" as const }}>
            {recentReviews.map((review, idx) => {
              const requireLogin = !isAuthenticated && !lineLoggedIn && idx >= 3;
              const userName = review.user?.nickname || review.user?.line_display_name || "匿名";
              const initial = (userName.charAt(0) || "?");
              const dateText = review.created_at ? formatRelative(review.created_at) : "";
              return (
              <Link
                key={review.id}
                to={requireLogin ? "/login" : `/stores/${review.store?.id}#reviews`}
                onClick={() => {
                  if (requireLogin) {
                    sessionStorage.setItem("recta:login-return-to", "/");
                  }
                }}
                className="shrink-0 rounded-2xl overflow-hidden block active:scale-[0.99] transition-transform"
                style={{ width: "270px", background: "white", border: "1px solid rgba(27,37,40,.06)", boxShadow: "0 4px 20px rgba(0,0,0,.06), 0 1px 3px rgba(0,0,0,.04)", textDecoration: "none", color: "inherit" }}
              >
                <div className="flex items-center px-4 pt-3.5 pb-2.5 gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg,rgba(200,96,128,.1),rgba(200,96,128,.04))", border: "1px solid rgba(200,96,128,.15)" }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M3 21V7a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v14M3 21h10M13 21V3a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v18M13 21h8" stroke="rgba(200,96,128,.55)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </div>
                  <div className="flex-1">
                    <p style={{ fontFamily: J, fontWeight: 600, fontSize: "12.5px", color: DARK, margin: 0 }}>{review.store?.name ?? ""}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span style={{ fontFamily: J, fontWeight: 400, fontSize: "9.5px", color: "rgba(27,37,40,.4)" }}>{review.store?.area ?? ""}</span>
                      <span style={{ fontFamily: J, fontWeight: 400, fontSize: "9.5px", color: "rgba(27,37,40,.2)" }}>·</span>
                      <span className="px-1.5 py-0 rounded" style={{ fontFamily: J, fontWeight: 500, fontSize: "9px", color: "rgba(200,96,128,.7)", background: "rgba(200,96,128,.07)" }}>{review.store?.category ?? ""}</span>
                    </div>
                  </div>
                  <span style={{ fontFamily: J, fontWeight: 400, fontSize: "9px", color: "rgba(27,37,40,.25)" }}>{dateText}</span>
                </div>
                <div style={{ height: "1px", background: "linear-gradient(90deg,transparent,rgba(27,37,40,.06) 16px,rgba(27,37,40,.06) calc(100% - 16px),transparent)" }} />
                <div className="relative" style={{ padding: "12px 16px 14px", minHeight: "115px" }}>
                  <div style={{ filter: requireLogin ? "blur(7px)" : "none", transition: "filter .4s ease", userSelect: requireLogin ? "none" : "auto" }}>
                    <div className="flex items-center gap-3 mb-2.5">
                      <div className="flex items-center gap-0.5">
                        {[1,2,3,4,5].map(s => (
                          <svg key={s} width="13" height="13" viewBox="0 0 24 24" fill={s <= review.rating ? GOLD : "rgba(27,37,40,.08)"}><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
                        ))}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: "linear-gradient(135deg,rgba(200,96,128,.12),rgba(200,96,128,.06))", border: "1px solid rgba(200,96,128,.15)" }}>
                          <span style={{ fontFamily: J, fontWeight: 600, fontSize: "8px", color: "rgba(200,96,128,.7)" }}>{initial}</span>
                        </div>
                        <span style={{ fontFamily: J, fontWeight: 500, fontSize: "10.5px", color: "rgba(27,37,40,.5)" }}>{userName}</span>
                      </div>
                    </div>
                    <p style={{ fontFamily: J, fontWeight: 400, fontSize: "12px", color: DARK, margin: 0, lineHeight: 1.75, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical" as const, overflow: "hidden" }}>{review.body}</p>
                  </div>
                  {requireLogin && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-1" style={{ background: "rgba(255,255,255,.08)" }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="mb-1">
                        <rect x="3" y="11" width="18" height="11" rx="2" stroke="rgba(27,37,40,.25)" strokeWidth="1.5" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="rgba(27,37,40,.25)" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                      <span style={{ fontFamily: J, fontWeight: 400, fontSize: "10px", color: "rgba(27,37,40,.45)", marginBottom: "6px" }}>クチコミを見るにはログインが必要です</span>
                      <button
                        onClick={() => setLineLoggedIn(true)}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl active:scale-95 transition-transform"
                        style={{ background: "#06C755", border: "none", cursor: "pointer", boxShadow: "0 4px 14px rgba(6,199,85,.3), 0 1px 3px rgba(6,199,85,.2)" }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596a.629.629 0 0 1-.199.031c-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.271.173-.508.43-.595a.497.497 0 0 1 .194-.033c.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" /></svg>
                        <span style={{ fontFamily: J, fontWeight: 600, fontSize: "12px", color: "white", letterSpacing: "0.02em" }}>LINEでログイン</span>
                      </button>
                    </div>
                  )}
                </div>
              </Link>
              );
            })}
          </div>
          )}
        </div>

        {/* ══ DARK BAND — AREA + CATEGORY ══ */}
        <div style={{ marginTop: "24px", position: "relative" }}>
          <EdgeTop />
          <div style={{ background: DARK, position: "relative", padding: "20px 0 24px" }}>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "60px", background: "radial-gradient(ellipse 80% 100% at 50% 0%, rgba(212,175,55,.04) 0%, transparent 100%)", pointerEvents: "none" }} />

            {/* AREA */}
            <div className="px-5">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 600, fontSize: "10px", letterSpacing: "0.1em", color: "rgba(212,175,55,.5)", textTransform: "uppercase" as const }}>Area</span>
                  <span style={{ fontFamily: J, fontWeight: 500, fontSize: "14px", color: "rgba(255,255,255,.9)" }}>エリアから探す</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-3">
                {areas.map((area, i) => {
                  const count = area.store_count ?? 0;
                  return (
                    <Link key={area.id} to={`/stores?area=${encodeURIComponent(area.slug)}`} className="rounded-xl flex items-center gap-2.5 px-3 active:scale-[0.98] transition-transform" style={{ background: "rgba(255,255,255,.06)", border: i < 3 ? "1px solid rgba(212,175,55,.2)" : "1px solid rgba(255,255,255,.08)", height: "50px", textDecoration: "none" }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="shrink-0">
                        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" stroke={i < 3 ? GOLD : "rgba(255,255,255,.3)"} strokeWidth="1.5" fill={i < 3 ? "rgba(212,175,55,.15)" : "rgba(255,255,255,.05)"} />
                        <circle cx="12" cy="9" r="2.5" fill={i < 3 ? GOLD : "rgba(255,255,255,.25)"} />
                      </svg>
                      <span className="flex-1 text-left" style={{ fontFamily: J, fontWeight: i < 3 ? 600 : 400, fontSize: "12.5px", color: i < 3 ? "rgba(255,255,255,.95)" : "rgba(255,255,255,.6)" }}>{area.name}</span>
                      <span style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 500, fontSize: "10px", color: "rgba(255,255,255,.25)" }}>{count}</span>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" className="shrink-0"><path d="M9 18l6-6-6-6" stroke="rgba(255,255,255,.15)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </Link>
                  );
                })}
              </div>
              <Link
                to="/stores"
                className="mt-3 flex items-center justify-center gap-1.5 rounded-xl active:scale-[0.98] transition-transform"
                style={{ height: "44px", background: "rgba(212,175,55,.1)", border: "1px solid rgba(212,175,55,.25)", textDecoration: "none" }}
              >
                <span style={{ fontFamily: J, fontWeight: 600, fontSize: "12.5px", color: GOLD, letterSpacing: "0.02em" }}>他のエリアも見る</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M9 18l6-6-6-6" stroke={GOLD} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </Link>
            </div>

            <div style={{ height: "1px", background: "rgba(255,255,255,.06)", margin: "24px 20px" }} />

            {/* CATEGORY */}
            <div>
              <div className="flex items-center gap-2 mb-3 px-5">
                <span style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 600, fontSize: "10px", letterSpacing: "0.1em", color: "rgba(212,175,55,.5)", textTransform: "uppercase" as const }}>Category</span>
                <span style={{ fontFamily: J, fontWeight: 500, fontSize: "14px", color: "rgba(255,255,255,.9)" }}>カテゴリから探す</span>
              </div>
              <div className="flex gap-3 overflow-x-auto pl-5 pr-3 pb-1" style={{ scrollbarWidth: "none" as const }}>
                {categories.map((cat) => {
                  const count = cat.store_count ?? 0;
                  const img = CATEGORY_IMAGES[cat.name];
                  return (
                    <Link key={cat.id} to={`/stores?category=${encodeURIComponent(cat.slug)}`} className="shrink-0 relative rounded-2xl overflow-hidden active:scale-[0.97] transition-transform" style={{ width: "130px", height: "160px", border: "1px solid rgba(255,255,255,.1)", textDecoration: "none" }}>
                      {img ? (
                        <img src={img} alt={cat.name} className="absolute inset-0 w-full h-full object-cover" />
                      ) : (
                        <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${cat.color}40, ${cat.color}20)` }} />
                      )}
                      <div className="absolute inset-0" style={{ background: "linear-gradient(180deg,rgba(0,0,0,.1) 0%,rgba(0,0,0,.6) 100%)" }} />
                      <div className="absolute bottom-0 left-0 right-0 p-3">
                        <p style={{ fontFamily: J, fontWeight: 600, fontSize: "13px", color: "white", margin: "0 0 3px", textShadow: "0 1px 4px rgba(0,0,0,.4)" }}>{cat.name}</p>
                        <p style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 500, fontSize: "10px", color: "rgba(255,255,255,.55)", margin: 0 }}>{count} jobs</p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
          <EdgeBottom />
        </div>

        {/* ══ RECENTLY VIEWED (あなたが見た記事) ══ */}
        <RecentlyViewedStores variant="flush" />

        {/* ══ TRENDING TOPICS ══ */}
        <TrendingTopics
          pool={consultations
            .filter((c) => !!c.answer)
            .map((c) => ({
              q: c.question,
              a: c.answer ?? "",
              tag: c.tag?.replace(/^#/, ""),
              count: c.count != null ? `${c.count}` : undefined,
            }))}
        />

        {/* ══ FOOTER ══ */}
        <div style={{ marginTop: "28px", position: "relative" }}>
          <EdgeTopFooter />
          <footer style={{ background: DARK, padding: "16px 20px 24px", position: "relative", overflow: "hidden" }}>
            <div className="flex items-center gap-2 mb-5">
              <h3 style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 700, fontSize: "22px", letterSpacing: "0.04em", color: "white", margin: 0 }}>Recta</h3>
              <div className="w-[4px] h-[4px] rounded-full" style={{ background: GOLD, boxShadow: "0 0 6px rgba(212,175,55,.6)" }} />
            </div>
            <p style={{ fontFamily: J, fontWeight: 300, fontSize: "11px", color: "rgba(255,255,255,.45)", lineHeight: 1.7, margin: "0 0 20px", maxWidth: "280px" }}>
              AIがあなたにぴったりのナイトワークを提案。安心・安全な求人情報をお届けします。
            </p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2.5 mb-6">
              {["利用規約", "プライバシーポリシー", "運営会社", "お問い合わせ", "よくある質問", "ヘルプセンター"].map(link => (
                <Link key={link} to={`/${link === "利用規約" ? "terms" : link === "プライバシーポリシー" ? "privacy" : link === "運営会社" ? "company" : link === "お問い合わせ" ? "contact" : link === "よくある質問" ? "faq" : "help"}`} style={{ fontFamily: J, fontWeight: 400, fontSize: "11px", color: "rgba(255,255,255,.4)", textDecoration: "none", textAlign: "left" }}>
                  {link}
                </Link>
              ))}
            </div>
            <div style={{ height: "1px", background: "rgba(255,255,255,.08)", marginBottom: "16px" }} />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.08)" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="rgba(255,255,255,.4)"><path d="M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" /></svg>
                </div>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.08)" }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="rgba(255,255,255,.4)"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
                </div>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.08)" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.4)" strokeWidth="1.5"><rect x="2" y="2" width="20" height="20" rx="5" /><circle cx="12" cy="12" r="5" /><circle cx="17.5" cy="6.5" r="1.5" fill="rgba(255,255,255,.4)" stroke="none" /></svg>
                </div>
              </div>
              <span style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 400, fontSize: "9px", letterSpacing: "0.06em", color: "rgba(255,255,255,.2)" }}>© 2026 Recta Inc.</span>
            </div>
          </footer>
        </div>

      </div>

      {/* Bottom Tab Bar */}
      <BottomTabBar />
    </div>
  );
}



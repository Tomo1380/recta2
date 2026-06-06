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

// User は orval-generated 型 (UserResource) を alias。
// Phase 1-6 で手書き interface から移行。
import type { UserResource as GeneratedUserResource } from "../../orval/generated/api.schemas";
export type User = GeneratedUserResource;

export interface UserIndexResponse {
  users: Paginated<User>;
  /** アプリ User 未連携の LINE 友だち (LINEログインせずメッセージした人)。1ページ目に表示。 */
  unlinked_friends?: LineFriend[];
  line_stats: {
    total_users: number;
    line_friend_count: number;
    unlinked_friend_count?: number;
  };
}

/** ユーザー管理一覧の正規化「人」行 (LINEトーク主役・line_user_id 軸)。 */
export interface AdminPersonRow {
  line_user_id: string;
  /** 表示名 (admin_name 優先) */
  name: string | null;
  /** LINE 本来の名前 */
  display_name: string | null;
  picture_url: string | null;
  is_following: boolean;
  messages_count: number;
  user_id: number | null;
  /** LINEログイン済 (User あり) か */
  has_account: boolean;
  status: string | null;
  reviews_count: number | null;
  last_activity: string | null;
  kind: "talk" | "login_only";
}

export interface PeopleIndexResponse {
  people: Paginated<AdminPersonRow>;
  stats: {
    talk_count: number;
    login_only_count: number;
    total_users: number;
  };
}

export interface AdminPersonReview {
  id: number;
  store_id: number;
  rating: number;
  body: string | null;
  status: string;
  created_at: string | null;
  store?: { id: number; name: string } | null;
}

/** 人物詳細 (line_user_id 基準)。トーク相手 + 連携Userの口コミ等を統合。 */
export interface AdminPerson {
  line_user_id: string;
  name: string | null;
  admin_name: string | null;
  display_name: string | null;
  picture_url: string | null;
  is_following: boolean;
  is_talk: boolean;
  has_account: boolean;
  admin_notes: string | null;
  user: {
    id: number;
    status: string;
    line_display_name: string | null;
    nickname: string | null;
    reviews_count: number;
    created_at: string | null;
  } | null;
  reviews: AdminPersonReview[];
  ai_chats: AdminPersonChat[];
  ai_chats_total: number;
  messages: LineMessage[];
  messages_total: number;
}

export interface AdminPersonChat {
  id: number;
  user_message: string;
  ai_response: string;
  mode: string | null;
  page_type: string | null;
  total_tokens: number;
  created_at: string | null;
}

export interface PersonShowResponse {
  person: AdminPerson;
}

export interface UserShowResponse {
  user: User;
  line_messages: LineMessage[];
}

export interface Store {
  id: number;
  slug?: string | null;
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
  // 通常時給は廃止。給与は体入時給 (trial_hourly_*) に一本化。
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
  /** 体入時給（最低額） */
  trial_hourly_min: string | null;
  /** 体入時給（最高額） */
  trial_hourly_max: string | null;
  /** @deprecated 旧キー (avg_hourly) — フォールバックのため一時的に残置 */
  trial_avg_hourly?: string | null;
  /** @deprecated 旧キー (hourly 単一値) — フォールバックのため一時的に残置 */
  trial_hourly?: string | null;
  // 面接可能時間（文字列は後方互換、interview_start/interview_endが正）
  interview_hours: string | null;
  interview_start: string | null; // 例: "14:00"
  interview_end: string | null;   // 例: "19:00"
  /** 体入タイプ: 'same_day' (体入確約) / 'normal' (体入可能) / 'none' (体入なし) */
  trial_type: "same_day" | "normal" | "none";
  feature_tags: string[] | null;
  description: string | null;
  features_text: string | null;
  dress_code: string | null;
  images: { url: string; order: number }[] | null;
  /** Legacy single-video URL — kept populated by the API as videos[0].video_url for backwards compat. */
  video_url: string | null;
  /** Ordered videos with optional label/description. */
  videos: {
    video_url: string;
    label: string | null;
    description: string | null;
    poster_url: string | null;
    display_order: number;
  }[] | null;
  /** Ordered staff photos (在籍女性ギャラリー) */
  staff_photos: {
    image_url: string;
    caption: string | null;
    instagram_url: string | null;
    staff_type: string | null;
    display_order: number;
  }[] | null;
  analysis: Record<string, unknown> | null;
  interview_info: Record<string, unknown> | null;
  required_documents: { notes: string; documents: string[] } | null;
  schedule: Record<string, unknown> | null;
  recent_hires: Record<string, unknown>[] | null;
  recent_hires_summary: string | null;
  recruitment_standards: string | null;
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

// Review は orval-generated ReviewResource (../orval/generated/api.schemas)
// を直接 import すること。status は string 型 (backend は published/
// unpublished/deleted enum validation を返す)。
import type { ReviewResource } from "../../orval/generated/api.schemas";
export type Review = ReviewResource;

// AiChatSetting は orval-generated 型を alias。
// Phase 1-6 で手書き interface から移行。
import type { AiChatSetting as GeneratedAiChatSetting } from "../../orval/generated/api.schemas";
export type AiChatSetting = GeneratedAiChatSetting;

// AdminUser は orval-generated 型 (AdminUserResource) を alias。
// Phase 1-6 で手書き interface から移行。
import type { AdminUserResource as GeneratedAdminUserResource } from "../../orval/generated/api.schemas";
export type AdminUser = GeneratedAdminUserResource;

export interface DashboardKpiWithDelta {
  value: number;
  delta_30d?: number;
  delta_vs_prev?: number;
  delta_vs_yesterday?: number;
  avg_tokens?: number;
}

export interface DashboardChatTrendPoint {
  date: string;
  agent: number;
  finetuned: number;
  total: number;
}

export interface DashboardSimpleTrendPoint {
  date: string;
  count: number;
}

export interface DashboardDistributionPoint {
  name: string;
  count: number;
}

export interface DashboardRecentReview {
  id: number;
  rating: number;
  body: string;
  status: "published" | "unpublished" | "deleted";
  created_at: string | null;
  user_name: string;
  store_id: number | null;
  store_name: string | null;
}

export interface DashboardRecentMessage {
  id: number;
  user_id: number | null;
  line_user_id: string | null;
  name: string;
  avatar: string;
  message: string;
  created_at: string | null;
  unread: boolean;
}

export interface DashboardRecentChat {
  id: number;
  mode: string | null;
  page_type: string | null;
  user_message: string;
  total_tokens: number;
  created_at: string | null;
  user_name: string;
}

export interface DashboardData {
  generated_at: string;
  kpis: {
    published_stores: DashboardKpiWithDelta;
    active_users_30d: DashboardKpiWithDelta;
    line_friends: DashboardKpiWithDelta;
    reviews_today: DashboardKpiWithDelta;
    chat_today: DashboardKpiWithDelta;
  };
  chat_trend: DashboardChatTrendPoint[];
  line_friend_trend: DashboardSimpleTrendPoint[];
  recent_reviews: DashboardRecentReview[];
  recent_messages: DashboardRecentMessage[];
  recent_chats: DashboardRecentChat[];
  secondary: {
    unread_messages: number;
    pending_reviews: number;
    new_users_7d: number;
    published_articles: number;
    fine_tuning_qa_active: number;
  };
  analytics_highlight: {
    stores: AnalyticsRankRow[];
    columns: AnalyticsRankRow[];
  };
}

// ─── アクセス解析（FB 2026-06-05 A2/A3） ───

/** ランキング1行: PV・LINE追加クリック・CV率（= クリック ÷ PV × 100）。 */
export interface AnalyticsRankRow {
  id?: number;
  name: string;
  pv: number;
  line_clicks: number;
  cv_rate: number;
}

/** LINE 追加クリックの経路ランキング1行。 */
export interface AnalyticsRouteRow {
  route: string;
  kind: "affiliate" | "cta";
  clicks: number;
}

/** ランキング行ドリルダウン: 1店舗/コラム/エリアの画面別LINE導線内訳。 */
export interface AnalyticsBreakdownRow {
  source: string;
  clicks: number;
}

export interface AnalyticsBreakdown {
  type: "store" | "column" | "area";
  key: string;
  rows: AnalyticsBreakdownRow[];
}

export interface AnalyticsOverview {
  range: { days: number; from: string; to: string };
  summary: {
    pv: number;
    line_clicks: number;
    cv_rate: number;
    line_friends_total: number;
    line_friends_in_range: number;
  };
  stores: AnalyticsRankRow[];
  areas: AnalyticsRankRow[];
  columns: AnalyticsRankRow[];
  line_routes: AnalyticsRouteRow[];
}

/** 計測リンク（アフィリエイト/店舗別LINE導線/SNS）。 */
export interface TrackingLink {
  id: number;
  code: string;
  label: string;
  target_type: "store" | "area" | "column" | "standalone";
  store_id: number | null;
  article_id: number | null;
  area: string | null;
  destination_url: string;
  is_active: boolean;
  public_url: string;
  clicks_count?: number;
  created_at: string | null;
  store_name?: string | null;
  article_title?: string | null;
}

// LineFriend / LineMessage / LineMessageMeta は手書きで残す。
// Wave 4 で backend は Resource 化したが、Scramble は
// AnonymousResourceCollection を経由する型を実用的に推論できないため、
// 生成型に頼らない方が consumer 側がシンプル。
// (将来 Scramble 改善 or Resource 直返し API が増えたら移行検討)
export interface LineFriend {
  id: number;
  user_id: number | null;
  line_user_id: string;
  /** LINE 本来の表示名 (プロフィール取得 or ログイン由来) */
  display_name: string | null;
  /** 管理画面上の別名 (運営が編集) */
  admin_name?: string | null;
  /** 表示用の解決名 (admin_name 優先)。API が付与。 */
  name?: string | null;
  picture_url: string | null;
  followed_at: string | null;
  unfollowed_at: string | null;
  is_following: boolean;
  created_at: string;
  updated_at: string;
  messages_count?: number | null;
  user?: User;
}

export interface LineMessage {
  id: number;
  line_user_id: string;
  user_id: number | null;
  direction: "inbound" | "outbound";
  message_type: string;
  content: string;
  content_meta?: LineMessageMeta | null;
  line_message_id: string | null;
  read_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface LineMessageMeta {
  // sticker
  package_id?: string | number;
  sticker_id?: string | number;
  sticker_resource_type?: string;
  keywords?: string[];
  text?: string;
  // image / video / audio / file
  message_id?: string;
  content_provider?: { type?: string; originalContentUrl?: string; previewImageUrl?: string };
  file_name?: string;
  file_size?: number;
  duration?: number;
  // location
  title?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
}

// Area & Category management
// Area / Category は orval-generated 型 (AreaResource / CategoryResource)
// を直接 import すること: `~/orval/generated/api.schemas`。
// 手書きの interface は 2026-05-26 に削除。

// RelocateVoice / PickupShop / Consultation / BannerSettings は
// orval-generated 型 (RelocateVoice / PickupShopResource /
// ConsultationResource / BannerSettingsResource) を直接 import すること。
// 手書きの interface は 2026-05-26 に削除。

// コラム記事 (CMS) — 生成型への alias。
// Article / ArticleSummary は ../orval/generated/api.schemas で
// ArticleResource / ArticleSummaryResource として定義されている。
// 各画面は import type { ArticleResource } from "../../../orval/generated/..."
// を使うのが望ましいが、移行コスト低減のため types.ts に alias を残す。
import type {
  ArticleResource as GeneratedArticleResource,
  ArticleSummaryResource as GeneratedArticleSummaryResource,
} from "../../orval/generated/api.schemas";

export type Article = GeneratedArticleResource;
export type ArticleSummary = GeneratedArticleSummaryResource;

export interface PublicArticleIndexResponse {
  articles: Paginated<ArticleSummary>;
  categories: string[];
  /** C2: コラムTOP 上段ナビの大テーマ（夜の始め方/エリア別比較/地方から上京/Q&A）。 */
  sections?: string[];
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

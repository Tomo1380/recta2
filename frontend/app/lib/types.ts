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
  stores_by_area: DashboardDistributionPoint[];
  stores_by_category: DashboardDistributionPoint[];
  recent_reviews: DashboardRecentReview[];
  recent_messages: DashboardRecentMessage[];
  recent_chats: DashboardRecentChat[];
  secondary: {
    unread_messages: number;
    pending_reviews: number;
    published_articles: number;
    fine_tuning_qa_active: number;
  };
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

// Area & Category management
// Area / Category は orval-generated 型 (AreaResource / CategoryResource)
// を直接 import すること: `~/orval/generated/api.schemas`。
// 手書きの interface は 2026-05-26 に削除。

// RelocateVoice / PickupShop / Consultation / BannerSettings は
// orval-generated 型 (RelocateVoice / PickupShopResource /
// ConsultationResource / BannerSettingsResource) を直接 import すること。
// 手書きの interface は 2026-05-26 に削除。

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

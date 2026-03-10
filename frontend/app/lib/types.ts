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
  nickname: string | null;
  age: number | null;
  preferred_area: string | null;
  preferred_category: string | null;
  experience: string | null;
  status: "active" | "suspended";
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
  reviews_count?: number;
  reviews?: Review[];
}

export interface Store {
  id: number;
  name: string;
  area: string;
  address: string | null;
  nearest_station: string | null;
  category: string | null;
  business_hours: string | null;
  holidays: string | null;
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
  trial_avg_hourly: string | null;
  trial_hourly: string | null;
  interview_hours: string | null;
  same_day_trial: boolean;
  feature_tags: string[] | null;
  description: string | null;
  features_text: string | null;
  images: string[] | null;
  video_url: string | null;
  analysis: Record<string, unknown> | null;
  interview_info: Record<string, unknown> | null;
  required_documents: { notes: string; documents: string[] } | null;
  schedule: Record<string, unknown> | null;
  recent_hires: Record<string, unknown>[] | null;
  popular_features: string[] | null;
  champagne_images: string[] | null;
  transport_images: string[] | null;
  after_spots: Record<string, unknown>[] | null;
  companion_spots: Record<string, unknown>[] | null;
  qa: { question: string; answer: string }[] | null;
  staff_comment: string | null;
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
  created_at: string;
  updated_at: string;
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

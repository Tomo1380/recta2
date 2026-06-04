import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router";
import { openLineFriendAdd } from "~/lib/line";
import { LineIcon } from "~/components/user/shared/LineIcon";
import {
  Loader2,
  Star,
  MapPin,
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
// Figma Make 由来のデザイントークン / アイコン
//   ref: docs/handoff/2026-05-29-chat-ui-figma-align.md
//   SVG path は Figma Make の src/imports/svg-m4am08uz6h.ts から取得。
// ---------------------------------------------------------------------------

const AI_AVATAR_BG = "linear-gradient(135deg, #D4AF37 0%, #9a7a20 100%)";

// Recta AI アバターのロボットアイコン (24x24 viewBox, 白 fill)
const ROBOT_SVG_PATH =
  "M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1a7 7 0 0 1-7 7H9a7 7 0 0 1-7-7H1a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73A2 2 0 0 1 12 2zm-4 9a1 1 0 1 0 0 2 1 1 0 0 0 0-2zm8 0a1 1 0 1 0 0 2 1 1 0 0 0 0-2z";

// 送信ボタンの「円の中に上向き矢印」アイコン (p2a5eb480 / 18.6667 viewBox, stroke)
const SEND_ARROW_PATH =
  "M12.6667 9.33333L9.33333 6M9.33333 6L6 9.33333M9.33333 6V12.6667M17.6667 9.33333C17.6667 13.9357 13.9357 17.6667 9.33333 17.6667C4.73096 17.6667 1 13.9357 1 9.33333C1 4.73096 4.73096 1 9.33333 1C13.9357 1 17.6667 4.73096 17.6667 9.33333Z";

/**
 * Recta AI アバター — ゴールドグラデの角丸 + 白いロボットアイコン。
 * `ring` を立てると streaming 中を示すゴールドの外周リングを点灯する。
 */
function AiAvatar({ size, ring = false }: { size: number; ring?: boolean }) {
  const iconSize = size * 0.625;
  return (
    <div
      className="flex shrink-0 items-center justify-center"
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.44,
        background: AI_AVATAR_BG,
        boxShadow: ring ? "0 0 0 3px rgba(212,175,55,0.28)" : undefined,
        transition: "box-shadow .25s ease",
      }}
    >
      <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d={ROBOT_SVG_PATH} fill="white" />
      </svg>
    </div>
  );
}

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
  trial_hourly_min?: number;
  trial_hourly_max?: number;
  feature_tags?: string[];
  description?: string;
  business_hours?: string;
  same_day_trial?: boolean;
  trial_hourly?: string | number | null;
}

/**
 * Single L1 tab → its L2 chips. Mirrors backend `suggest_categories` jsonb shape.
 *
 *   { id, label, sub, chips: [...] }
 */
export interface SuggestCategory {
  id: string;
  label: string;
  sub?: string | null;
  chips: string[];
}

/**
 * Suggest UI の表示モード。
 *  - off         : 一切出さない
 *  - chips_only  : L1 タブを隠して L2 chip だけフラットに並べる
 *  - categorized : L1 タブ + L2 chip (Figma 標準)
 */
export type SuggestDisplayMode = "off" | "chips_only" | "categorized";

interface AiChatPanelProps {
  pageType: "top" | "list" | "detail";
  storeId?: number;
  storeName?: string;
  /** Store data for detail page intro summary */
  storeInfo?: StoreInfo;
  className?: string;
  /** Preview mode: disables API calls, uses provided suggest categories */
  preview?: boolean;
  /** Override suggest categories (used in preview mode) */
  previewSuggestCategories?: SuggestCategory[];
  /** Override suggest display mode (used in preview mode) */
  previewSuggestDisplayMode?: SuggestDisplayMode;
}

interface StoreCard {
  id: number;
  slug?: string | null;
  name: string;
  area?: string;
  category?: string;
  nearest_station?: string;
  trial_hourly_min?: number;
  trial_hourly_max?: number;
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
  /** ストリーミング中の AI 応答であることを示す。true の間はタイプライターカーソルを出す */
  streaming?: boolean;
  /** ストリーミング中に Function Calling 等の中間ステータスを出す（"店舗を検索しています…" 等） */
  streamingStatus?: string;
}

type ChatMode = "agent" | "finetuned";

interface ChatConfigResponse {
  enabled: boolean;
  suggest_categories: SuggestCategory[];
  suggest_display_mode: SuggestDisplayMode;
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

interface StreamHandlers {
  onStatus?: (label: string) => void;
  onDelta: (delta: string) => void;
  onDone: (payload: Pick<ChatApiResponse, "stores" | "follow_ups" | "meta">) => void;
}

/**
 * Server-Sent Events 版の sendMessage。
 *
 * 旧 sendMessage は POST → 完成JSONを一括受信していた（数秒間カーソル点滅のまま）。
 * これは `/api/chat/stream` から SSE で逐次受信し、status / text / done / error
 * イベントごとにハンドラを呼ぶ。タイプライター表示はフロント側で `onDelta` を
 * メッセージ末尾に追記していくだけで実現できる。
 *
 * リジェクト規約:
 * - 429 (limit) → `Error & { limitType }` を throw（旧版と互換）
 * - error イベント → 同じく Error を throw
 * - その他HTTPエラー → Error を throw
 */
async function streamMessage(
  message: string,
  pageType: string,
  history: { role: string; content: string }[],
  mode: ChatMode,
  storeId: number | undefined,
  signal: AbortSignal,
  handlers: StreamHandlers,
): Promise<void> {
  const token = typeof window !== "undefined" ? localStorage.getItem("user_token") : null;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "text/event-stream",
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch("/api/chat/stream", {
    method: "POST",
    headers,
    body: JSON.stringify({
      message,
      page_type: pageType,
      store_id: storeId,
      history,
      mode,
    }),
    signal,
  });

  if (res.status === 429) {
    const data: LimitError = await res.json().catch(() => ({ message: "上限に達しました", limit_type: "unknown" }));
    const err = new Error(data.message) as Error & { limitType?: string };
    err.limitType = data.limit_type;
    throw err;
  }
  if (!res.ok || !res.body) {
    throw new Error("Failed to open chat stream");
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buf = "";
  // done / error の終端イベントを受け取ったか。サーバが done を送らずに
  // 接続を閉じた場合 (FPM タイムアウト・ネットワーク断等) でも placeholder が
  // 永久に streaming 状態 (カーソル点滅) で固まらないよう、ループ終了後に補完する。
  let terminated = false;

  // SSE フレームは "\n\n" 区切り。`event:` と `data:` 行をペアで取り出す。
  const handleFrame = (frame: string) => {
    let event = "message";
    const dataLines: string[] = [];
    for (const raw of frame.split("\n")) {
      if (!raw) continue;
      if (raw.startsWith(":")) continue; // SSE コメント
      const idx = raw.indexOf(":");
      const field = idx >= 0 ? raw.slice(0, idx) : raw;
      const value = idx >= 0 ? raw.slice(idx + 1).trimStart() : "";
      if (field === "event") event = value;
      else if (field === "data") dataLines.push(value);
    }
    if (dataLines.length === 0) return;
    const dataStr = dataLines.join("\n");
    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(dataStr);
    } catch {
      return;
    }
    switch (event) {
      case "status":
        handlers.onStatus?.(String(payload.label ?? ""));
        break;
      case "text":
        if (typeof payload.delta === "string") handlers.onDelta(payload.delta);
        break;
      case "done":
        terminated = true;
        handlers.onDone({
          stores: (payload.stores ?? []) as ChatApiResponse["stores"],
          follow_ups: (payload.follow_ups ?? []) as ChatApiResponse["follow_ups"],
          meta: payload.meta as ChatApiResponse["meta"],
        });
        break;
      case "error": {
        terminated = true;
        const err = new Error(String(payload.message ?? "stream error")) as Error & { limitType?: string };
        if (typeof payload.limit_type === "string") err.limitType = payload.limit_type;
        throw err;
      }
      default:
        break;
    }
  };

  // handleFrame が throw した場合 or abort された場合でも reader を必ず解放する。
  // releaseLock せずに gc されると接続が宙ぶらりんで残り、ブラウザの fetch
  // pool を消費し続ける。
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      // 完成したフレーム（"\n\n" で終わるもの）を順次処理。
      let sepIdx: number;
      while ((sepIdx = buf.indexOf("\n\n")) >= 0) {
        const frame = buf.slice(0, sepIdx);
        buf = buf.slice(sepIdx + 2);
        handleFrame(frame);
      }
    }
  } finally {
    try {
      reader.releaseLock();
    } catch {
      // 既に解放済みなら無視
    }
    // done を受け取らないままストリームが閉じた場合の取りこぼし補完。
    // abort 時は terminated=false のまま reader.read() が reject して上の
    // catch には行かず finally に来るが、その際はメッセージ側を finalize する。
    if (!terminated && !signal.aborted) {
      handlers.onDone({ stores: [], follow_ups: [], meta: undefined });
    }
  }
}

function formatWage(min?: number, max?: number): string {
  if (min == null && max == null) return "";
  const fmt = (n: number) => n.toLocaleString();
  if (min != null && max != null) return `${fmt(min)}~${fmt(max)}円/h`;
  if (min != null) return `${fmt(min)}円~/h`;
  return `~${fmt(max!)}円/h`;
}

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
      s.trial_hourly_min && s.trial_hourly_max
        ? `体入時給${formatCurrencyShort(s.trial_hourly_min)}〜${formatCurrencyShort(s.trial_hourly_max)}円`
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

/**
 * 2-tier suggest carousel.
 *
 *   L1: category tabs (label / sub), horizontal-scroll
 *   L2: chip pills for the selected category, 2-row grid horizontal-scroll
 *
 * L1 を切り替えたとき L2 の chip 群を Figma の `chipPop` キーフレームで
 * stagger 表示する: cubic-bezier(.34,1.56,.64,1), 0.38s, 各 chip i*0.05s 遅延。
 * カテゴリ ID を grid に `key` として渡し再マウントすることで毎回先頭から
 * pop し直す。
 */
function SuggestActionsCarousel({
  categories,
  mode,
  isLoading,
  onSend,
}: {
  categories: SuggestCategory[];
  mode: SuggestDisplayMode;
  isLoading: boolean;
  onSend: (text: string) => void;
}) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(0);

  // Clamp selectedIdx when categories change (admin edit / preview update).
  useEffect(() => {
    if (selectedIdx >= categories.length) setSelectedIdx(0);
  }, [categories.length, selectedIdx]);

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

  const selectedCategory = categories[selectedIdx] ?? categories[0];
  const selectedChips = selectedCategory?.chips ?? [];

  if (mode === "off" || categories.length === 0) return null;

  // chips_only モード: L1 タブを描画せず、全カテゴリの chip をフラット結合。
  // 同じ chipPop アニメで stagger 表示する (再マウントは「全カテゴリ ID 連結」を
  // key にすることで管理画面で chips を編集した瞬間に再生する)。
  if (mode === "chips_only") {
    const flatChips = categories.flatMap((c) => c.chips);
    const flatKey = categories.map((c) => c.id).join("|");
    if (flatChips.length === 0) return null;

    return (
      <div>
        <style>{`
          @keyframes chipPop {
            0%   { transform: translateY(0)    scale(1);    }
            50%  { transform: translateY(-5px) scale(1.06); }
            75%  { transform: translateY(1px)  scale(0.98); }
            100% { transform: translateY(0)    scale(1);    }
          }
          .chip-pop {
            animation-name: chipPop;
            animation-duration: 0.38s;
            animation-timing-function: cubic-bezier(0.34, 1.56, 0.64, 1);
            animation-fill-mode: both;
          }
        `}</style>
        <div style={{ padding: "4px 20px 14px" }}>
          <div
            key={flatKey}
            className="flex flex-wrap gap-2"
          >
            {flatChips.map((chip, i) => (
              <button
                key={`${chip}-${i}`}
                type="button"
                onClick={() => onSend(chip)}
                disabled={isLoading}
                className="chip-pop flex items-center justify-center rounded-full bg-white transition-all active:scale-95 hover:shadow-md disabled:opacity-50"
                style={{
                  height: "30px",
                  padding: "0 13px",
                  border: "none",
                  boxShadow: "0px 1px 4px rgba(27,37,40,0.13), 0px 0px 0px 0.5px rgba(27,37,40,0.07)",
                  fontSize: "11px",
                  color: "#1b2528",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  animationDelay: `${i * 0.05}s`,
                }}
              >
                {chip}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* chipPop keyframes — scoped via component-level <style>. Single class
          name (`chip-pop`) so the same animation applies to every chip with
          per-chip animationDelay from inline style. */}
      <style>{`
        .suggest-carousel::-webkit-scrollbar { display: none; }
        @keyframes chipPop {
          0%   { transform: translateY(0)    scale(1);    }
          50%  { transform: translateY(-5px) scale(1.06); }
          75%  { transform: translateY(1px)  scale(0.98); }
          100% { transform: translateY(0)    scale(1);    }
        }
        .chip-pop {
          animation-name: chipPop;
          animation-duration: 0.38s;
          animation-timing-function: cubic-bezier(0.34, 1.56, 0.64, 1);
          animation-fill-mode: both;
        }
      `}</style>

      {/* L1: Category tabs */}
      <div className="relative group">
        <div
          ref={scrollContainerRef}
          className="suggest-carousel flex gap-2 px-5 pb-2 overflow-x-auto"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {categories.map((cat, idx) => {
            const active = selectedIdx === idx;
            return (
              <button
                key={cat.id}
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
                  {cat.label}
                </span>
                {cat.sub && (
                  <span
                    className="text-[9px] leading-tight whitespace-nowrap"
                    style={{
                      color: active ? "rgba(27,37,40,0.45)" : "rgba(27,37,40,0.32)",
                      letterSpacing: "0.18px",
                    }}
                  >
                    {cat.sub}
                  </span>
                )}
              </button>
            );
          })}
        </div>

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

        {canScrollRight && (
          <div
            className="pointer-events-none absolute right-0 top-0 bottom-0 w-10"
            style={{ background: "linear-gradient(270deg, white 0%, transparent 100%)" }}
          />
        )}

        {canScrollLeft && (
          <div
            className="pointer-events-none absolute left-0 top-0 bottom-0 w-10"
            style={{ background: "linear-gradient(90deg, white 0%, transparent 100%)" }}
          />
        )}
      </div>

      {/* L2: Chips grid (re-mounted per category so chipPop replays on switch) */}
      <div style={{ padding: "0 20px 14px" }}>
        <div style={{ overflowX: "auto", overflowY: "visible", scrollbarWidth: "none" as const, padding: "3px", margin: "-3px" }}>
          <div
            key={selectedCategory?.id ?? "empty"}
            style={{ display: "grid", gridTemplateRows: "repeat(2, 30px)", gridAutoFlow: "column", gridAutoColumns: "max-content", gap: "8px" }}
          >
            {selectedChips.map((chip, i) => (
              <button
                key={chip}
                type="button"
                onClick={() => onSend(chip)}
                disabled={isLoading}
                className="chip-pop flex items-center justify-center rounded-full bg-white transition-all active:scale-95 hover:shadow-md disabled:opacity-50"
                style={{
                  height: "30px",
                  padding: "0 13px",
                  border: "none",
                  boxShadow: "0px 1px 4px rgba(27,37,40,0.13), 0px 0px 0px 0.5px rgba(27,37,40,0.07)",
                  fontSize: "11px",
                  color: "#1b2528",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  animationDelay: `${i * 0.05}s`,
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
  previewSuggestCategories,
  previewSuggestDisplayMode,
}: AiChatPanelProps) {
  const introScript = getIntroScript(pageType, storeName, storeInfo);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [suggestCategories, setSuggestCategories] = useState<SuggestCategory[]>([]);
  const [suggestDisplayMode, setSuggestDisplayMode] =
    useState<SuggestDisplayMode>("categorized");
  const [followUpButtons, setFollowUpButtons] = useState<string[]>([]);
  const [enabled, setEnabled] = useState(true);
  const [mode, setMode] = useState<ChatMode>("agent");
  const [limitReached, setLimitReached] = useState(false);

  // Intro animation state.
  // 以前は sessionStorage に「再生済み」フラグを保存していたが、
  // 「リロード時に intro が出ないことがある」フィードバックを受けて撤廃。
  // ページ遷移・リロード時は必ず再生する。再マウント時の再注入は
  // setHasSent (ユーザーが何か送信したら以後 intro はスキップ) で防ぐ。
  const [introPhase, setIntroPhase] = useState<
    "idle" | "typing-user" | "show-user" | "typing-ai" | "show-ai" | "done"
  >("idle");
  const [introUserText, setIntroUserText] = useState("");
  const [introAiText, setIntroAiText] = useState("");
  const [introPlayed, setIntroPlayed] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  // SSE 接続を持つ AbortController を保持し、unmount or 新規送信時にキャンセルする。
  // これがないと、ユーザーが画面遷移しても fetch が裏で生き続け、reader が
  // chunk を待ち続ける（memory leak + 不要な PHP-FPM ワーカ占有）。
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => {
    abortRef.current?.abort();
    abortRef.current = null;
  }, []);

  // ---- Load config ----
  useEffect(() => {
    if (preview) return;
    fetchConfig(pageType)
      .then((cfg) => {
        setEnabled(cfg.enabled);
        setSuggestCategories(cfg.suggest_categories ?? []);
        setSuggestDisplayMode(cfg.suggest_display_mode ?? "categorized");
      })
      .catch(() => {});
  }, [pageType, preview]);

  // In preview mode, use props directly
  const activeSuggestCategories = preview
    ? (previewSuggestCategories ?? [])
    : suggestCategories;
  const activeSuggestDisplayMode: SuggestDisplayMode = preview
    ? (previewSuggestDisplayMode ?? "categorized")
    : suggestDisplayMode;

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

    // threshold は低めに (0.05)。チャットパネルが viewport より大きい場合に
    // 0.3 達しないことがあり、その場合 intro が一切始まらないバグになる。
    // 加えてフォールバックで 1.5 秒後に強制的に再生開始する: モバイルの
    // ヘッダー固定で IntersectionObserver の発火タイミングが
    // 想定外になるケースを救う。
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && introPhase === "idle") {
          setIntroPhase("typing-user");
          observer.disconnect();
        }
      },
      { threshold: 0.05 },
    );

    observer.observe(el);
    const fallback = setTimeout(() => {
      if (introPhase === "idle") setIntroPhase("typing-user");
    }, 1500);

    return () => {
      observer.disconnect();
      clearTimeout(fallback);
    };
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

  // ---- Auto-scroll ----
  // Once the user has sent at least one message, keep the latest user message
  // pinned near the top of the chat viewport — even as the AI reply streams in
  // below. Without this, new AI tokens push the question off-screen and the
  // user has to scroll back up to remember what they asked.
  // Before any user message exists (intro animation, suggestion chips), fall
  // back to bottom-scroll so the latest content stays visible.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const userCount = messages.filter((m) => m.role === "user").length;

    requestAnimationFrame(() => {
      if (userCount > 0) {
        const userNodes = el.querySelectorAll<HTMLElement>('[data-msg-role="user"]');
        const lastUser = userNodes[userNodes.length - 1];
        if (lastUser) {
          const target = lastUser.offsetTop - el.offsetTop - 12;
          el.scrollTo({
            top: target,
            // Smooth on the first jump, instant during streaming so the
            // pinned position doesn't fight the layout shift.
            behavior: Math.abs(el.scrollTop - target) > 4 ? "smooth" : "auto",
          });
          return;
        }
      }
      el.scrollTop = el.scrollHeight;
    });
  }, [messages, isLoading]);

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
      // 受信用 AI 吹き出しを先に追加して、以後 delta を末尾に追記する
      const placeholder: ChatMessage = { role: "ai", content: "", streaming: true };
      setMessages((prev) => [...prev, userMessage, placeholder]);
      setInput("");
      // textarea の自動拡張高さを 1 行分にリセット (送信後に大きいまま残らないように)
      if (inputRef.current) inputRef.current.style.height = "";
      setIsLoading(true);

      // 既存ストリームが残っていればキャンセル（連打や遷移後の再送信に備える）
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      // サーバ側で [STORE:ID] は既に除去済みなので、フロントでは LINE 定型句のみ削除する。
      // 毎 chunk フル文字列に対して regex を回すと O(n²) になるため、対象を絞ることが重要。
      const cleanText = (s: string) =>
        s
          .replace(/\n*もっと詳しく知りたい方は、?LINEで担当者に直接相談できます[！!]?\s*/g, "")
          .replace(/\n*より詳しく知りたい方は、?LINEで担当者に直接相談できます[！!]?\s*/g, "");

      let accumulated = "";

      try {
        const history = [...messages, userMessage].map((m) => ({
          role: m.role === "ai" ? "assistant" : "user",
          content: m.content,
        }));

        await streamMessage(
          msg,
          pageType,
          history,
          mode,
          storeId,
          controller.signal,
          {
            onStatus: (label) => {
              setMessages((prev) => {
                const next = [...prev];
                const last = next[next.length - 1];
                if (last?.role === "ai" && last.streaming) {
                  next[next.length - 1] = { ...last, streamingStatus: label };
                }
                return next;
              });
            },
            onDelta: (delta) => {
              accumulated += delta;
              const visible = cleanText(accumulated).trimStart();
              setMessages((prev) => {
                const next = [...prev];
                const last = next[next.length - 1];
                if (last?.role === "ai" && last.streaming) {
                  next[next.length - 1] = { ...last, content: visible, streamingStatus: undefined };
                }
                return next;
              });
            },
            onDone: ({ stores, follow_ups, meta }) => {
              const finalText = cleanText(accumulated).trim();
              setMessages((prev) => {
                const next = [...prev];
                const last = next[next.length - 1];
                if (last?.role === "ai") {
                  next[next.length - 1] = {
                    ...last,
                    content: finalText,
                    stores,
                    follow_ups,
                    meta,
                    showLineCta: true,
                    streaming: false,
                    streamingStatus: undefined,
                  };
                }
                return next;
              });
              setFollowUpButtons(generateFollowUps(pageType, input, finalText));
            },
          },
        );
      } catch (err) {
        const error = err as Error & { limitType?: string };
        const isLimit = !!error.limitType;
        setMessages((prev) => {
          const next = [...prev];
          // ストリーミング中の placeholder を差し替える
          const last = next[next.length - 1];
          const errContent = isLimit
            ? error.message
            : "申し訳ございません。エラーが発生しました。もう一度お試しください。";
          // 上限到達時は、チャットが使えなくなる最重要局面なので必ず LINE 誘導 CTA を出す
          // (サービスの本質は LINE 友だち追加への誘導)。
          if (last?.role === "ai" && last.streaming) {
            next[next.length - 1] = { role: "ai", content: errContent, showLineCta: isLimit };
          } else {
            next.push({ role: "ai", content: errContent, showLineCta: isLimit });
          }
          return next;
        });
        if (isLimit) setLimitReached(true);
      } finally {
        setIsLoading(false);
      }
    },
    [input, isLoading, messages, pageType, storeId, introPhase, mode, limitReached, preview],
  );

  if (!enabled) return null;

  const hasMessages = messages.length > 0;
  // 末尾の AI メッセージが streaming 中か（ヘッダーアバターのリング点灯用）
  const lastMsg = messages[messages.length - 1];
  const hasStreamingMsg = lastMsg?.role === "ai" && !!lastMsg.streaming;
  const showIntro =
    !hasMessages &&
    introPhase !== "idle" &&
    (introPhase !== "done" || introPlayed);

  const showFollowUp =
    followUpButtons.length > 0 &&
    !isLoading &&
    messages.length > 0 &&
    messages[messages.length - 1]?.role === "ai";

  // Suggest carousel: driven by admin-managed `suggest_categories` +
  // `suggest_display_mode`. Hidden during conversation, when mode=off, or
  // when no chips exist.
  const showCategoryChips =
    !hasMessages &&
    activeSuggestDisplayMode !== "off" &&
    activeSuggestCategories.length > 0;

  return (
    <div
      ref={panelRef}
      className={`overflow-hidden rounded-[14px] ${className ?? ""}`}
      style={{
        backgroundColor: "#ffffff",
        border: "1px solid rgba(212,175,55,0.28)",
        boxShadow: "0px 4px 16px rgba(0,0,0,0.12), 0px 1px 4px rgba(0,0,0,0.08)",
        position: "relative",
        zIndex: 3,
        isolation: "isolate",
      }}
    >
      {/* ---- Header ---- */}
      <div className="flex items-center justify-between px-4 py-3">
        {/* 左: 金縦バー + 見出し + NEW pill (+ dev用 mode toggle) */}
        <div className="flex items-center gap-2">
          <span
            aria-hidden
            className="h-4 w-1 shrink-0 rounded-full"
            style={{ background: "linear-gradient(180deg, #D4AF37 0%, #c8960c 100%)" }}
          />
          <span
            className="font-bold"
            style={{
              color: "#1b2528",
              fontFamily: "'Outfit', 'Noto Sans JP', sans-serif",
              fontSize: 16,
              letterSpacing: "-0.02em",
            }}
          >
            AIに相談する
          </span>
          <span
            className="shrink-0 rounded-full px-1.5 py-0.5"
            style={{
              background: "linear-gradient(135deg, #1b2528 0%, #2c3e46 100%)",
              border: "1px solid rgba(212,175,55,0.4)",
              color: "#D4AF37",
              fontFamily: "'Outfit', sans-serif",
              fontWeight: 600,
              fontSize: 8.5,
              letterSpacing: "0.12em",
              lineHeight: 1.4,
            }}
          >
            NEW
          </span>
          {/* Mode toggle (Recta 固有の開発トグル / Figma には無い) */}
          <button
            type="button"
            onClick={() => setMode(mode === "agent" ? "finetuned" : "agent")}
            className="shrink-0 rounded-full px-2 py-0.5 text-[9px] font-semibold transition-colors"
            style={{
              backgroundColor: mode === "agent" ? "rgba(212,175,55,0.12)" : "rgba(99,102,241,0.12)",
              color: mode === "agent" ? "#D4AF37" : "#6366f1",
              border: `0.5px solid ${mode === "agent" ? "rgba(212,175,55,0.3)" : "rgba(99,102,241,0.3)"}`,
            }}
          >
            {mode === "agent" ? "Agent" : "FT"}
          </button>
        </div>
        {/* 右: Recta AI アバター + テキスト + オンラインドット */}
        <div className="flex shrink-0 items-center gap-1.5">
          <AiAvatar size={22} ring={hasStreamingMsg} />
          <span
            className="font-bold"
            style={{
              color: "#1b2528",
              fontFamily: "'Outfit', 'Noto Sans JP', sans-serif",
              fontSize: 13,
            }}
          >
            Recta AI
          </span>
          <span aria-hidden className="relative ml-0.5 inline-flex size-1.5">
            <span
              className="absolute inline-flex h-full w-full rounded-full animate-ping"
              style={{ backgroundColor: "#D4AF37", opacity: 0.75 }}
            />
            <span
              className="relative inline-flex size-1.5 rounded-full"
              style={{ backgroundColor: "#D4AF37" }}
            />
          </span>
        </div>
      </div>

      {/* ---- Intro greeting (chat bubble style with typing animation) ---- */}
      {!hasMessages && introPhase !== "idle" && (
        <div
          className="flex flex-col gap-3 px-4 py-3.5"
          style={{
            backgroundColor: "#faf9f7",
            borderTop: "1px solid rgba(27,37,40,0.05)",
            borderBottom: "1px solid rgba(27,37,40,0.05)",
          }}
        >
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
              <div className="mr-2 mt-auto">
                <AiAvatar size={24} />
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
              <div className="mr-2 mt-auto">
                <AiAvatar size={24} />
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

      {/* ---- Suggest carousel (admin-managed) ---- */}
      {showCategoryChips && (
        <div className="pt-3">
          <SuggestActionsCarousel
            categories={activeSuggestCategories}
            mode={activeSuggestDisplayMode}
            isLoading={isLoading}
            onSend={handleSend}
          />
        </div>
      )}

      {/* ---- Messages area ---- */}
      {hasMessages && (
        <div
          ref={scrollRef}
          role="log"
          aria-live="polite"
          aria-relevant="additions text"
          aria-label="AIチャットの会話"
          className="max-h-[360px] overflow-y-auto"
          style={{
            scrollBehavior: "smooth",
            backgroundColor: "#faf9f7",
            borderTop: "1px solid rgba(27,37,40,0.05)",
            borderBottom: "1px solid rgba(27,37,40,0.05)",
          }}
        >
          <div className="flex flex-col gap-3 px-4 py-3.5">
            {messages.map((msg, i) => {
              const isLimitMsg = limitReached && msg.role === "ai" && i === messages.length - 1;
              return (
              <div key={i} data-msg-role={msg.role}>
                <div
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {msg.role === "ai" && (
                    <div className="mr-2 mt-auto">
                      {isLimitMsg ? (
                        <div
                          className="flex size-6 shrink-0 items-center justify-center rounded-[10px]"
                          style={{ background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)" }}
                        >
                          <AlertTriangle className="size-3.5 text-white" />
                        </div>
                      ) : (
                        <AiAvatar size={24} />
                      )}
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
                    {msg.role === "ai" && msg.streaming && !msg.content ? (
                      // Streaming placeholder: dots + optional status label (e.g. "店舗を検索しています…")
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1" aria-hidden>
                          <span
                            className="size-1.5 rounded-full animate-bounce [animation-delay:0ms]"
                            style={{ backgroundColor: "rgba(27,37,40,0.3)" }}
                          />
                          <span
                            className="size-1.5 rounded-full animate-bounce [animation-delay:150ms]"
                            style={{ backgroundColor: "rgba(27,37,40,0.3)" }}
                          />
                          <span
                            className="size-1.5 rounded-full animate-bounce [animation-delay:300ms]"
                            style={{ backgroundColor: "rgba(27,37,40,0.3)" }}
                          />
                        </span>
                        {msg.streamingStatus && (
                          <span className="text-[11px]" style={{ color: "rgba(27,37,40,0.55)" }}>
                            {msg.streamingStatus}
                          </span>
                        )}
                      </div>
                    ) : (
                      <>
                        {msg.content}
                        {msg.role === "ai" && msg.streaming && (
                          <span
                            aria-hidden
                            className="inline-block w-[2px] h-[1em] align-text-bottom ml-[2px]"
                            style={{
                              backgroundColor: "rgba(27,37,40,0.55)",
                              animation: "rectaChatCursor 1s steps(2) infinite",
                            }}
                          />
                        )}
                      </>
                    )}
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
                        <Link
                          key={store.id}
                          to={`/stores/${store.slug ?? store.id}`}
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
                              {(store.trial_hourly_min != null || store.trial_hourly_max != null) && (
                                <span className="font-medium" style={{ color: "#D4AF37" }}>
                                  体入 {formatWage(store.trial_hourly_min, store.trial_hourly_max)}
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
                        </Link>
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
                        onClick={() => openLineFriendAdd("chat:line-cta")}
                        aria-label="LINE公式で直接相談する（友だち追加）"
                        className="flex w-full items-center justify-center gap-2 rounded-[8px] py-2.5 text-[13px] font-bold text-white transition-opacity hover:opacity-90"
                        style={{ backgroundColor: "#06C755" }}
                      >
                        <LineIcon size={18} />
                        LINE公式で直接相談する
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
            })}

            {/* Streaming cursor keyframes (kept inline so this component is self-contained) */}
            <style>{`@keyframes rectaChatCursor{0%,49%{opacity:1}50%,100%{opacity:0}}`}</style>

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
            className="relative flex flex-1 items-end gap-2.5 rounded-[16px] px-4"
            style={{
              backgroundColor: "#f4f3f1",
              minHeight: "48px",
              border: "1.5px solid rgba(27,37,40,0.12)",
            }}
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                // 内容に応じて高さ自動拡張 (最大 4 行相当 = 96px)
                const t = e.currentTarget;
                t.style.height = "auto";
                t.style.height = `${Math.min(t.scrollHeight, 96)}px`;
              }}
              onKeyDown={(e) => {
                // モバイル想定: 改行キー = 改行。送信は送信ボタンで。
                // PC: Shift+Enter で改行、素の Enter で送信 (チャットの慣例)。
                // 「タッチデバイス = モバイル」と判定して挙動を切替。
                // IME 変換中の Enter は何もしない (誤送信防止)。
                if (e.nativeEvent.isComposing || e.keyCode === 229) return;
                if (e.key !== "Enter") return;
                const isTouch = typeof window !== "undefined"
                  && (("ontouchstart" in window)
                    || (navigator.maxTouchPoints ?? 0) > 0);
                if (isTouch) return; // モバイルは改行を許可、送信は別ボタン
                if (e.shiftKey) return; // PC: Shift+Enter は改行
                e.preventDefault();
                handleSend();
              }}
              placeholder={limitReached ? "利用上限に達しました" : "何でも聞いてください…"}
              aria-label="AIチャットへのメッセージ入力"
              disabled={isLoading || limitReached}
              rows={1}
              // iOS Safari は font-size が 16px 未満だとフォーカス時に
              // 自動ズームしてしまう。16px 固定。
              className="w-full bg-transparent outline-none disabled:opacity-50 resize-none py-3 leading-tight"
              style={{
                color: "#1b2528",
                fontFamily: "'Noto Sans JP', sans-serif",
                fontSize: "16px",
                minHeight: "24px",
                maxHeight: "96px",
              }}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading || limitReached}
              className="mb-2 flex size-8 shrink-0 items-center justify-center rounded-xl transition-all disabled:opacity-30 active:scale-90"
              style={{
                background: input.trim() && !isLoading && !limitReached
                  ? "linear-gradient(135deg, #D4AF37 0%, #9a7a20 100%)"
                  : "rgba(27,37,40,0.1)",
              }}
              aria-label="送信"
            >
              {isLoading ? (
                <Loader2
                  className="size-3.5 animate-spin"
                  style={{ color: input.trim() ? "white" : "rgba(27,37,40,0.35)" }}
                />
              ) : (
                <svg width={14} height={14} viewBox="0 0 18.6667 18.6667" fill="none" aria-hidden>
                  <path
                    d={SEND_ARROW_PATH}
                    stroke={input.trim() && !limitReached ? "white" : "rgba(27,37,40,0.35)"}
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

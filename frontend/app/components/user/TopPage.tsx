import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router";
import AiChatPanel from "~/components/user/AiChatPanel";
import Footer from "~/components/user/shared/Footer";
import RecentlyViewedStores from "~/components/user/shared/RecentlyViewedStores";
import RelocateSupportCta from "~/components/user/shared/RelocateSupportCta";
import SectionHeader from "~/components/user/shared/SectionHeader";
import { LineIcon } from "~/components/user/shared/LineIcon";
import { useUserAuth } from "~/lib/user-auth";
import { LUXE } from "~/lib/luxe-tokens";
import type { ArticleSummary, PublicArticleIndexResponse } from "~/lib/types";

// ─── Constants ─────────────────────────────────────
// Color/gradient/font tokens live in ~/lib/luxe-tokens. Aliases kept short for
// the heavy inline-style usage below.
const GOLD = LUXE.gold;
const DARK = LUXE.dark;
const J = LUXE.fontJa;
const AI_AVATAR_BG = "linear-gradient(135deg,#D4AF37,#9a7a20)";
const ROBOT_SVG_PATH = "M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1a7 7 0 0 1-7 7H9a7 7 0 0 1-7-7H1a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73A2 2 0 0 1 12 2zm-4 9a1 1 0 1 0 0 2 1 1 0 0 0 0-2zm8 0a1 1 0 1 0 0 2 1 1 0 0 0 0-2z";
const BASE_GRADIENT = LUXE.baseGradient;

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
  image_url?: string | null;
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

// 初期に見せるエリア数と、「他のエリアも見る」を押すたびに足す件数。
const AREA_INITIAL = 6;
const AREA_STEP = 8;

export default function TopPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<HomeData | null>(null);
  const { isAuthenticated } = useUserAuth();
  const [areasVisible, setAreasVisible] = useState(AREA_INITIAL);
  // 最新コラム。0 件ならセクションごと非表示にするので別 state で軽く取る。
  const [columns, setColumns] = useState<ArticleSummary[]>([]);

  useEffect(() => {
    fetch("/api/home")
      .then((res) => res.json())
      .then((json: HomeData) => { setData(json); setLoading(false); })
      .catch(() => { setLoading(false); });

    fetch("/api/columns?per_page=3")
      .then((res) => (res.ok ? res.json() : null))
      .then((json: PublicArticleIndexResponse | null) => {
        const list = json?.articles?.data ?? [];
        setColumns(Array.isArray(list) ? list : []);
      })
      .catch(() => setColumns([]));
  }, []);

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="size-10 animate-spin rounded-full border-4" style={{ borderColor: "rgba(212,175,55,0.2)", borderTopColor: GOLD }} />
          <p className="text-sm" style={{ color: "rgba(27,37,40,0.5)" }}>読み込み中...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-1 items-center justify-center">
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
    <>
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
            {/* BUG-Live-08: ヒーロー文言は site_settings (DB) で管理する想定だが、
                ここでハードコードされていたため、管理画面で変えても反映されなかった。
                API レスポンス (data.banner) を優先し、無い場合だけ既定文言にフォールバック。 */}
            <p style={{ fontFamily: J, fontWeight: 500, fontSize: "15px", letterSpacing: "0.04em", color: "rgba(255,255,255,.96)", lineHeight: 1.5, textShadow: "0 1px 12px rgba(0,0,0,.5)", margin: "0 0 4px" }}>{data.banner?.hero_tagline || "AIと探す、理想のナイトワーク"}</p>
            <p style={{ fontFamily: J, fontWeight: 300, fontSize: "11px", letterSpacing: "0.08em", color: "rgba(255,240,180,.88)", margin: 0 }}>{data.banner?.hero_subtitle || "キャバクラ・ラウンジ・クラブ｜都内厳選"}</p>
          </div>
        </div>

        {/* ══ AI CHAT ══ */}
        <div style={{ background: BASE_GRADIENT, padding: "14px 12px 16px", position: "relative" }}>
          <GlowOrbs />
          <AiChatPanel pageType="top" />
        </div>

        {/* ══ PICKUP STORES ══
            BUG-Live-09: 0件のとき空のセクションタイトルだけ出てた。
            データがあるときだけセクション全体を描画する。 */}
        {pickupShops.length > 0 && (
        <div className="mt-4">
          <div className="px-5 mb-3">
            <SectionHeader
              title="ピックアップ店舗"
              badge="PR"
              right={
                <Link to="/stores" style={{ fontFamily: J, fontWeight: 400, fontSize: "12px", color: GOLD, textDecoration: "none" }}>すべて見る →</Link>
              }
            />
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
        )}

        {/* ══ 上京サポート BANNER ══ */}
        <div className="mt-6 px-5">
          <RelocateSupportCta variant="top" />
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
              const requireLogin = !isAuthenticated && idx >= 3;
              // 口コミ表示は本人のニックネームのみ。LINE 実名はプライバシー保護のため使わない。
              const userName = review.user?.nickname || "匿名";
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
                      {/* 親要素がもう <Link to="/login"> なので、ここは
                          presentational なボタン外見だけ。<a> をネストすると
                          React Router の hydrate が壊れて Invalid HTML 警告
                          になるため、敢えてただの <span> にする。クリックは
                          外側カードの Link が拾う。 */}
                      <span
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl"
                        style={{ background: "#06C755", boxShadow: "0 4px 14px rgba(6,199,85,.3), 0 1px 3px rgba(6,199,85,.2)" }}
                      >
                        <LineIcon size={16} />
                        <span style={{ fontFamily: J, fontWeight: 600, fontSize: "12px", color: "white", letterSpacing: "0.02em" }}>LINEでログイン</span>
                      </span>
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
                {areas.slice(0, areasVisible).map((area, i) => {
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
              {areasVisible < areas.length && (
                <button
                  type="button"
                  onClick={() => setAreasVisible((v) => Math.min(v + AREA_STEP, areas.length))}
                  className="mt-3 w-full flex items-center justify-center gap-1.5 rounded-xl active:scale-[0.98] transition-transform"
                  style={{ height: "44px", background: "rgba(212,175,55,.1)", border: "1px solid rgba(212,175,55,.25)", cursor: "pointer" }}
                  aria-label={`他のエリアをさらに${Math.min(AREA_STEP, areas.length - areasVisible)}件表示`}
                >
                  <span style={{ fontFamily: J, fontWeight: 600, fontSize: "12.5px", color: GOLD, letterSpacing: "0.02em" }}>
                    他のエリアも見る（あと{areas.length - areasVisible}件）
                  </span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke={GOLD} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </button>
              )}
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
                  // Prefer the admin-uploaded image_url; fall back to the
                  // legacy hardcoded dictionary while migration data is sparse,
                  // then a flat dark gradient if nothing exists.
                  const img = cat.image_url || CATEGORY_IMAGES[cat.name];
                  return (
                    <Link key={cat.id} to={`/stores?category=${encodeURIComponent(cat.slug)}`} className="shrink-0 relative rounded-2xl overflow-hidden active:scale-[0.97] transition-transform" style={{ width: "130px", height: "160px", border: "1px solid rgba(255,255,255,.1)", textDecoration: "none" }}>
                      {img ? (
                        <img src={img} alt={cat.name} className="absolute inset-0 w-full h-full object-cover" />
                      ) : (
                        <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${DARK} 0%, #2c3e46 100%)` }} />
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

        {/* ══ COLUMNS (Recta コラム) ══
            記事 0 件ならセクションごと非表示 (空棚は逆効果)。            */}
        {columns.length > 0 && (
          <div className="mt-6 px-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-1 h-5 rounded-full" style={{ background: `linear-gradient(180deg,${GOLD},#c8960c)` }} />
                <h2 style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 700, fontSize: "17px", letterSpacing: "-0.02em", color: DARK, margin: 0 }}>
                  Recta コラム
                </h2>
              </div>
              <Link
                to="/columns"
                style={{ fontFamily: J, fontSize: "12px", fontWeight: 500, color: "rgba(27,37,40,.55)", textDecoration: "none" }}
              >
                もっと見る →
              </Link>
            </div>

            <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" as const }}>
              {columns.map((col) => (
                <Link
                  key={col.id}
                  to={`/columns/${col.slug}`}
                  className="shrink-0"
                  style={{
                    width: 220,
                    background: "white",
                    borderRadius: 14,
                    border: "1px solid rgba(27,37,40,.06)",
                    boxShadow: "0 4px 16px rgba(0,0,0,.04)",
                    overflow: "hidden",
                    textDecoration: "none",
                    color: DARK,
                  }}
                >
                  <div
                    style={{
                      width: "100%",
                      aspectRatio: "16 / 10",
                      background: col.thumbnail_url
                        ? `center / cover url(${col.thumbnail_url})`
                        : `linear-gradient(135deg, ${DARK} 0%, #2c3e46 50%, rgba(200,96,128,.4) 100%)`,
                      position: "relative",
                    }}
                  >
                    {col.category && (
                      <span
                        className="absolute top-2 left-2 px-2 py-0.5 rounded"
                        style={{
                          background: "rgba(255,255,255,.92)",
                          fontFamily: J,
                          fontWeight: 700,
                          fontSize: "10px",
                          color: DARK,
                        }}
                      >
                        {col.category}
                      </span>
                    )}
                  </div>
                  <div className="p-3">
                    <h3
                      style={{
                        fontFamily: J,
                        fontWeight: 700,
                        fontSize: "13px",
                        lineHeight: 1.5,
                        margin: 0,
                        color: DARK,
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical" as const,
                        overflow: "hidden",
                      }}
                    >
                      {col.title}
                    </h3>
                    {col.excerpt && (
                      <p
                        style={{
                          fontFamily: J,
                          fontWeight: 400,
                          fontSize: "11px",
                          lineHeight: 1.6,
                          margin: "6px 0 0",
                          color: "rgba(27,37,40,.55)",
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical" as const,
                          overflow: "hidden",
                        }}
                      >
                        {col.excerpt}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

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
        <Footer />
    </>
  );
}

import { useCallback, useEffect, useRef, useState } from "react";
import { LUXE } from "~/lib/luxe-tokens";

/**
 * 「みんなの相談」セクション。
 *
 * `/api/home` の consultations をそのまま受けるか、空ならフォールバックの
 * 固定プールから 4 件をシャッフルして表示する。12 秒ごとに自動入れ替え。
 *
 * 以前は TopPage 内のローカル関数だったが、コラム頁にも同じ UI を出すために
 * 共有コンポーネント化した (2026-05-29)。
 */

const GOLD = LUXE.gold;
const DARK = LUXE.dark;
const J = LUXE.fontJa;
const AI_AVATAR_BG = "linear-gradient(135deg,#D4AF37,#9a7a20)";
const ROBOT_SVG_PATH =
  "M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1a7 7 0 0 1-7 7H9a7 7 0 0 1-7-7H1a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73A2 2 0 0 1 12 2zm-4 9a1 1 0 1 0 0 2 1 1 0 0 0 0-2zm8 0a1 1 0 1 0 0 2 1 1 0 0 0 0-2z";

export interface TrendingItem {
  q: string;
  a: string;
  tag?: string;
  count?: string;
}

const TRENDING_POOL: TrendingItem[] = [
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

function AiAvatar({ size }: { size: number }) {
  const iconSize = size * 0.625;
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.44,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        background: AI_AVATAR_BG,
      }}
    >
      <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none">
        <path d={ROBOT_SVG_PATH} fill="white" />
      </svg>
    </div>
  );
}

function shuffleAndPick<T>(pool: T[], count: number, exclude?: T[]): T[] {
  const available = exclude ? pool.filter((p) => !exclude.includes(p)) : [...pool];
  for (let i = available.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [available[i], available[j]] = [available[j], available[i]];
  }
  return available.slice(0, count);
}

export default function TrendingTopics({ pool }: { pool: TrendingItem[] }) {
  const DISPLAY_COUNT = 4;
  const safePool = pool.length > 0 ? pool : TRENDING_POOL;
  // SSR/CSR で shuffleAndPick(Math.random) の結果が一致せず hydration
  // mismatch が出るため、初期値は決定的な「先頭 N 件」にして、マウント後に
  // shuffle する。
  const [items, setItems] = useState<TrendingItem[]>(() => safePool.slice(0, DISPLAY_COUNT));
  const [hasMounted, setHasMounted] = useState(false);
  useEffect(() => {
    if (hasMounted) return;
    setHasMounted(true);
    setItems(shuffleAndPick(safePool, DISPLAY_COUNT));
  }, [hasMounted, safePool]);
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
      const heights = answerRefs.current.map((el) => el?.scrollHeight ?? 0);
      setAnswerHeights(heights);
    });
  }, [items, isRegenerating]);

  const regenerate = useCallback(
    (manual = false) => {
      setIsRegenerating(true);
      setVisibleCount(0);
      setProgress(0);
      setOpenIdx(null);
      setTimeout(() => {
        setItems((prev) => shuffleAndPick(safePool, DISPLAY_COUNT, prev));
        setIsRegenerating(false);
      }, manual ? 500 : 400);
    },
    [safePool],
  );

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
    cycleRef.current = setTimeout(() => {
      regenerate(false);
    }, CYCLE_INTERVAL);
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
          onClick={() => {
            if (cycleRef.current) clearTimeout(cycleRef.current);
            regenerate(true);
          }}
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
              {[0, 1, 2].map((i) => (
                <span key={i} className="inline-block w-[5px] h-[5px] rounded-full" style={{ background: GOLD, animation: `typingWave 1.3s ease-in-out ${i * 0.18}s infinite`, opacity: 0.7 }} />
              ))}
            </div>
            <span style={{ fontFamily: J, fontWeight: 400, fontSize: "11px", color: "rgba(27,37,40,.4)" }}>トレンドを分析中…</span>
          </div>
        ) : (
          items.map((item, i) => {
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
                  onClick={() => setOpenIdx((prev) => (prev === i ? null : i))}
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
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

import { Link } from "react-router";
import { openLineFriendAdd } from "~/lib/line";

const GOLD = "#d4af37";
const DARK = "#1b2528";
const J = "'Noto Sans JP',sans-serif";

const STEPS = [
  {
    no: "01",
    title: "オンライン面接",
    body: "LINE通話 or Zoomで面接。来店不要、所要時間15〜30分。",
  },
  {
    no: "02",
    title: "体験入店（体験確約）",
    body: "希望店舗での体験入店を確約。交通費サポートあり。",
  },
  {
    no: "03",
    title: "住居サポート",
    body: "家賃補助・敷金礼金ゼロ物件・家具家電付きシェアハウスをご紹介。",
  },
  {
    no: "04",
    title: "上京・本入店",
    body: "引越し費用補助、初月家賃サポート、入店祝い金あり。",
  },
];

const FEATURES = [
  { icon: "🏠", label: "住居完備", note: "家具家電付き・初期費用ゼロ" },
  { icon: "💰", label: "上京費補助", note: "最大10万円・引越し代金支援" },
  { icon: "✈️", label: "交通費全額", note: "面接・体入時の交通費を全額負担" },
  { icon: "🛡️", label: "保証制度", note: "最低保証3〜6ヶ月で安心スタート" },
];

const VOICES = [
  { area: "北海道→六本木", words: "面接から入店まで全部オンラインで完結。家も用意してもらえて、上京1週間後には働けてました。" },
  { area: "九州→銀座", words: "体験確約だったので安心して来れました。最初の家賃も補助があったので貯金ゼロでも始められた。" },
  { area: "東北→歌舞伎町", words: "家具家電付きの家を紹介してもらえて、スーツケース1つで上京しました。" },
];

export default function RelocateSupportPage() {
  return (
    <div style={{ background: "#faf9f5", minHeight: "100vh", paddingBottom: "80px" }}>
      {/* ── HERO ── */}
      <div
        style={{
          background: `linear-gradient(135deg, ${DARK} 0%, #2c3e46 50%, rgba(200,96,128,.4) 100%)`,
          padding: "32px 20px 48px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div style={{ position: "absolute", top: 0, right: 0, bottom: 0, width: "60%", background: `radial-gradient(circle at 70% 30%, rgba(212,175,55,.18), transparent 60%)`, pointerEvents: "none" }} />
        <Link to="/" style={{ color: "rgba(255,255,255,.6)", fontSize: "13px", textDecoration: "none", fontFamily: J }}>← トップに戻る</Link>
        <div style={{ marginTop: "20px", position: "relative" }}>
          <span style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 700, fontSize: "11px", letterSpacing: "0.16em", color: GOLD, textTransform: "uppercase" }}>Recta Relocate Support</span>
          <h1 style={{ fontFamily: J, fontWeight: 700, fontSize: "26px", color: "white", margin: "8px 0 12px", lineHeight: 1.35 }}>
            地方から東京で働きたい方を<br />全力サポート
          </h1>
          <p style={{ fontFamily: J, fontWeight: 400, fontSize: "13.5px", color: "rgba(255,255,255,.78)", margin: 0, lineHeight: 1.7 }}>
            体験確約・オンライン面接・住居・引越し費用まで、Rectaが上京を一気通貫でサポートします。
          </p>
        </div>
      </div>

      {/* ── FEATURES ── */}
      <div className="px-5 pt-6">
        <div className="grid grid-cols-2 gap-3">
          {FEATURES.map((f) => (
            <div key={f.label} className="rounded-2xl p-4" style={{ background: "white", border: "1px solid rgba(27,37,40,.06)", boxShadow: "0 4px 16px rgba(0,0,0,.04)" }}>
              <div style={{ fontSize: "22px", marginBottom: "6px" }}>{f.icon}</div>
              <p style={{ fontFamily: J, fontWeight: 700, fontSize: "13px", color: DARK, margin: 0 }}>{f.label}</p>
              <p style={{ fontFamily: J, fontWeight: 400, fontSize: "11px", color: "rgba(27,37,40,.55)", margin: "3px 0 0", lineHeight: 1.5 }}>{f.note}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── STEPS ── */}
      <div className="px-5 pt-8">
        <h2 style={{ fontFamily: J, fontWeight: 700, fontSize: "16px", color: DARK, margin: "0 0 16px" }}>上京までの流れ</h2>
        <div className="space-y-3">
          {STEPS.map((s) => (
            <div key={s.no} className="rounded-2xl p-4 flex gap-3" style={{ background: "white", border: "1px solid rgba(27,37,40,.06)" }}>
              <div className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${GOLD}, #c8960c)` }}>
                <span style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 700, fontSize: "13px", color: "white" }}>{s.no}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p style={{ fontFamily: J, fontWeight: 700, fontSize: "14px", color: DARK, margin: 0 }}>{s.title}</p>
                <p style={{ fontFamily: J, fontWeight: 400, fontSize: "12px", color: "rgba(27,37,40,.6)", margin: "4px 0 0", lineHeight: 1.6 }}>{s.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── VOICES ── */}
      <div className="px-5 pt-8">
        <h2 style={{ fontFamily: J, fontWeight: 700, fontSize: "16px", color: DARK, margin: "0 0 12px" }}>上京した先輩の声</h2>
        <div className="space-y-2.5">
          {VOICES.map((v) => (
            <div key={v.area} className="rounded-2xl p-4" style={{ background: "white", border: "1px solid rgba(200,96,128,.12)" }}>
              <span className="px-2 py-0.5 rounded inline-block" style={{ background: "rgba(200,96,128,.08)", fontFamily: J, fontWeight: 600, fontSize: "10px", color: "rgba(200,96,128,.85)" }}>{v.area}</span>
              <p style={{ fontFamily: J, fontWeight: 400, fontSize: "12.5px", color: DARK, margin: "8px 0 0", lineHeight: 1.7 }}>「{v.words}」</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── CTA ── */}
      <div className="px-5 pt-8">
        <div className="rounded-2xl p-5" style={{ background: `linear-gradient(135deg, ${DARK}, #2c3e46)`, border: `1px solid rgba(212,175,55,.3)` }}>
          <p style={{ fontFamily: J, fontWeight: 700, fontSize: "14.5px", color: "white", margin: 0 }}>まずは気軽にLINEで相談</p>
          <p style={{ fontFamily: J, fontWeight: 400, fontSize: "11.5px", color: "rgba(255,255,255,.65)", margin: "6px 0 14px", lineHeight: 1.7 }}>
            あなたの希望エリア・条件を聞いた上で、上京プランを一緒に組み立てます。
          </p>
          <button
            onClick={() => openLineFriendAdd()}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl active:scale-[0.98] transition-transform"
            style={{ background: "#06C755", border: "none", cursor: "pointer", color: "white", fontFamily: J, fontWeight: 700, fontSize: "13.5px" }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596a.629.629 0 0 1-.199.031c-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.271.173-.508.43-.595a.497.497 0 0 1 .194-.033c.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" /></svg>
            <span>LINEで上京相談する</span>
          </button>
        </div>
      </div>
    </div>
  );
}

import { Link } from "react-router";
import LineCtaCard from "~/components/user/shared/LineCtaCard";

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
        <LineCtaCard
          variant="dark"
          title="まずは気軽にLINEで相談"
          description="あなたの希望エリア・条件を聞いた上で、上京プランを一緒に組み立てます。"
          ctaLabel="LINEで上京相談する"
          source="relocate:end"
        />
      </div>
    </div>
  );
}

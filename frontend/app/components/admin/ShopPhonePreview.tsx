import { Star, MapPin, Clock, Phone, Shield, Sparkles, ChevronRight, X, Smartphone } from "lucide-react";

export interface ShopPreviewProps {
  shop: {
    name: string;
    area: string;
    address: string;
    station: string;
    category: string;
    hours: string;
    holiday: string;
    phone: string;
    minWage: string;
    maxWage: string;
    dailyPay: string;
    trialWage: string;
    sameDayTrial: string;
    guaranteePeriod: string;
    normaInfo: string;
    tags: string[];
    description: string;
    expLevel: number;
    atmosphere: number;
    backItems: { label: string; value: string }[];
    qaItems: { label: string; value: string }[];
    staffName: string;
    staffRole: string;
    staffComment: string;
    [key: string]: any;
  };
}

function RatingStars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star
          key={i}
          className={`w-3 h-3 ${i <= rating ? "text-amber-500 fill-amber-500" : "text-gray-200 fill-gray-200"}`}
        />
      ))}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="px-4 py-3">
      <h3 className="text-[10px] text-gray-400 uppercase tracking-[1.2px] mb-2" style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 600 }}>
        {title}
      </h3>
      {children}
    </div>
  );
}

function Divider() {
  return <div className="h-px mx-4 bg-gradient-to-r from-transparent via-gray-200 to-transparent" />;
}

function EmptyHint({ text }: { text: string }) {
  return (
    <div className="text-center py-3">
      <p className="text-[10px] text-gray-300">{text}</p>
    </div>
  );
}

export function ShopPhonePreview({ shop }: ShopPreviewProps) {
  const hasSalary = shop.minWage || shop.maxWage;

  return (
    <div className="flex flex-col items-center">
      {/* Phone shell */}
      <div className="w-[360px] bg-black rounded-[48px] p-[10px] shadow-2xl ring-1 ring-white/10">
        <div className="relative bg-white rounded-[38px] h-[700px] overflow-hidden flex flex-col">
          {/* Dynamic island */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 z-20 w-[120px] h-[32px] bg-black rounded-b-[20px]" />

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto overscroll-contain">
            {/* Hero */}
            <div className="relative h-[200px] bg-gradient-to-br from-[#1b2528] to-[#2c3e46]">
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-2 border border-white/15">
                    <Smartphone className="w-6 h-6 text-white/30" />
                  </div>
                  <p className="text-[9px] text-white/30">店舗画像</p>
                </div>
              </div>

              {shop.category && (
                <div className="absolute top-10 left-3">
                  <span className="text-[8px] px-2 py-0.5 bg-pink-500/85 text-white rounded tracking-wider">
                    {shop.category}
                  </span>
                </div>
              )}

              {hasSalary && (
                <div className="absolute bottom-3 left-3">
                  <p className="text-white text-[12px]" style={{ fontFamily: "'Outfit', 'Noto Sans JP', sans-serif", fontWeight: 700 }}>
                    時給 {shop.minWage ? Number(shop.minWage).toLocaleString() : "---"}〜{shop.maxWage ? Number(shop.maxWage).toLocaleString() : "---"}円
                  </p>
                </div>
              )}

              <div className="absolute top-10 right-3">
                <div className="w-7 h-7 bg-black/30 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/10">
                  <span className="text-white text-[10px]">♡</span>
                </div>
              </div>
            </div>

            {/* Shop Name & Info */}
            <div className="px-4 pt-4 pb-2">
              <h2 className="text-[15px] text-[#1b2528]" style={{ fontFamily: "'Noto Sans JP', sans-serif", fontWeight: 700 }}>
                {shop.name || <span className="text-gray-300">店舗名未入力</span>}
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <RatingStars rating={4} />
                <span className="text-[10px] text-gray-400" style={{ fontFamily: "'Outfit', sans-serif" }}>4.5</span>
                <span className="text-[9px] text-gray-300">|</span>
                <span className="text-[10px] text-gray-400">32件の口コミ</span>
              </div>

              <div className="flex items-center gap-1.5 mt-1.5">
                <MapPin className="w-3 h-3 text-gray-400" />
                <span className="text-[10px] text-gray-500">
                  {shop.area || shop.station ? `${shop.area}${shop.station ? ` · ${shop.station}` : ""}` : <span className="text-gray-300">エリア未設定</span>}
                </span>
              </div>

              {shop.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {shop.tags.slice(0, 4).map((tag, i) => (
                    <span
                      key={i}
                      className="text-[8px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200/50"
                    >
                      {tag}
                    </span>
                  ))}
                  {shop.tags.length > 4 && (
                    <span className="text-[8px] text-gray-400">+{shop.tags.length - 4}</span>
                  )}
                </div>
              )}
            </div>

            <Divider />

            {/* Quick Stats */}
            <div className="px-4 py-3 flex gap-2">
              <div className="flex-1 bg-gray-50 rounded-xl p-2 text-center">
                <p className="text-[9px] text-gray-400">時給</p>
                <p className="text-[13px] text-[#1b2528] mt-0.5" style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700 }}>
                  {shop.minWage ? `¥${Number(shop.minWage).toLocaleString()}` : "---"}
                </p>
                <p className="text-[8px] text-gray-400">~{shop.maxWage ? `¥${Number(shop.maxWage).toLocaleString()}` : "---"}</p>
              </div>
              <div className="flex-1 bg-gray-50 rounded-xl p-2 text-center">
                <p className="text-[9px] text-gray-400">日給目安</p>
                <p className="text-[11px] text-[#1b2528] mt-0.5" style={{ fontWeight: 600 }}>
                  {shop.dailyPay || <span className="text-gray-300">---</span>}
                </p>
              </div>
              <div className="flex-1 bg-gray-50 rounded-xl p-2 text-center">
                <p className="text-[9px] text-gray-400">体入時給</p>
                <p className="text-[11px] text-[#1b2528] mt-0.5" style={{ fontWeight: 600 }}>
                  {shop.trialWage || <span className="text-gray-300">---</span>}
                </p>
              </div>
            </div>

            {/* Description */}
            {shop.description ? (
              <div>
                <Divider />
                <Section title="About">
                  <p className="text-[11px] text-gray-600 leading-relaxed">
                    {shop.description.length > 120 ? shop.description.slice(0, 120) + "..." : shop.description}
                  </p>
                </Section>
              </div>
            ) : null}

            {/* Analysis */}
            <Divider />
            <Section title="Store Analysis">
              <div className="space-y-2">
                <div>
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-[9px] text-gray-400">初心者向け</span>
                    <span className="text-[9px] text-gray-400">経験者向け</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full transition-all" style={{ width: `${shop.expLevel}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-[9px] text-gray-400">落ち着き</span>
                    <span className="text-[9px] text-gray-400">賑やか</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-pink-400 to-pink-500 rounded-full transition-all" style={{ width: `${shop.atmosphere}%` }} />
                  </div>
                </div>
              </div>
            </Section>

            {/* Back System */}
            {shop.backItems.length > 0 && shop.backItems.some(b => b.label) && (
              <div>
                <Divider />
                <Section title="Back System">
                  <div className="space-y-1">
                    {shop.backItems.filter(b => b.label).map((item, i) => (
                      <div key={i} className="flex items-center justify-between bg-gray-50 rounded-lg px-2.5 py-1.5">
                        <span className="text-[10px] text-gray-600">{item.label}</span>
                        <span className="text-[10px] text-[#1b2528]" style={{ fontWeight: 600 }}>{item.value}</span>
                      </div>
                    ))}
                  </div>
                </Section>
              </div>
            )}

            {/* Guarantee */}
            {(shop.guaranteePeriod || shop.normaInfo) && (
              <div>
                <Divider />
                <Section title="Guarantee">
                  <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-2.5 space-y-1">
                    {shop.guaranteePeriod && (
                      <div className="flex items-center gap-1.5">
                        <Shield className="w-3 h-3 text-emerald-500" />
                        <span className="text-[10px] text-emerald-700">保証期間: {shop.guaranteePeriod}</span>
                      </div>
                    )}
                    {shop.normaInfo && (
                      <p className="text-[10px] text-emerald-700 pl-[18px]">{shop.normaInfo}</p>
                    )}
                  </div>
                </Section>
              </div>
            )}

            {/* Trial */}
            {shop.sameDayTrial && (
              <div>
                <Divider />
                <Section title="Trial">
                  <div className="flex gap-2">
                    <div className="flex-1 bg-violet-50 border border-violet-100 rounded-xl p-2 text-center">
                      <Sparkles className="w-3 h-3 text-violet-500 mx-auto mb-0.5" />
                      <p className="text-[9px] text-violet-600">当日体入</p>
                      <p className="text-[11px] text-violet-800 mt-0.5" style={{ fontWeight: 600 }}>{shop.sameDayTrial}</p>
                    </div>
                    {shop.trialWage && (
                      <div className="flex-1 bg-violet-50 border border-violet-100 rounded-xl p-2 text-center">
                        <Sparkles className="w-3 h-3 text-violet-500 mx-auto mb-0.5" />
                        <p className="text-[9px] text-violet-600">体入時給</p>
                        <p className="text-[11px] text-violet-800 mt-0.5" style={{ fontWeight: 600 }}>{shop.trialWage}</p>
                      </div>
                    )}
                  </div>
                </Section>
              </div>
            )}

            {/* Store Info */}
            <Divider />
            <Section title="Info">
              <div className="space-y-1.5">
                {shop.hours ? (
                  <div className="flex items-center gap-2">
                    <Clock className="w-3 h-3 text-gray-400 shrink-0" />
                    <span className="text-[10px] text-gray-600">{shop.hours}</span>
                  </div>
                ) : null}
                {shop.holiday ? (
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 shrink-0 text-center text-[7px] text-gray-400">休</span>
                    <span className="text-[10px] text-gray-600">{shop.holiday}</span>
                  </div>
                ) : null}
                {shop.address ? (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3 h-3 text-gray-400 shrink-0" />
                    <span className="text-[10px] text-gray-600">{shop.address}</span>
                  </div>
                ) : null}
                {shop.phone ? (
                  <div className="flex items-center gap-2">
                    <Phone className="w-3 h-3 text-gray-400 shrink-0" />
                    <span className="text-[10px] text-gray-600">{shop.phone}</span>
                  </div>
                ) : null}
              </div>
            </Section>

            {/* Staff Comment */}
            {shop.staffComment && (
              <div>
                <Divider />
                <Section title="Staff">
                  <div className="bg-amber-50 border border-amber-100 rounded-xl p-2.5">
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="w-5 h-5 bg-amber-200 rounded-full flex items-center justify-center">
                        <span className="text-[8px] text-amber-800">{shop.staffName?.[0] || "S"}</span>
                      </div>
                      <div>
                        <p className="text-[10px] text-[#1b2528]" style={{ fontWeight: 600 }}>{shop.staffName || "スタッフ"}</p>
                        {shop.staffRole && <p className="text-[8px] text-gray-400">{shop.staffRole}</p>}
                      </div>
                    </div>
                    <p className="text-[10px] text-gray-600 leading-relaxed">
                      {shop.staffComment.length > 80 ? shop.staffComment.slice(0, 80) + "..." : shop.staffComment}
                    </p>
                  </div>
                </Section>
              </div>
            )}

            {/* Q&A */}
            {shop.qaItems.length > 0 && shop.qaItems.some(q => q.label) && (
              <div>
                <Divider />
                <Section title="Q&A">
                  <div className="space-y-1.5">
                    {shop.qaItems.filter(q => q.label).slice(0, 3).map((qa, i) => (
                      <div key={i} className="bg-gray-50 rounded-xl p-2.5">
                        <p className="text-[10px] text-[#1b2528] mb-0.5" style={{ fontWeight: 600 }}>Q. {qa.label}</p>
                        <p className="text-[10px] text-gray-500">A. {qa.value || "---"}</p>
                      </div>
                    ))}
                  </div>
                </Section>
              </div>
            )}

            {/* CTA */}
            <div className="px-4 py-3">
              <div className="bg-gradient-to-r from-amber-500 to-amber-600 rounded-xl p-2.5 text-center shadow-lg shadow-amber-500/20">
                <p className="text-white text-[12px]" style={{ fontWeight: 700 }}>この店舗に応募する</p>
                <p className="text-white/70 text-[8px] mt-0.5">LINEで簡単応募</p>
              </div>
            </div>

            {/* AI Chat teaser */}
            <div className="px-4 pb-3">
              <div className="bg-[#1b2528] rounded-xl p-2.5 flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shrink-0">
                  <span className="text-white text-[8px]" style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700 }}>AI</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-[10px]" style={{ fontWeight: 600 }}>このお店についてAIに聞く</p>
                  <p className="text-white/40 text-[9px]">時給査定・雰囲気・面接の流れ</p>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-white/30 shrink-0" />
              </div>
            </div>

            {/* Home indicator spacer */}
            <div className="h-6 flex items-center justify-center shrink-0">
              <div className="w-[120px] h-[4px] bg-gray-200 rounded-full" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

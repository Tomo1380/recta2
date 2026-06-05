import { useCallback, useMemo, useReducer } from "react";
import type { Store } from "~/lib/types";
import { trialDailyEstimate } from "~/lib/wage";

/**
 * ShopEditPage / ShopCreatePage の店舗フォーム state を集約する hook。
 *
 * Phase 3-2 で ShopEditPage の 88 useState を 1 つの reducer に統合。
 *
 * 提供するもの:
 *   - form: 全 field の現在値 (read-only として扱う)
 *   - setField(key, value): 単一 field 更新
 *   - update(partial): 複数 field を一括更新 (populate の中で使う)
 *   - populate(store): API GET したレスポンスから form を構築
 *   - buildPayload(): API POST/PUT で送る形に変換
 *   - reset(): 新規作成時の初期値に戻す
 *
 * NOTE: 画像 (storeImages) と publish_status の管理だけは別 hook
 * (useShopImages) と ShopEditPage 側に残してあるので、buildPayload に
 * 渡すときに第2引数で受け取る形にした。
 */

type LabelValue = { label: string; value: string };
type LabelValueNote = { label: string; amount: string; note: string };

export type VideoDraft = { video_url: string; label: string; description: string };
export type StaffPhotoDraft = {
  image_url: string;
  caption: string;
  instagram_url: string;
  staff_type: string;
};
/** 施設写真 (トイレ/更衣室/セット場所 等) のドラフト。 */
export type FacilityPhotoDraft = {
  image_url: string;
  caption: string;
};
export type TransferZoneDraft = {
  label: string;
  radius_km: string;
  fee: string;
  color: string;
};
// 画像 (image_url) は運用上不要と判断し、UI から撤去。既存データの
// image_url は読み込み時に捨てる (formToPayload で送らない)。型としては
// 残しても害がないので、note のみのオブジェクトに簡略化。
export type DressExampleDraft = { note: string };
export type ChampagnePriceDraft = { amount: string; note: string };
export type ChampagneKey = "tequila" | "belle_epoque" | "armand" | "lavay";
export type RectaEpisodeDraft = {
  name: string;
  comment: string;
  instagram_url: string;
  photo_url: string;
};
export type HiringEntryDraft = {
  month: string;
  count: string;
};

export interface ShopForm {
  // 基本情報
  shopName: string;
  area: string;
  address: string;
  lat: number | null;
  lng: number | null;
  station: string;
  category: string;
  openingTime: string;
  closingTime: string;
  holiday: string;
  phone: string;
  website: string;

  // 動画・スタッフ写真
  videos: VideoDraft[];
  staffPhotos: StaffPhotoDraft[];
  /** 施設写真 (トイレ/更衣室/セット場所 等) */
  facilityPhotos: FacilityPhotoDraft[];

  // 給与・待遇 (通常時給 minWage/maxWage は廃止。給与は体入時給 trialMinWage/Max に一本化)
  dailyPay: string;
  /** 給料システム (複数選択: 完全時給制 / 時給+バック など) */
  paySystemTypes: string[];
  /** 給料システムの詳細備考 (売上制/ポイント制の具体ロジック等) */
  paySystemNote: string;
  /** バックをフリーテキストで記載 (同伴/本指名/場内など月本数で変わる複雑なものに対応) */
  backText: string;
  backItems: LabelValue[];
  /** 引かれ物 (旧「控除/手数料」) */
  feeItems: LabelValue[];
  salaryNote: string;
  /** 給与サイクル (旧 payrollSystemType を置き換え。月末締め翌月払い 等) */
  payrollCycle: string;
  /** 給料日 (サイクルにより条件表示。締め日・支払日) */
  payrollPayDay: string;
  /** 日払い上限金額 (「日払い可」の代わり) */
  dailyPayLimit: string;
  guaranteePeriod: string;
  guaranteeDetail: string;
  normaInfo: string;
  /** 体入時給（最低額） */
  trialMinWage: string;
  /** 体入時給（最高額） */
  trialMaxWage: string;
  interviewStart: string;
  interviewEnd: string;
  /** 体入タイプ: 'same_day' (体入確約) / 'normal' (体入可能) / 'none' (体入なし)。
      フォーム内ではそのまま日本語ラベルを使わず enum string で持ち、表示時に
      ラベル変換する。 */
  sameDayTrial: "same_day" | "normal" | "none";
  payrollSystemType: string;
  payrollSystemDescription: string;

  // 特徴・分析
  tags: string[];
  description: string;
  featureText: string;
  /** 店舗まとめ (例「六本木ポセイドンまとめ」)。改行＋内部リンク対応のフリーテキスト。 */
  summaryText: string;
  expLevel: number;
  atmosphere: number;
  castBijin: string;
  castKawaii: string;
  castGlamour: string;
  castNatural: string;
  clientAge: LabelValue[];
  drinkStyle: number;

  // 採用・勤務
  dressAdvice: string;
  dressTips: string[];
  dressCode: string;
  hiringCriteria: string;
  interviewDialog: LabelValue[];
  /** 面接で聞かれることリスト (label=質問, value=回答)。Q&Aアコーディオンで表示。 */
  interviewQuestions: LabelValue[];
  documents: string[];
  docNote: string;
  shiftInfo: string;
  hiringEntries: HiringEntryDraft[];
  hiringTotal: string;
  /** 採用例 (セクション単位)。旧来は各月に紐付いていたが月単位の必然性がないため統合。 */
  hiringExamples: string[];

  // その他 (送り、系列、シャンパン、ドレスコード詳細、セット料金、エピソード、Q&A、コメント)
  transferDescription: string;
  transferKm: string;
  transferZones: TransferZoneDraft[];
  relatedStoreIds: number[];
  /** 上京ロゴ/バナーの表示 (D3)。東京・新地・ミナミ等のみ ON にする想定。 */
  showRelocateBadge: boolean;
  champagneDescription: string;
  champagnePrices: Record<ChampagneKey, ChampagnePriceDraft>;
  dressCodeDescription: string;
  dressCodeOk: DressExampleDraft[];
  dressCodeNg: DressExampleDraft[];
  /** ドレス例画像 (OK/NGを廃止し、説明＋画像に簡素化) */
  dressPhotos: FacilityPhotoDraft[];
  setFeeList: LabelValueNote[];
  setFeeNotes: string;
  rectaEpisodes: RectaEpisodeDraft[];
  qaItems: LabelValue[];
  staffName: string;
  staffRole: string;
  staffComment: string;
  supportItems: string[];

  // SEO
  /** 検索結果用 meta description (120〜140 文字推奨)。空なら自動生成。 */
  seoMetaDescription: string;

  /** 表示優先度 (-1000〜1000)。値が大きいほど一覧で上位に。デフォルト 0。
   *  number に寄せず string で持つことで、空入力 = 0 扱いと数値編集中の
   *  「-」「途中数字」を許容する。submit 時に payload で number に変換。 */
  priority: string;
}

/** 必要書類の基本3点。空の店舗ではこれを初期表示する (運営が変更可)。 */
export const DEFAULT_DOCUMENTS = [
  "身分証明書（顔写真付き）",
  "住民票",
  "マイナンバー",
];

const EMPTY_CHAMPAGNE = (): Record<ChampagneKey, ChampagnePriceDraft> => ({
  tequila: { amount: "", note: "" },
  belle_epoque: { amount: "", note: "" },
  armand: { amount: "", note: "" },
  lavay: { amount: "", note: "" },
});

export const INITIAL_FORM: ShopForm = {
  shopName: "", area: "", address: "", lat: null, lng: null, station: "",
  category: "", openingTime: "", closingTime: "", holiday: "", phone: "", website: "",
  videos: [], staffPhotos: [], facilityPhotos: [],
  dailyPay: "",
  paySystemTypes: [], paySystemNote: "",
  backText: "", backItems: [], feeItems: [], salaryNote: "",
  payrollCycle: "", payrollPayDay: "", dailyPayLimit: "",
  guaranteePeriod: "", guaranteeDetail: "", normaInfo: "",
  trialMinWage: "", trialMaxWage: "",
  interviewStart: "", interviewEnd: "", sameDayTrial: "normal",
  payrollSystemType: "", payrollSystemDescription: "",
  tags: [], description: "", featureText: "", summaryText: "",
  expLevel: 50, atmosphere: 50,
  castBijin: "", castKawaii: "", castGlamour: "", castNatural: "",
  clientAge: [], drinkStyle: 50,
  dressAdvice: "", dressTips: [], dressCode: "", hiringCriteria: "",
  interviewDialog: [], interviewQuestions: [],
  documents: [...DEFAULT_DOCUMENTS], docNote: "", shiftInfo: "",
  hiringEntries: [], hiringTotal: "", hiringExamples: [],
  transferDescription: "", transferKm: "", transferZones: [], relatedStoreIds: [],
  showRelocateBadge: false,
  champagneDescription: "", champagnePrices: EMPTY_CHAMPAGNE(),
  dressCodeDescription: "", dressCodeOk: [], dressCodeNg: [], dressPhotos: [],
  setFeeList: [], setFeeNotes: "",
  rectaEpisodes: [], qaItems: [],
  staffName: "", staffRole: "", staffComment: "", supportItems: [],
  seoMetaDescription: "",
  priority: "0",
};

type ShopFormAction =
  | { type: "PATCH"; patch: Partial<ShopForm> }
  | { type: "RESET" };

function reducer(state: ShopForm, action: ShopFormAction): ShopForm {
  switch (action.type) {
    case "PATCH":
      return { ...state, ...action.patch };
    case "RESET":
      return { ...INITIAL_FORM, champagnePrices: EMPTY_CHAMPAGNE() };
    default:
      return state;
  }
}

export interface UseShopFormResult {
  form: ShopForm;
  setField: <K extends keyof ShopForm>(key: K, value: ShopForm[K]) => void;
  update: (patch: Partial<ShopForm>) => void;
  populate: (store: Store) => void;
  buildPayload: (extras: {
    storeImages: string[];
    publishStatus: "published" | "unpublished" | "draft";
  }) => Record<string, unknown>;
  reset: () => void;
}

export function useShopForm(): UseShopFormResult {
  const [form, dispatch] = useReducer(reducer, INITIAL_FORM, (init) => ({
    ...init,
    champagnePrices: EMPTY_CHAMPAGNE(),
  }));

  const setField = useCallback(<K extends keyof ShopForm>(key: K, value: ShopForm[K]) => {
    dispatch({ type: "PATCH", patch: { [key]: value } as Partial<ShopForm> });
  }, []);

  const update = useCallback((patch: Partial<ShopForm>) => {
    dispatch({ type: "PATCH", patch });
  }, []);

  const reset = useCallback(() => {
    dispatch({ type: "RESET" });
  }, []);

  const populate = useCallback((store: Store) => {
    dispatch({ type: "PATCH", patch: storeToForm(store) });
  }, []);

  const buildPayload = useCallback(
    (extras: { storeImages: string[]; publishStatus: "published" | "unpublished" | "draft" }) =>
      formToPayload(form, extras),
    [form],
  );

  return useMemo(
    () => ({ form, setField, update, populate, buildPayload, reset }),
    [form, setField, update, populate, buildPayload, reset],
  );
}

// ─────────────────────────────────────────────────────────────
//  Store -> ShopForm 変換 (旧 populateFromStore のロジックを温存)
// ─────────────────────────────────────────────────────────────

// 旧 populateFromStore は (store as any) で書かれていたため、Store の固い
// 型 (qa[] や interview など) を一旦緩めて受ける必要がある。lib/types.ts の
// Store interface は雑多な API レスポンスに完全には追従しないので、ここでは
// any でキャストして互換性を優先する。Phase 4 で Store 型を Resource 由来に
// 揃えるタイミングで再評価する。
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyStore = any;

const stripUnit = (v: unknown): string =>
  v == null ? "" : String(v).replace(/[^\d]/g, "");

/**
 * 旧データの speaker ("staff" / "user") や、UI が「面接官 / 応募者」を直接
 * 入れる新フォーマットを統一する。表示側 (StoreDetailPage) は staff/user
 * での左右振り分けを期待するので、UI 表示は日本語ラベルで持つが、payload
 * 化時に staff/user に正規化する。
 */
function normalizeSpeaker(v: unknown): string {
  const s = String(v ?? "").trim();
  if (s === "" ) return "";
  if (s === "staff" || s === "面接官" || s === "スタッフ") return "面接官";
  if (s === "user" || s === "応募者" || s === "ユーザー") return "応募者";
  return s;
}

/** UI ラベル (面接官/応募者) → DB の speaker (staff/user) に変換。 */
function speakerToDb(v: string): string {
  if (v === "面接官" || v === "staff" || v === "スタッフ") return "staff";
  if (v === "応募者" || v === "user" || v === "ユーザー") return "user";
  return v;
}

export function storeToForm(rawStore: Store): Partial<ShopForm> {
  // 旧 populateFromStore と互換性を保つため Record<string, any> 扱い。
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const store = rawStore as any;

  const videos: VideoDraft[] =
    store.videos && store.videos.length > 0
      ? store.videos.map((v: AnyStore) => ({
          video_url: v.video_url,
          label: v.label ?? "",
          description: v.description ?? "",
        }))
      : store.video_url
      ? [{ video_url: store.video_url, label: "店舗紹介動画", description: "" }]
      : [];

  const staffPhotos: StaffPhotoDraft[] = (store.staff_photos ?? []).map(
    (p: AnyStore) => ({
      image_url: p.image_url,
      caption: p.caption ?? "",
      instagram_url: p.instagram_url ?? "",
      staff_type: p.staff_type ?? "",
    }),
  );

  const facilityPhotos: FacilityPhotoDraft[] = (store.facility_photos ?? []).map(
    (p: AnyStore) => ({
      image_url: p.image_url ?? "",
      caption: p.caption ?? "",
    }),
  );

  const reqDocs = store.required_documents;
  const documents: string[] =
    reqDocs && !Array.isArray(reqDocs) ? reqDocs.documents ?? [] : (reqDocs as string[]) ?? [];
  const docNote: string =
    reqDocs && !Array.isArray(reqDocs) ? reqDocs.notes ?? "" : "";

  const analysis = store.analysis ?? {};
  const castStyle = analysis.cast_style ?? {};

  const interview = store.interview_info ?? {};
  const staffData = store.staff_comment;
  const staffObj = staffData && typeof staffData === "object" ? staffData : null;
  const staffStr = typeof staffData === "string" ? staffData : "";

  const tz: AnyStore[] = store.transfer_zones ?? [];
  const transferZones: TransferZoneDraft[] = Array.isArray(tz)
    ? tz.map((z) => ({
        label: z?.label ?? "",
        radius_km: z?.radius_km != null ? String(z.radius_km) : "",
        fee: z?.fee != null ? String(z.fee) : "",
        color: z?.color ?? "",
      }))
    : [];

  const rs = store.related_store_ids ?? [];
  const relatedStoreIds: number[] = Array.isArray(rs)
    ? rs.filter((n: unknown) => Number.isFinite(Number(n))).map((n: unknown) => Number(n))
    : [];

  const cp = store.champagne_prices ?? {};
  const champagnePrices: Record<ChampagneKey, ChampagnePriceDraft> = {
    tequila: {
      amount: cp.tequila?.amount != null ? String(cp.tequila.amount) : "",
      note: cp.tequila?.note ?? "",
    },
    belle_epoque: {
      amount: cp.belle_epoque?.amount != null ? String(cp.belle_epoque.amount) : "",
      note: cp.belle_epoque?.note ?? "",
    },
    armand: {
      amount: cp.armand?.amount != null ? String(cp.armand.amount) : "",
      note: cp.armand?.note ?? "",
    },
    lavay: {
      amount: cp.lavay?.amount != null ? String(cp.lavay.amount) : "",
      note: cp.lavay?.note ?? "",
    },
  };

  const dressDetail =
    store.dress_code_detail ??
    (typeof store.dress_code === "object" ? store.dress_code : null);
  const dressCodeDescription: string = dressDetail?.description ?? "";
  // image_url は廃止。既存データに残っていても捨てる (DB 上はキーが
  // 残るが UI / payload に出さなければ次回保存で消える)。
  const dressCodeOk: DressExampleDraft[] = (dressDetail?.ok_examples ?? []).map(
    (e: AnyStore) => ({ note: e?.note ?? "" }),
  );
  const dressCodeNg: DressExampleDraft[] = (dressDetail?.ng_examples ?? []).map(
    (e: AnyStore) => ({ note: e?.note ?? "" }),
  );
  const dressPhotos: FacilityPhotoDraft[] = (dressDetail?.photos ?? []).map(
    (p: AnyStore) => ({ image_url: p?.image_url ?? "", caption: p?.caption ?? "" }),
  );

  const sf = store.set_fee ?? {};
  const setFeeList: LabelValueNote[] = (sf.items ?? []).map((it: AnyStore) => ({
    label: it?.label ?? "",
    amount: it?.amount != null ? String(it.amount) : "",
    note: it?.note ?? "",
  }));
  const setFeeNotes: string = sf.notes ?? "";

  return {
    shopName: store.name ?? "",
    area: store.area ?? "",
    address: store.address ?? "",
    lat:
      typeof store.lat === "number"
        ? store.lat
        : store.lat
        ? Number(store.lat)
        : null,
    lng:
      typeof store.lng === "number"
        ? store.lng
        : store.lng
        ? Number(store.lng)
        : null,
    station: store.nearest_station ?? "",
    category: store.category ?? "",
    openingTime: store.opening_time ?? "",
    closingTime: store.closing_time ?? "",
    holiday: store.holidays ?? "",
    phone: store.phone ?? "",
    website: store.website_url ?? "",
    videos,
    staffPhotos,
    facilityPhotos,
    dailyPay: store.daily_estimate ?? "",
    paySystemTypes: Array.isArray(store.pay_system_types) ? store.pay_system_types : [],
    paySystemNote: store.pay_system_note ?? "",
    // バックはフリーテキストに移行。新フィールド (back_text) が無い既存店舗は
    // 旧 back_items を「名前: 金額」改行テキストへ自動変換して初期表示する
    // (初回保存でフリーテキストに引き継がれ、データを失わない)。
    backText:
      store.back_text ??
      (Array.isArray(store.back_items) && store.back_items.length > 0
        ? store.back_items
            .map((i: AnyStore) =>
              i.amount ? `${i.label}: ${i.amount}` : String(i.label ?? ""),
            )
            .filter(Boolean)
            .join("\n")
        : ""),
    backItems: (store.back_items ?? []).map((i: AnyStore) => ({
      label: i.label,
      value: i.amount,
    })),
    feeItems: (store.fee_items ?? []).map((i: AnyStore) => ({
      label: i.label,
      value: i.amount,
    })),
    salaryNote: store.salary_notes ?? "",
    payrollCycle: store.payroll_cycle ?? store.payroll_system_type ?? "",
    payrollPayDay: store.payroll_pay_day ?? "",
    dailyPayLimit: store.daily_pay_limit ?? "",
    guaranteePeriod: store.guarantee_period ?? "",
    guaranteeDetail: store.guarantee_details ?? "",
    normaInfo: store.norma_info ?? "",
    // 旧データ互換: 旧キー (trial_avg_hourly = 平均 / trial_hourly = 体入) は
    // それぞれ最低/最高にマップする (運営の体感に近い)。新キーがあれば優先。
    trialMinWage: stripUnit(store.trial_hourly_min ?? store.trial_avg_hourly),
    trialMaxWage: stripUnit(store.trial_hourly_max ?? store.trial_hourly),
    interviewStart: store.interview_start ?? "",
    interviewEnd: store.interview_end ?? "",
    // 体入タイプ: Resource は trial_type を返す ('same_day'|'normal'|'none')。
    // 旧フィールド (same_day_trial=boolean) は廃止済みなので参照しない。
    sameDayTrial: (() => {
      const t = (store as AnyStore).trial_type;
      return t === "same_day" || t === "normal" || t === "none" ? t : "none";
    })(),
    tags: store.feature_tags ?? [],
    description: store.description ?? "",
    featureText: store.features_text ?? "",
    summaryText: store.summary_text ?? "",
    expLevel: analysis.experience_level ?? analysis.exp_level ?? 50,
    atmosphere: analysis.atmosphere ?? 50,
    castBijin: (castStyle.beauty ?? analysis.cast_bijin)?.toString() ?? "",
    castKawaii: (castStyle.cute ?? analysis.cast_kawaii)?.toString() ?? "",
    castGlamour: (castStyle.glamour ?? analysis.cast_glamour)?.toString() ?? "",
    castNatural: (castStyle.natural ?? analysis.cast_natural)?.toString() ?? "",
    clientAge: (analysis.customer_age ?? analysis.client_age ?? []).map(
      (c: AnyStore) => ({
        label: c.label,
        value: c.ratio?.toString() ?? c.value ?? "",
      }),
    ),
    drinkStyle: analysis.drinking_style ?? analysis.drink_style ?? 50,
    dressAdvice: interview.dress_advice ?? "",
    dressTips: interview.tips ?? interview.dress_tips ?? [],
    dressCode: interview.dress_code ?? "",
    hiringCriteria: interview.criteria ?? interview.hiring_criteria ?? "",
    interviewDialog: (interview.dialog ?? []).map((d: AnyStore) => ({
      // UI: label=話者 (面接官/応募者), value=セリフ。
      // DB: { speaker, text }。互換のため旧 (label/value 逆向き) も拾う。
      label: normalizeSpeaker(d.speaker ?? d.label ?? ""),
      value: d.text ?? d.value ?? "",
    })),
    // 面接で聞かれることリスト (label=質問, value=回答)
    interviewQuestions: (interview.questions ?? []).map((q: AnyStore) => ({
      label: q.question ?? q.label ?? "",
      value: q.answer ?? q.value ?? "",
    })),
    // 必要書類は空なら基本3点を初期表示 (運営が変更可)。
    documents: documents.length > 0 ? documents : [...DEFAULT_DOCUMENTS],
    docNote,
    shiftInfo:
      (store.shift_info as string | undefined) ??
      ((store.schedule as AnyStore | undefined)?.shift_info as string | undefined) ??
      "",
    hiringEntries: ((store.recent_hires as AnyStore[] | undefined) ?? []).map((h) => ({
      month: h.month ?? "",
      count: h.count?.toString() ?? "",
    })),
    hiringTotal: store.recent_hires_summary ?? "",
    // 採用例はセクション単位。旧データ (各月 recent_hires[].examples) は flatten して移行。
    hiringExamples:
      (store.recent_hire_examples as string[] | undefined) ??
      ((store.recent_hires as AnyStore[] | undefined) ?? []).flatMap(
        (h) => (h.examples as string[] | undefined) ?? [],
      ),
    transferDescription: store.transfer_description ?? "",
    transferKm: store.transfer_km ?? "",
    transferZones,
    relatedStoreIds,
    showRelocateBadge: Boolean((store as AnyStore).show_relocate_badge ?? false),
    payrollSystemType: store.payroll_system_type ?? "",
    payrollSystemDescription: store.payroll_system_description ?? "",
    champagneDescription: store.champagne_description ?? "",
    champagnePrices,
    dressCodeDescription,
    dressCodeOk,
    dressCodeNg,
    dressPhotos,
    setFeeList,
    setFeeNotes,
    rectaEpisodes: (store.recta_episodes ?? []).map((ep: AnyStore) => ({
      name: ep?.name ?? "",
      comment: ep?.comment ?? "",
      instagram_url: ep?.instagram_url ?? "",
      photo_url: ep?.photo_url ?? "",
    })),
    qaItems: ((store.qa as AnyStore[] | undefined) ?? []).map((q) => ({
      label: q.question,
      value: q.answer,
    })),
    staffName: (staffObj as AnyStore | null)?.name ?? "",
    staffRole: (staffObj as AnyStore | null)?.role ?? "",
    staffComment: (staffObj as AnyStore | null)?.comment ?? staffStr,
    supportItems:
      (staffObj as AnyStore | null)?.supports ??
      (staffObj as AnyStore | null)?.support_items ??
      [],
    seoMetaDescription: store.seo_meta_description ?? "",
    priority:
      typeof (store as AnyStore).priority === "number"
        ? String((store as AnyStore).priority)
        : "0",
  };
}

// ─────────────────────────────────────────────────────────────
//  ShopForm -> API payload 変換 (旧 buildPayload のロジックを温存)
// ─────────────────────────────────────────────────────────────

export function formToPayload(
  form: ShopForm,
  extras: { storeImages: string[]; publishStatus: "published" | "unpublished" | "draft" },
): Record<string, unknown> {
  const { storeImages, publishStatus } = extras;

  return {
    name: form.shopName,
    area: form.area,
    address: form.address,
    lat: form.lat,
    lng: form.lng,
    nearest_station: form.station,
    category: form.category,
    business_hours:
      form.openingTime && form.closingTime
        ? `${form.openingTime}〜${form.closingTime}`
        : null,
    opening_time: form.openingTime || null,
    closing_time: form.closingTime || null,
    holidays: form.holiday,
    phone: form.phone,
    website_url: form.website,
    videos: form.videos
      .filter((v) => v.video_url.trim() !== "")
      .map((v) => ({
        video_url: v.video_url.trim(),
        label: v.label.trim() || null,
        description: v.description.trim() || null,
      })),
    staff_photos: form.staffPhotos
      .filter((p) => p.image_url.trim() !== "")
      .map((p) => ({
        image_url: p.image_url.trim(),
        caption: p.caption.trim() || null,
        instagram_url: p.instagram_url.trim() || null,
        staff_type: p.staff_type.trim() || null,
      })),
    facility_photos: form.facilityPhotos
      .filter((p) => p.image_url.trim() !== "")
      .map((p) => ({
        image_url: p.image_url.trim(),
        caption: p.caption.trim() || null,
      })),
    // 通常時給 (hourly_min/max) は廃止したため payload に含めない。
    // 日給目安は手入力を廃止し「体入時給 × 1日4時間」で自動算出する (体入日給)。
    daily_estimate: trialDailyEstimate(form.trialMinWage, form.trialMaxWage),
    back_text: form.backText.trim() || null,
    pay_system_types: form.paySystemTypes,
    pay_system_note: form.paySystemNote.trim() || null,
    back_items: form.backItems
      .filter((i) => i.label)
      .map((i) => ({ label: i.label, amount: i.value })),
    fee_items: form.feeItems
      .filter((i) => i.label)
      .map((i) => ({ label: i.label, amount: i.value })),
    salary_notes: form.salaryNote,
    guarantee_period: form.guaranteePeriod,
    guarantee_details: form.guaranteeDetail,
    norma_info: form.normaInfo,
    trial_hourly_min: form.trialMinWage || null,
    trial_hourly_max: form.trialMaxWage || null,
    interview_hours:
      form.interviewStart && form.interviewEnd
        ? `${form.interviewStart}〜${form.interviewEnd}`
        : null,
    interview_start: form.interviewStart || null,
    interview_end: form.interviewEnd || null,
    // 体入タイプは enum string をそのまま送る (backend は in:same_day,normal,none で
    // 検証)。JSONB guarantee.same_day_trial に保存される。
    same_day_trial: form.sameDayTrial,
    feature_tags: form.tags,
    description: form.description,
    features_text: form.featureText,
    summary_text: form.summaryText.trim() || null,
    required_documents: {
      documents: form.documents.filter(Boolean),
      notes: form.docNote,
    },
    qa: form.qaItems
      .filter((i) => i.label)
      .map((i) => ({ question: i.label, answer: i.value })),
    analysis: {
      experience_level: form.expLevel,
      atmosphere: form.atmosphere,
      cast_style: {
        beauty: Number(form.castBijin) || 0,
        cute: Number(form.castKawaii) || 0,
        glamour: Number(form.castGlamour) || 0,
        natural: Number(form.castNatural) || 0,
      },
      // 固定ラベル(20代/30代/40代/50代以降)のうち割合>0 のものだけ送る
      // (公開ページで0%の空行を出さないため)。
      customer_age: form.clientAge
        .filter((c) => c.label && (Number(c.value) || 0) > 0)
        .map((c) => ({ label: c.label, ratio: Number(c.value) || 0 })),
      drinking_style: form.drinkStyle,
    },
    interview_info: {
      dress_advice: form.dressAdvice,
      tips: form.dressTips.filter(Boolean),
      dress_code: form.dressCode,
      criteria: form.hiringCriteria,
      dialog: form.interviewDialog
        .filter((i) => i.label)
        // UI: label=話者 (面接官/応募者), value=セリフ
        // DB: { speaker: "staff" | "user", text: string }
        .map((i) => ({ text: i.value, speaker: speakerToDb(i.label) })),
      // 面接で聞かれることリスト: { question, answer }。質問が空の行は捨てる。
      questions: form.interviewQuestions
        .filter((q) => q.label.trim())
        .map((q) => ({ question: q.label.trim(), answer: q.value.trim() })),
    },
    schedule: form.shiftInfo ? { shift_info: form.shiftInfo } : null,
    // 直近採用は相対月スロット(1〜5ヶ月前)。人数>0 の月だけ送る。
    recent_hires: form.hiringEntries
      .filter((h) => (Number(h.count) || 0) > 0)
      .map((h) => ({
        month: h.month,
        count: Number(h.count) || 0,
      })),
    recent_hires_summary: form.hiringTotal,
    // 採用例はセクション単位。空文字は除外。
    recent_hire_examples: form.hiringExamples.map((e) => e.trim()).filter(Boolean),
    staff_comment: {
      name: form.staffName,
      role: form.staffRole,
      comment: form.staffComment,
      supports: form.supportItems.filter(Boolean),
    },
    transfer_description: form.transferDescription,
    transfer_km: form.transferKm,
    show_relocate_badge: form.showRelocateBadge,
    transfer_zones: form.transferZones
      .filter((z) => z.label.trim() || z.radius_km.trim() || z.fee.trim())
      .map((z) => ({
        label: z.label.trim() || null,
        radius_km: z.radius_km.trim()
          ? Number(z.radius_km) || z.radius_km.trim()
          : null,
        fee: z.fee.trim()
          ? Number(z.fee.replace(/[^\d.-]/g, "")) || z.fee.trim()
          : null,
        color: z.color.trim() || null,
      })),
    related_store_ids:
      form.relatedStoreIds.length > 0 ? form.relatedStoreIds : null,
    payroll_system_type: form.payrollSystemType || null,
    payroll_system_description: form.payrollSystemDescription,
    payroll_cycle: form.payrollCycle || null,
    payroll_pay_day: form.payrollPayDay.trim() || null,
    daily_pay_limit: form.dailyPayLimit.trim() || null,
    champagne_description: form.champagneDescription,
    champagne_prices: (() => {
      const out: Record<string, { amount: number; note?: string }> = {};
      (Object.keys(form.champagnePrices) as ChampagneKey[]).forEach((k) => {
        const item = form.champagnePrices[k];
        const trimmedAmount = item.amount.trim();
        if (!trimmedAmount && !item.note.trim()) return;
        const num = Number(trimmedAmount.replace(/[^\d.-]/g, ""));
        if (!Number.isFinite(num) && !item.note.trim()) return;
        out[k] = {
          amount: Number.isFinite(num) ? num : 0,
          ...(item.note.trim() ? { note: item.note.trim() } : {}),
        };
      });
      return Object.keys(out).length > 0 ? out : null;
    })(),
    dress_code:
      form.dressCodeDescription.trim() ||
      form.dressPhotos.some((p) => p.image_url.trim()) ||
      form.dressCodeOk.length > 0 ||
      form.dressCodeNg.length > 0
        ? {
            description: form.dressCodeDescription.trim() || undefined,
            // OK/NG例は廃止し「説明＋ドレス例画像」に簡素化。旧データ保持のため
            // ok/ng は送り続けるが、UI/公開からは出さない。
            ok_examples: form.dressCodeOk
              .filter((e) => e.note.trim())
              .map((e) => ({ note: e.note.trim() })),
            ng_examples: form.dressCodeNg
              .filter((e) => e.note.trim())
              .map((e) => ({ note: e.note.trim() })),
            photos: form.dressPhotos
              .filter((p) => p.image_url.trim())
              .map((p) => ({
                image_url: p.image_url.trim(),
                caption: p.caption.trim() || null,
              })),
          }
        : null,
    set_fee:
      form.setFeeList.some((it) => it.label.trim() || it.amount.trim()) ||
      form.setFeeNotes.trim()
        ? {
            items: form.setFeeList
              .filter((it) => it.label.trim() || it.amount.trim())
              .map((it) => {
                const num = Number(it.amount.replace(/[^\d.-]/g, ""));
                return {
                  label: it.label.trim(),
                  amount: Number.isFinite(num) ? num : it.amount.trim(),
                  ...(it.note.trim() ? { note: it.note.trim() } : {}),
                };
              }),
            ...(form.setFeeNotes.trim() ? { notes: form.setFeeNotes.trim() } : {}),
          }
        : null,
    recta_episodes: form.rectaEpisodes
      .filter((ep) => ep.name.trim())
      .map((ep) => ({
        name: ep.name.trim(),
        ...(ep.comment.trim() ? { comment: ep.comment.trim() } : {}),
        ...(ep.instagram_url.trim()
          ? { instagram_url: ep.instagram_url.trim() }
          : {}),
        ...(ep.photo_url.trim() ? { photo_url: ep.photo_url.trim() } : {}),
      })),
    seo_meta_description: form.seoMetaDescription.trim() || null,
    publish_status: publishStatus,
    priority: (() => {
      const v = parseInt(form.priority, 10);
      return Number.isFinite(v) ? v : 0;
    })(),
    // images はサーバ側で別エンドポイント (POST /admin/stores/:id/images) で
    // 管理しているため、buildPayload には含めない。storeImages は extras で
    // 受け取るが、payload に挿入する必要がある場合のみ呼び出し側で merge する。
  };
}

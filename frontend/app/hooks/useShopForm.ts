import { useCallback, useMemo, useReducer } from "react";
import type { Store } from "~/lib/types";

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
  examples: string[];
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

  // 給与・待遇
  minWage: string;
  maxWage: string;
  dailyPay: string;
  backItems: LabelValue[];
  feeItems: LabelValue[];
  salaryNote: string;
  guaranteePeriod: string;
  guaranteeDetail: string;
  normaInfo: string;
  /** 体入時給（最低額） */
  trialMinWage: string;
  /** 体入時給（最高額） */
  trialMaxWage: string;
  interviewStart: string;
  interviewEnd: string;
  /** 体入タイプ: 'same_day' (即日体入) / 'normal' (通常体入) / 'none' (体入なし)。
      フォーム内ではそのまま日本語ラベルを使わず enum string で持ち、表示時に
      ラベル変換する。 */
  sameDayTrial: "same_day" | "normal" | "none";
  payrollSystemType: string;
  payrollSystemDescription: string;

  // 特徴・分析
  tags: string[];
  description: string;
  featureText: string;
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
  documents: string[];
  docNote: string;
  shiftInfo: string;
  hiringEntries: HiringEntryDraft[];
  hiringTotal: string;

  // その他 (送り、系列、シャンパン、ドレスコード詳細、セット料金、エピソード、Q&A、コメント)
  transferDescription: string;
  transferKm: string;
  transferZones: TransferZoneDraft[];
  relatedStoreIds: number[];
  champagneDescription: string;
  champagnePrices: Record<ChampagneKey, ChampagnePriceDraft>;
  dressCodeDescription: string;
  dressCodeOk: DressExampleDraft[];
  dressCodeNg: DressExampleDraft[];
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

const EMPTY_CHAMPAGNE = (): Record<ChampagneKey, ChampagnePriceDraft> => ({
  tequila: { amount: "", note: "" },
  belle_epoque: { amount: "", note: "" },
  armand: { amount: "", note: "" },
  lavay: { amount: "", note: "" },
});

export const INITIAL_FORM: ShopForm = {
  shopName: "", area: "", address: "", lat: null, lng: null, station: "",
  category: "", openingTime: "", closingTime: "", holiday: "", phone: "", website: "",
  videos: [], staffPhotos: [],
  minWage: "", maxWage: "", dailyPay: "",
  backItems: [], feeItems: [], salaryNote: "",
  guaranteePeriod: "", guaranteeDetail: "", normaInfo: "",
  trialMinWage: "", trialMaxWage: "",
  interviewStart: "", interviewEnd: "", sameDayTrial: "normal",
  payrollSystemType: "", payrollSystemDescription: "",
  tags: [], description: "", featureText: "",
  expLevel: 50, atmosphere: 50,
  castBijin: "", castKawaii: "", castGlamour: "", castNatural: "",
  clientAge: [], drinkStyle: 50,
  dressAdvice: "", dressTips: [], dressCode: "", hiringCriteria: "",
  interviewDialog: [], documents: [], docNote: "", shiftInfo: "",
  hiringEntries: [], hiringTotal: "",
  transferDescription: "", transferKm: "", transferZones: [], relatedStoreIds: [],
  champagneDescription: "", champagnePrices: EMPTY_CHAMPAGNE(),
  dressCodeDescription: "", dressCodeOk: [], dressCodeNg: [],
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
    minWage: store.hourly_min?.toString() ?? "",
    maxWage: store.hourly_max?.toString() ?? "",
    dailyPay: store.daily_estimate ?? "",
    backItems: (store.back_items ?? []).map((i: AnyStore) => ({
      label: i.label,
      value: i.amount,
    })),
    feeItems: (store.fee_items ?? []).map((i: AnyStore) => ({
      label: i.label,
      value: i.amount,
    })),
    salaryNote: store.salary_notes ?? "",
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
    documents,
    docNote,
    shiftInfo:
      (store.shift_info as string | undefined) ??
      ((store.schedule as AnyStore | undefined)?.shift_info as string | undefined) ??
      "",
    hiringEntries: ((store.recent_hires as AnyStore[] | undefined) ?? []).map((h) => ({
      month: h.month ?? "",
      count: h.count?.toString() ?? "",
      examples: h.examples ?? [],
    })),
    hiringTotal: store.recent_hires_summary ?? "",
    transferDescription: store.transfer_description ?? "",
    transferKm: store.transfer_km ?? "",
    transferZones,
    relatedStoreIds,
    payrollSystemType: store.payroll_system_type ?? "",
    payrollSystemDescription: store.payroll_system_description ?? "",
    champagneDescription: store.champagne_description ?? "",
    champagnePrices,
    dressCodeDescription,
    dressCodeOk,
    dressCodeNg,
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
    hourly_min: form.minWage ? Number(form.minWage) : null,
    hourly_max: form.maxWage ? Number(form.maxWage) : null,
    daily_estimate: form.dailyPay || null,
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
      customer_age: form.clientAge
        .filter((c) => c.label)
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
    },
    schedule: form.shiftInfo ? { shift_info: form.shiftInfo } : null,
    recent_hires: form.hiringEntries.map((h) => ({
      month: h.month,
      count: Number(h.count) || 0,
      examples: h.examples,
    })),
    recent_hires_summary: form.hiringTotal,
    staff_comment: {
      name: form.staffName,
      role: form.staffRole,
      comment: form.staffComment,
      supports: form.supportItems.filter(Boolean),
    },
    transfer_description: form.transferDescription,
    transfer_km: form.transferKm,
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
      form.dressCodeOk.length > 0 ||
      form.dressCodeNg.length > 0
        ? {
            description: form.dressCodeDescription.trim() || undefined,
            // 画像 (image_url) は廃止。note のみを送る。
            ok_examples: form.dressCodeOk
              .filter((e) => e.note.trim())
              .map((e) => ({ note: e.note.trim() })),
            ng_examples: form.dressCodeNg
              .filter((e) => e.note.trim())
              .map((e) => ({ note: e.note.trim() })),
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

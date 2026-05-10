import { useState, useCallback, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router";
import { api } from "~/lib/api";
import type { Store } from "~/lib/types";
import {
  ArrowLeft,
  ArrowRight,
  Plus,
  X,
  Eye,
  Save,
  Upload,
  Check,
  Copy,
  AlertCircle,
  Building2,
  ImageIcon,
  DollarSign,
  Shield,
  Sparkles,
  BarChart3,
  UserCheck,
  FileText,
  Calendar,
  TrendingUp,
  Star,
  Wine,
  Car,
  HelpCircle,
  MessageSquare,
  ChevronRight,
  Zap,
  CheckCircle2,
  Circle,
  Crown,
  Globe,
  Loader2,
  GripVertical,
} from "lucide-react";
import { ShopPhonePreview } from "./ShopPhonePreview";
import StoreDetailPage from "~/components/user/StoreDetailPage";
import type { StoreDetailResponse } from "~/components/user/StoreDetailPage";
import BottomTabBar from "~/components/user/shared/BottomTabBar";

// --- Step Definitions ---
interface StepConfig {
  id: string;
  title: string;
  subtitle: string;
  icon: any;
  gradient: string;
  sections: { id: string; title: string; icon: any; required?: boolean }[];
}

const steps: StepConfig[] = [
  {
    id: "step1",
    title: "基本情報",
    subtitle: "店舗の基本的な情報",
    icon: Building2,
    gradient: "from-indigo-500 to-violet-500",
    sections: [
      { id: "basic", title: "店舗基本情報", icon: Building2, required: true },
      { id: "images", title: "店舗画像・動画", icon: ImageIcon },
    ],
  },
  {
    id: "step2",
    title: "給与・待遇",
    subtitle: "給与体系と保証情報",
    icon: DollarSign,
    gradient: "from-emerald-500 to-teal-500",
    sections: [
      { id: "salary", title: "給与・待遇", icon: DollarSign, required: true },
      { id: "guarantee", title: "保証・ノルマ", icon: Shield },
      { id: "trial", title: "体入情報", icon: Sparkles },
    ],
  },
  {
    id: "step3",
    title: "特徴・分析",
    subtitle: "お店の魅力を伝える情報",
    icon: Star,
    gradient: "from-amber-500 to-orange-500",
    sections: [
      { id: "features", title: "店舗の特徴", icon: Star },
      { id: "analysis", title: "店舗分析", icon: BarChart3 },
    ],
  },
  {
    id: "step4",
    title: "採用・勤務",
    subtitle: "面接から勤務までの情報",
    icon: UserCheck,
    gradient: "from-sky-500 to-blue-500",
    sections: [
      { id: "interview", title: "面接・採用", icon: UserCheck },
      { id: "documents", title: "必要書類", icon: FileText },
      { id: "schedule", title: "勤務スケジュール", icon: Calendar },
      { id: "hiring", title: "直近の採用実績", icon: TrendingUp },
    ],
  },
  {
    id: "step5",
    title: "その他情報",
    subtitle: "補足情報とQ&A",
    icon: MessageSquare,
    gradient: "from-fuchsia-500 to-purple-500",
    sections: [
      { id: "popular", title: "人気の特徴", icon: Star },
      { id: "champagne", title: "シャンパン情報", icon: Wine },
      { id: "transport", title: "送り・交通サポート", icon: Car },
      { id: "qa", title: "Q&A", icon: HelpCircle },
      { id: "staff", title: "スタッフコメント", icon: MessageSquare },
      { id: "pickup", title: "ピックアップ設定", icon: Crown },
      { id: "publish", title: "公開設定", icon: Globe },
    ],
  },
];

// --- Reusable Components ---
function RequiredBadge() {
  return (
    <span className="text-[10px] ml-1.5 px-1.5 py-0.5 rounded-md bg-red-500/10 text-red-500 align-middle border border-red-500/10">
      必須
    </span>
  );
}

function OptionalBadge() {
  return (
    <span className="text-[10px] ml-1.5 px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground align-middle">
      任意
    </span>
  );
}

function Field({
  label,
  required,
  children,
  hint,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div>
      <label className="block text-sm mb-1.5 text-foreground">
        {label}
        {required ? <RequiredBadge /> : <OptionalBadge />}
      </label>
      {children}
      {hint && (
        <p className="text-[11px] text-muted-foreground mt-1.5">{hint}</p>
      )}
    </div>
  );
}

function TextInput({
  placeholder = "",
  value = "",
  onChange,
  type = "text",
}: any) {
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className="w-full px-3 py-2 rounded-lg border border-border bg-white text-[13px] focus:outline-none focus:ring-2 focus:ring-foreground/10 focus:border-foreground/30 transition-all placeholder:text-muted-foreground/50"
    />
  );
}

function TextArea({
  placeholder = "",
  value = "",
  onChange,
  rows = 3,
}: any) {
  return (
    <textarea
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      rows={rows}
      className="w-full px-3 py-2 rounded-lg border border-border bg-white text-[13px] focus:outline-none focus:ring-2 focus:ring-foreground/10 focus:border-foreground/30 resize-y transition-all placeholder:text-muted-foreground/50"
    />
  );
}

function SelectInput({ options, value, onChange, placeholder }: any) {
  return (
    <select
      value={value}
      onChange={onChange}
      className="w-full px-3 py-2 rounded-lg border border-border bg-white text-[13px] focus:outline-none focus:ring-2 focus:ring-foreground/10 focus:border-foreground/30 appearance-none transition-all"
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((o: string) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

function DynamicPairList({
  items,
  setItems,
  labelPlaceholder = "ラベル",
  valuePlaceholder = "値",
}: {
  items: { label: string; value: string }[];
  setItems: (items: { label: string; value: string }[]) => void;
  labelPlaceholder?: string;
  valuePlaceholder?: string;
}) {
  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="flex gap-2 items-center group">
          <div className="text-muted-foreground/40 text-xs w-5 text-center shrink-0">
            {i + 1}
          </div>
          <input
            value={item.label}
            onChange={(e) => {
              const newItems = [...items];
              newItems[i] = { ...newItems[i], label: e.target.value };
              setItems(newItems);
            }}
            placeholder={labelPlaceholder}
            className="flex-1 px-3.5 py-2.5 rounded-xl border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
          <input
            value={item.value}
            onChange={(e) => {
              const newItems = [...items];
              newItems[i] = { ...newItems[i], value: e.target.value };
              setItems(newItems);
            }}
            placeholder={valuePlaceholder}
            className="flex-1 px-3.5 py-2.5 rounded-xl border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
          <button
            onClick={() => setItems(items.filter((_, idx) => idx !== i))}
            className="p-1.5 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
      <button
        onClick={() => setItems([...items, { label: "", value: "" }])}
        className="flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 transition px-5"
      >
        <Plus className="w-3.5 h-3.5" /> 追加
      </button>
    </div>
  );
}

function DynamicTextList({
  items,
  setItems,
  placeholder = "テキスト",
}: {
  items: string[];
  setItems: (items: string[]) => void;
  placeholder?: string;
}) {
  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="flex gap-2 items-center group">
          <div className="text-muted-foreground/40 text-xs w-5 text-center shrink-0">
            {i + 1}
          </div>
          <input
            value={item}
            onChange={(e) => {
              const newItems = [...items];
              newItems[i] = e.target.value;
              setItems(newItems);
            }}
            placeholder={placeholder}
            className="flex-1 px-3.5 py-2.5 rounded-xl border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
          <button
            onClick={() => setItems(items.filter((_, idx) => idx !== i))}
            className="p-1.5 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
      <button
        onClick={() => setItems([...items, ""])}
        className="flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 transition px-5"
      >
        <Plus className="w-3.5 h-3.5" /> 追加
      </button>
    </div>
  );
}

function SliderField({
  label,
  value,
  onChange,
  leftLabel,
  rightLabel,
  required,
}: any) {
  return (
    <div>
      <label className="block text-sm mb-2 text-foreground">
        {label}
        {required ? <RequiredBadge /> : <OptionalBadge />}
      </label>
      <div className="relative">
        <input
          type="range"
          min={0}
          max={100}
          value={value}
          onChange={onChange}
          className="w-full accent-primary h-2 rounded-full"
        />
        <div className="flex justify-between text-xs text-muted-foreground mt-1.5">
          <span>{leftLabel}</span>
          <span className="text-primary text-xs px-2 py-0.5 bg-primary/5 rounded-md">
            {value}
          </span>
          <span>{rightLabel}</span>
        </div>
      </div>
    </div>
  );
}

function ImageUploadZone({
  onUpload,
  uploading,
  disabled,
}: {
  onUpload: (files: FileList) => void;
  uploading?: boolean;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div
      onClick={() => !disabled && !uploading && inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!disabled && !uploading && e.dataTransfer.files.length > 0) {
          onUpload(e.dataTransfer.files);
        }
      }}
      className={`border-2 border-dashed border-border rounded-xl p-6 text-center hover:border-stone-400 hover:bg-muted/30 transition-all cursor-pointer group ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            onUpload(e.target.files);
            e.target.value = "";
          }
        }}
      />
      <div className="w-12 h-12 bg-muted rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:bg-primary/10 transition">
        {uploading ? (
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
        ) : (
          <Upload className="w-6 h-6 text-muted-foreground group-hover:text-primary transition" />
        )}
      </div>
      <p className="text-sm text-muted-foreground">
        {uploading ? "アップロード中..." : disabled ? "先に店舗を保存してください" : "ドラッグ&ドロップまたはクリックしてアップロード"}
      </p>
      <p className="text-xs text-muted-foreground/60 mt-1.5">
        PNG, JPG, WEBP（最大5MB）
      </p>
    </div>
  );
}

// Legacy wrapper for sections not yet connected to upload (champagne/transport)
function ImageUpload() {
  return (
    <div className="border-2 border-dashed border-border rounded-xl p-6 text-center hover:border-stone-400 hover:bg-muted/30 transition-all cursor-pointer group">
      <div className="w-12 h-12 bg-muted rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:bg-primary/10 transition">
        <Upload className="w-6 h-6 text-muted-foreground group-hover:text-primary transition" />
      </div>
      <p className="text-sm text-muted-foreground">
        ドラッグ&ドロップまたはクリックしてアップロード
      </p>
      <p className="text-xs text-muted-foreground/60 mt-1.5">
        PNG, JPG, WEBP（最大5MB）
      </p>
    </div>
  );
}

function SectionCard({
  title,
  icon: Icon,
  required,
  children,
}: {
  title: string;
  icon: any;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-border rounded-xl overflow-hidden">
      <div className="px-5 py-3 border-b border-border bg-muted/20">
        <div className="flex items-center gap-2.5">
          <Icon className="w-4 h-4 text-muted-foreground" />
          <h4 className="text-[13px]">{title}</h4>
          {required && <RequiredBadge />}
        </div>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

// --- Main Component ---
// ---------------------------------------------------------------------------
// Floating draggable preview panel
// ---------------------------------------------------------------------------

function FloatingPreview({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: window.innerWidth - 420, y: 80 });
  const dragging = useRef(false);
  const offset = useRef({ x: 0, y: 0 });

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      dragging.current = true;
      offset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [pos],
  );

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return;
    setPos({
      x: Math.max(0, Math.min(e.clientX - offset.current.x, window.innerWidth - 400)),
      y: Math.max(0, Math.min(e.clientY - offset.current.y, window.innerHeight - 200)),
    });
  }, []);

  const onPointerUp = useCallback(() => {
    dragging.current = false;
  }, []);

  return (
    <div
      ref={panelRef}
      className="fixed z-50"
      style={{
        left: pos.x,
        top: pos.y,
        filter: "drop-shadow(0 8px 30px rgba(0,0,0,0.25))",
      }}
    >
      {/* Drag handle + close */}
      <div className="flex items-center justify-between mb-1.5">
        <div
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          className="flex items-center gap-1 cursor-grab active:cursor-grabbing select-none rounded-full bg-white/90 backdrop-blur px-2.5 py-1 text-[11px] text-muted-foreground shadow-sm border border-border"
        >
          <GripVertical className="w-3.5 h-3.5" />
          ドラッグで移動
        </div>
        <button
          onClick={onClose}
          className="w-7 h-7 bg-white rounded-full shadow-sm border border-border flex items-center justify-center hover:bg-gray-100 transition"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      {children}
    </div>
  );
}

export function ShopEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  // The /admin/shops/new route renders this component without an :id param,
  // so id will be undefined. Treat both "new" string and missing param as
  // "new shop" mode.
  const isNew = id === "new" || id === undefined;
  const [currentStep, setCurrentStep] = useState(0);
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [showPreview, setShowPreview] = useState(false);

  // --- State ---
  const [shopName, setShopName] = useState("");
  const [area, setArea] = useState("");
  const [address, setAddress] = useState("");
  const [station, setStation] = useState("");
  const [category, setCategory] = useState("");
  const [openingTime, setOpeningTime] = useState("");
  const [closingTime, setClosingTime] = useState("");
  const [holiday, setHoliday] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [minWage, setMinWage] = useState("");
  const [maxWage, setMaxWage] = useState("");
  const [dailyPay, setDailyPay] = useState("");
  const [backItems, setBackItems] = useState<
    { label: string; value: string }[]
  >([]);
  const [feeItems, setFeeItems] = useState<
    { label: string; value: string }[]
  >([]);
  const [salaryNote, setSalaryNote] = useState("");
  const [guaranteePeriod, setGuaranteePeriod] = useState("");
  const [guaranteeDetail, setGuaranteeDetail] = useState("");
  const [normaInfo, setNormaInfo] = useState("");
  const [avgWage, setAvgWage] = useState("");
  const [trialWage, setTrialWage] = useState("");
  const [interviewStart, setInterviewStart] = useState("");
  const [interviewEnd, setInterviewEnd] = useState("");
  const [sameDayTrial, setSameDayTrial] = useState("可");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [description, setDescription] = useState("");
  const [featureText, setFeatureText] = useState("");
  const [expLevel, setExpLevel] = useState(50);
  const [atmosphere, setAtmosphere] = useState(50);
  const [castBijin, setCastBijin] = useState("30");
  const [castKawaii, setCastKawaii] = useState("40");
  const [castGlamour, setCastGlamour] = useState("15");
  const [castNatural, setCastNatural] = useState("15");
  const [expRatio, setExpRatio] = useState(50);
  const [clientAge, setClientAge] = useState<
    { label: string; value: string }[]
  >([
    { label: "20代", value: "20%" },
    { label: "30代", value: "35%" },
    { label: "40代", value: "30%" },
    { label: "50代以上", value: "15%" },
  ]);
  const [drinkStyle, setDrinkStyle] = useState(50);
  const [dressAdvice, setDressAdvice] = useState("");
  const [dressTips, setDressTips] = useState<string[]>([]);
  const [dressCode, setDressCode] = useState("");
  const [hiringCriteria, setHiringCriteria] = useState("");
  const [interviewDialog, setInterviewDialog] = useState<
    { label: string; value: string }[]
  >([]);
  const [documents, setDocuments] = useState<string[]>([]);
  const [docNote, setDocNote] = useState("");
  const [shiftInfo, setShiftInfo] = useState("");
  const [hiringEntries, setHiringEntries] = useState<
    { month: string; count: string; examples: string[] }[]
  >([
    {
      month: "2026年2月",
      count: "12",
      examples: [
        "20歳 未経験 → 時給5,000円スタート",
        "25歳 経験者 → 時給7,000円スタート",
      ],
    },
  ]);
  const [hiringTotal, setHiringTotal] = useState("直近5ヶ月で52名採用");
  const [popularFeatures, setPopularFeatures] = useState<string[]>([]);
  // New schema fields
  const [transferDescription, setTransferDescription] = useState("");
  const [transferKm, setTransferKm] = useState("");
  const [payrollSystemType, setPayrollSystemType] = useState("");
  const [payrollSystemDescription, setPayrollSystemDescription] = useState("");
  const [champagneDescription, setChampagneDescription] = useState("");

  // FB-driven detail-page features (Part B)
  const [champagnePrices, setChampagnePrices] = useState<{
    tequila: { amount: string; note: string };
    belle_epoque: { amount: string; note: string };
    armand: { amount: string; note: string };
    lavay: { amount: string; note: string };
  }>({
    tequila: { amount: "", note: "" },
    belle_epoque: { amount: "", note: "" },
    armand: { amount: "", note: "" },
    lavay: { amount: "", note: "" },
  });
  const [dressCodeDescription, setDressCodeDescription] = useState("");
  const [dressCodeOk, setDressCodeOk] = useState<{ note: string; image_url: string }[]>([]);
  const [dressCodeNg, setDressCodeNg] = useState<{ note: string; image_url: string }[]>([]);
  const [setFeeItems, setSetFeeItems] = useState<
    { label: string; amount: string; note: string }[]
  >([]);
  const [setFeeNotes, setSetFeeNotes] = useState("");
  const [rectaEpisodes, setRectaEpisodes] = useState<
    { name: string; comment: string; instagram_url: string; photo_url: string }[]
  >([]);
  const [qaItems, setQaItems] = useState<{ label: string; value: string }[]>([]);
  const [staffName, setStaffName] = useState("");
  const [staffRole, setStaffRole] = useState("");
  const [staffComment, setStaffComment] = useState("");
  const [supportItems, setSupportItems] = useState<string[]>([]);

  const [publishStatus, setPublishStatus] = useState<"published" | "unpublished" | "draft">("draft");
  const [storeImages, setStoreImages] = useState<string[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [existingShops, setExistingShops] = useState<{id: number; name: string}[]>([]);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const populateFromStore = useCallback((store: Store) => {
    setShopName(store.name || "");
    setArea(store.area || "");
    setAddress(store.address || "");
    setStation(store.nearest_station || "");
    setCategory(store.category || "");
    setOpeningTime(store.opening_time || "");
    setClosingTime(store.closing_time || "");
    setHoliday(store.holidays || "");
    setPhone(store.phone || "");
    setWebsite(store.website_url || "");
    setVideoUrl(store.video_url || "");
    setMinWage(store.hourly_min?.toString() || "");
    setMaxWage(store.hourly_max?.toString() || "");
    setDailyPay(store.daily_estimate || "");
    setBackItems((store.back_items || []).map(i => ({ label: i.label, value: i.amount })));
    setFeeItems((store.fee_items || []).map(i => ({ label: i.label, value: i.amount })));
    setSalaryNote(store.salary_notes || "");
    setGuaranteePeriod(store.guarantee_period || "");
    setGuaranteeDetail(store.guarantee_details || "");
    setNormaInfo(store.norma_info || "");
    setAvgWage(store.trial_avg_hourly || "");
    setTrialWage(store.trial_hourly || "");
    setInterviewStart(store.interview_start || "");
    setInterviewEnd(store.interview_end || "");
    setSameDayTrial(store.same_day_trial ? "可" : "不可");
    setTags(store.feature_tags || []);
    setDescription(store.description || "");
    setFeatureText(store.features_text || "");
    const reqDocs = store.required_documents as any;
    if (reqDocs && !Array.isArray(reqDocs)) {
      setDocuments(reqDocs.documents || []);
      setDocNote(reqDocs.notes || "");
    } else {
      setDocuments(reqDocs || []);
    }
    const popFeat = store.popular_features as any;
    if (popFeat && !Array.isArray(popFeat)) {
      setPopularFeatures(popFeat.features || []);
    } else {
      setPopularFeatures(popFeat || []);
    }
    setQaItems((store.qa || []).map(q => ({ label: q.question, value: q.answer })));

    // Analysis data
    const analysis = store.analysis as any;
    if (analysis) {
      setExpLevel(analysis.experience_level ?? analysis.exp_level ?? 50);
      setAtmosphere(analysis.atmosphere ?? 50);
      const castStyle = analysis.cast_style || {};
      setCastBijin((castStyle.beauty ?? analysis.cast_bijin)?.toString() ?? "30");
      setCastKawaii((castStyle.cute ?? analysis.cast_kawaii)?.toString() ?? "40");
      setCastGlamour((castStyle.glamour ?? analysis.cast_glamour)?.toString() ?? "15");
      setCastNatural((castStyle.natural ?? analysis.cast_natural)?.toString() ?? "15");
      setExpRatio(analysis.experience_ratio ?? analysis.exp_ratio ?? 50);
      setClientAge((analysis.customer_age || analysis.client_age || []).map((c: any) => ({ label: c.label, value: c.ratio?.toString() ?? c.value ?? "" })));
      setDrinkStyle(analysis.drinking_style ?? analysis.drink_style ?? 50);
    }

    // Interview info
    const interview = store.interview_info as any;
    if (interview) {
      setDressAdvice(interview.dress_advice || "");
      setDressTips(interview.tips || interview.dress_tips || []);
      setDressCode(interview.dress_code || "");
      setHiringCriteria(interview.criteria || interview.hiring_criteria || "");
      setInterviewDialog((interview.dialog || []).map((d: any) => ({ label: d.text ?? d.label ?? "", value: d.speaker ?? d.value ?? "" })));
    }

    // shift_info（独立フィールド、scheduleオブジェクトからも互換読み込み）
    setShiftInfo(store.shift_info || (store.schedule as any)?.shift_info || "");

    // Recent hires
    if (store.recent_hires) {
      setHiringEntries((store.recent_hires as any[]).map(h => ({
        month: h.month || "",
        count: h.count?.toString() || "",
        examples: h.examples || [],
      })));
    }

    // Staff comment
    const staffData = store.staff_comment as any;
    if (staffData && typeof staffData === 'object') {
      setStaffName(staffData.name || "");
      setStaffRole(staffData.role || "");
      setStaffComment(staffData.comment || "");
      setSupportItems(staffData.supports || staffData.support_items || []);
    } else if (typeof staffData === 'string') {
      setStaffComment(staffData);
    }

    // New schema fields
    setTransferDescription((store as any).transfer_description || "");
    setTransferKm((store as any).transfer_km || "");
    setPayrollSystemType((store as any).payroll_system_type || "");
    setPayrollSystemDescription((store as any).payroll_system_description || "");
    setChampagneDescription((store as any).champagne_description || "");

    // FB-driven detail features (Part B)
    const cp = (store as any).champagne_prices || {};
    setChampagnePrices({
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
    });

    const dressDetail = (store as any).dress_code_detail
      ?? (typeof (store as any).dress_code === "object" ? (store as any).dress_code : null);
    if (dressDetail && typeof dressDetail === "object") {
      setDressCodeDescription(dressDetail.description ?? "");
      setDressCodeOk(
        (dressDetail.ok_examples ?? []).map((e: any) => ({
          note: e?.note ?? "",
          image_url: e?.image_url ?? "",
        })),
      );
      setDressCodeNg(
        (dressDetail.ng_examples ?? []).map((e: any) => ({
          note: e?.note ?? "",
          image_url: e?.image_url ?? "",
        })),
      );
    } else {
      setDressCodeDescription("");
      setDressCodeOk([]);
      setDressCodeNg([]);
    }

    const sf = (store as any).set_fee || {};
    setSetFeeItems(
      (sf.items ?? []).map((it: any) => ({
        label: it?.label ?? "",
        amount: it?.amount != null ? String(it.amount) : "",
        note: it?.note ?? "",
      })),
    );
    setSetFeeNotes(sf.notes ?? "");

    setRectaEpisodes(
      ((store as any).recta_episodes ?? []).map((ep: any) => ({
        name: ep?.name ?? "",
        comment: ep?.comment ?? "",
        instagram_url: ep?.instagram_url ?? "",
        photo_url: ep?.photo_url ?? "",
      })),
    );

    // Publish status & images
    setPublishStatus(store.publish_status || "draft");
    setStoreImages((store.images || []).map((img: any) => typeof img === 'string' ? img : img.url));
  }, []);

  const [notFound, setNotFound] = useState(false);
  useEffect(() => {
    if (isNew || !id) return;
    setLoading(true);
    setNotFound(false);
    api.get<Store>(`/admin/stores/${id}`)
      .then(populateFromStore)
      .catch((err) => {
        const status = (err as { status?: number })?.status;
        if (status === 404) {
          setNotFound(true);
        } else {
          setSaveError("店舗データの取得に失敗しました");
        }
      })
      .finally(() => setLoading(false));
  }, [id, isNew, populateFromStore]);

  useEffect(() => {
    if (!showCopyModal) return;
    api.get<{data: Store[]}>("/admin/stores?per_page=20").then(res => {
      setExistingShops(res.data.map(s => ({ id: s.id, name: s.name })));
    });
  }, [showCopyModal]);

  const buildPayload = useCallback(() => ({
    name: shopName,
    area,
    address,
    nearest_station: station,
    category,
    business_hours: openingTime && closingTime ? `${openingTime}〜${closingTime}` : null,
    opening_time: openingTime || null,
    closing_time: closingTime || null,
    holidays: holiday,
    shift_info: shiftInfo || null,
    phone,
    website_url: website,
    video_url: videoUrl,
    hourly_min: minWage ? Number(minWage) : null,
    hourly_max: maxWage ? Number(maxWage) : null,
    daily_estimate: dailyPay,
    back_items: backItems.filter(i => i.label).map(i => ({ label: i.label, amount: i.value })),
    fee_items: feeItems.filter(i => i.label).map(i => ({ label: i.label, amount: i.value })),
    salary_notes: salaryNote,
    guarantee_period: guaranteePeriod,
    guarantee_details: guaranteeDetail,
    norma_info: normaInfo,
    trial_avg_hourly: avgWage,
    trial_hourly: trialWage,
    interview_hours: interviewStart && interviewEnd ? `${interviewStart}〜${interviewEnd}` : null,
    interview_start: interviewStart || null,
    interview_end: interviewEnd || null,
    same_day_trial: sameDayTrial === "可",
    feature_tags: tags,
    description,
    features_text: featureText,
    required_documents: { documents: documents.filter(Boolean), notes: docNote },
    popular_features: { features: popularFeatures.filter(Boolean) },
    qa: qaItems.filter(i => i.label).map(i => ({ question: i.label, answer: i.value })),
    analysis: {
      experience_level: expLevel,
      atmosphere,
      cast_style: {
        beauty: Number(castBijin),
        cute: Number(castKawaii),
        glamour: Number(castGlamour),
        natural: Number(castNatural),
      },
      experience_ratio: expRatio,
      customer_age: clientAge.filter(c => c.label).map(c => ({ label: c.label, ratio: Number(c.value) || 0 })),
      drinking_style: drinkStyle,
    },
    interview_info: {
      dress_advice: dressAdvice,
      tips: dressTips.filter(Boolean),
      dress_code: dressCode,
      criteria: hiringCriteria,
      dialog: interviewDialog.filter(i => i.label).map(i => ({ text: i.label, speaker: i.value })),
    },
    schedule: shiftInfo ? { shift_info: shiftInfo } : null,
    recent_hires: hiringEntries.map(h => ({
      month: h.month,
      count: Number(h.count) || 0,
      examples: h.examples,
    })),
    recent_hires_summary: hiringTotal,
    staff_comment: {
      name: staffName,
      role: staffRole,
      comment: staffComment,
      supports: supportItems.filter(Boolean),
    },
    transfer_description: transferDescription,
    transfer_km: transferKm,
    payroll_system_type: payrollSystemType || null,
    payroll_system_description: payrollSystemDescription,
    champagne_description: champagneDescription,
    // Part B: FB-driven detail-page features
    champagne_prices: (() => {
      const out: Record<string, { amount: number; note?: string }> = {};
      (Object.keys(champagnePrices) as Array<keyof typeof champagnePrices>).forEach((k) => {
        const item = champagnePrices[k];
        const trimmedAmount = item.amount.trim();
        if (!trimmedAmount && !item.note.trim()) return;
        const num = Number(trimmedAmount.replace(/[^\d.-]/g, ""));
        if (!Number.isFinite(num) && !item.note.trim()) return;
        out[k as string] = {
          amount: Number.isFinite(num) ? num : 0,
          ...(item.note.trim() ? { note: item.note.trim() } : {}),
        };
      });
      return Object.keys(out).length > 0 ? out : null;
    })(),
    dress_code: (dressCodeDescription.trim() || dressCodeOk.length > 0 || dressCodeNg.length > 0)
      ? {
          description: dressCodeDescription.trim() || undefined,
          ok_examples: dressCodeOk
            .filter((e) => e.note.trim() || e.image_url.trim())
            .map((e) => ({
              note: e.note.trim() || undefined,
              image_url: e.image_url.trim() || undefined,
            })),
          ng_examples: dressCodeNg
            .filter((e) => e.note.trim() || e.image_url.trim())
            .map((e) => ({
              note: e.note.trim() || undefined,
              image_url: e.image_url.trim() || undefined,
            })),
        }
      : null,
    set_fee: (setFeeItems.some((it) => it.label.trim() || it.amount.trim()) || setFeeNotes.trim())
      ? {
          items: setFeeItems
            .filter((it) => it.label.trim() || it.amount.trim())
            .map((it) => {
              const num = Number(it.amount.replace(/[^\d.-]/g, ""));
              return {
                label: it.label.trim(),
                amount: Number.isFinite(num) ? num : it.amount.trim(),
                ...(it.note.trim() ? { note: it.note.trim() } : {}),
              };
            }),
          ...(setFeeNotes.trim() ? { notes: setFeeNotes.trim() } : {}),
        }
      : null,
    recta_episodes: rectaEpisodes
      .filter((ep) => ep.name.trim())
      .map((ep) => ({
        name: ep.name.trim(),
        ...(ep.comment.trim() ? { comment: ep.comment.trim() } : {}),
        ...(ep.instagram_url.trim() ? { instagram_url: ep.instagram_url.trim() } : {}),
        ...(ep.photo_url.trim() ? { photo_url: ep.photo_url.trim() } : {}),
      })),
    publish_status: publishStatus,
  }), [shopName, area, address, station, category, openingTime, closingTime, holiday, shiftInfo, phone, website, videoUrl, minWage, maxWage, dailyPay, backItems, feeItems, salaryNote, guaranteePeriod, guaranteeDetail, normaInfo, avgWage, trialWage, interviewStart, interviewEnd, sameDayTrial, tags, description, featureText, documents, docNote, popularFeatures, qaItems, expLevel, atmosphere, castBijin, castKawaii, castGlamour, castNatural, expRatio, clientAge, drinkStyle, dressAdvice, dressTips, dressCode, hiringCriteria, interviewDialog, hiringEntries, hiringTotal, staffName, staffRole, staffComment, supportItems, transferDescription, transferKm, payrollSystemType, payrollSystemDescription, champagneDescription, champagnePrices, dressCodeDescription, dressCodeOk, dressCodeNg, setFeeItems, setFeeNotes, rectaEpisodes, publishStatus]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    try {
      const payload = buildPayload();
      if (isNew) {
        const created = await api.post<Store>("/admin/stores", payload);
        setSaveSuccess(true);
        setTimeout(() => navigate(`/admin/shops/${created.id}/edit`, { replace: true }), 1000);
      } else {
        await api.put(`/admin/stores/${id}`, payload);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2500);
      }
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "保存に失敗しました");
    } finally {
      setSaving(false);
    }
  }, [isNew, id, buildPayload, navigate]);

  const handleImageUpload = useCallback(async (files: FileList) => {
    if (isNew || !id) {
      setSaveError("画像をアップロードするには、まず店舗を保存してください。");
      return;
    }
    setUploadingImage(true);
    setSaveError(null);
    try {
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append("image", file);
        const res = await api.upload<{ url: string; images: string[] }>(
          `/admin/stores/${id}/images`,
          formData,
        );
        setStoreImages(res.images);
      }
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "画像のアップロードに失敗しました");
    } finally {
      setUploadingImage(false);
    }
  }, [id, isNew]);

  const handleImageDelete = useCallback(async (index: number) => {
    if (!id) return;
    try {
      const res = await api.delete<{ images: string[] }>(
        `/admin/stores/${id}/images/${index}`,
      );
      setStoreImages(res.images);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "画像の削除に失敗しました");
    }
  }, [id]);

  const handleNext = useCallback(() => {
    setCompletedSteps((prev) => new Set([...prev, currentStep]));
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [currentStep]);

  const handlePrev = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [currentStep]);

  const handleStepClick = useCallback((index: number) => {
    setCurrentStep(index);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const progress = Math.round(
    ((completedSteps.size + (currentStep > 0 ? 0 : 0)) / steps.length) * 100
  );

  // --- Step Content Renderers ---
  const renderStep1 = () => (
    <div className="space-y-6">
      <SectionCard title="店舗基本情報" icon={Building2} required>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="md:col-span-2">
            <Field label="店舗名" required>
              <TextInput
                value={shopName}
                onChange={(e: any) => setShopName(e.target.value)}
                placeholder="例: CLUB LUNA"
              />
            </Field>
          </div>
          <Field label="エリア" required>
            <SelectInput
              value={area}
              onChange={(e: any) => setArea(e.target.value)}
              placeholder="エリアを選択"
              options={[
                "新宿・歌舞伎町",
                "銀座",
                "六本木",
                "渋谷",
                "池袋",
                "上野",
                "横浜",
              ]}
            />
          </Field>
          <Field label="最寄り駅" required>
            <TextInput
              value={station}
              onChange={(e: any) => setStation(e.target.value)}
              placeholder="例: 新宿駅"
            />
          </Field>
          <div className="md:col-span-2">
            <Field label="住所" required>
              <TextInput
                value={address}
                onChange={(e: any) => setAddress(e.target.value)}
                placeholder="例: 東京都新宿区歌舞伎町1-1-1"
              />
            </Field>
          </div>
          <Field label="業種カテゴリ" required>
            <SelectInput
              value={category}
              onChange={(e: any) => setCategory(e.target.value)}
              placeholder="業種を選択"
              options={[
                "キャバクラ",
                "ラウンジ",
                "クラブ",
                "ガールズバー",
                "コンカフェ",
                "スナック",
              ]}
            />
          </Field>
          <Field label="営業時間（開始）">
            <TextInput
              value={openingTime}
              onChange={(e: any) => setOpeningTime(e.target.value)}
              placeholder="例: 20:00"
            />
          </Field>
          <Field label="営業時間（終了）">
            <TextInput
              value={closingTime}
              onChange={(e: any) => setClosingTime(e.target.value)}
              placeholder="例: 1:00 / LAST"
            />
          </Field>
          <Field label="定休日">
            <TextInput
              value={holiday}
              onChange={(e: any) => setHoliday(e.target.value)}
              placeholder="例: 日曜日"
            />
          </Field>
          <Field label="電話番号">
            <TextInput
              value={phone}
              onChange={(e: any) => setPhone(e.target.value)}
              placeholder="例: 03-0000-0000"
            />
          </Field>
          <div className="md:col-span-2">
            <Field label="公式サイトURL">
              <TextInput
                value={website}
                onChange={(e: any) => setWebsite(e.target.value)}
                placeholder="https://"
              />
            </Field>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="店舗画像・動画" icon={ImageIcon}>
        <div className="space-y-5">
          <Field
            label="店舗画像"
            hint={isNew ? "店舗を保存した後に画像をアップロードできます。" : "最大10枚まで。1枚目がサムネイルになります。"}
          >
            {storeImages.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                {storeImages.map((url, idx) => (
                  <div key={idx} className="relative group rounded-lg overflow-hidden border border-border bg-muted aspect-square">
                    <img src={url} alt={`店舗画像 ${idx + 1}`} className="w-full h-full object-cover" />
                    {idx === 0 && (
                      <span className="absolute top-1.5 left-1.5 text-[10px] px-1.5 py-0.5 rounded bg-primary text-white">
                        サムネイル
                      </span>
                    )}
                    <button
                      onClick={() => handleImageDelete(idx)}
                      className="absolute top-1.5 right-1.5 w-6 h-6 bg-black/60 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <ImageUploadZone
              onUpload={handleImageUpload}
              uploading={uploadingImage}
              disabled={isNew}
            />
          </Field>
          <Field label="動画URL">
            <TextInput
              value={videoUrl}
              onChange={(e: any) => setVideoUrl(e.target.value)}
              placeholder="例: https://youtube.com/..."
            />
          </Field>
        </div>
      </SectionCard>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <SectionCard title="給与・待遇" icon={DollarSign} required>
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <Field label="時給の最低額（円）" required>
              <TextInput
                type="number"
                value={minWage}
                onChange={(e: any) => setMinWage(e.target.value)}
                placeholder="4000"
              />
            </Field>
            <Field label="時給の最高額（円）" required>
              <TextInput
                type="number"
                value={maxWage}
                onChange={(e: any) => setMaxWage(e.target.value)}
                placeholder="8000"
              />
            </Field>
            <Field label="日給目安">
              <TextInput
                value={dailyPay}
                onChange={(e: any) => setDailyPay(e.target.value)}
                placeholder="30,000円〜60,000円"
              />
            </Field>
          </div>
          <Field
            label="バック項目"
            hint="指名バック・同伴バックなど、項目名と金額を入力してください"
          >
            <DynamicPairList
              items={backItems}
              setItems={setBackItems}
              labelPlaceholder="バック名"
              valuePlaceholder="金額"
            />
          </Field>
          <Field
            label="手数料項目"
            hint="雑費・送り代など、控除される項目を入力してください"
          >
            <DynamicPairList
              items={feeItems}
              setItems={setFeeItems}
              labelPlaceholder="手数料名"
              valuePlaceholder="金額"
            />
          </Field>
          <Field label="給与補足">
            <TextArea
              value={salaryNote}
              onChange={(e: any) => setSalaryNote(e.target.value)}
              placeholder="その他、給与に関する補足情報があれば入力してください"
            />
          </Field>
          <Field label="給与支払い方法">
            <SelectInput
              value={payrollSystemType}
              onChange={(e: any) => setPayrollSystemType(e.target.value)}
              options={["全額日払い", "日払い可", "月2回", "月末締め翌月払い"]}
              placeholder="選択してください"
            />
          </Field>
          <Field label="給与支払い補足">
            <TextArea
              value={payrollSystemDescription}
              onChange={(e: any) => setPayrollSystemDescription(e.target.value)}
              placeholder="給与支払いに関する補足（例: 日払い上限5万円まで等）"
              rows={2}
            />
          </Field>
        </div>
      </SectionCard>

      <SectionCard title="保証・ノルマ" icon={Shield}>
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Field label="保証期間">
              <TextInput
                value={guaranteePeriod}
                onChange={(e: any) =>
                  setGuaranteePeriod(e.target.value)
                }
                placeholder="例: 3ヶ月"
              />
            </Field>
          </div>
          <Field label="保証詳細">
            <TextArea
              value={guaranteeDetail}
              onChange={(e: any) =>
                setGuaranteeDetail(e.target.value)
              }
              placeholder="保証の具体的な内容を入力してください"
            />
          </Field>
          <Field label="ノルマ情報">
            <TextArea
              value={normaInfo}
              onChange={(e: any) => setNormaInfo(e.target.value)}
              placeholder="ノルマの有無や内容を入力してください"
            />
          </Field>
        </div>
      </SectionCard>

      <SectionCard title="体入（体験入店）情報" icon={Sparkles}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Field label="平均時給">
            <TextInput
              value={avgWage}
              onChange={(e: any) => setAvgWage(e.target.value)}
              placeholder="例: 5,000円"
            />
          </Field>
          <Field label="体入時給">
            <TextInput
              value={trialWage}
              onChange={(e: any) => setTrialWage(e.target.value)}
              placeholder="例: 4,500円"
            />
          </Field>
          <Field label="面接可能時間（開始）">
            <TextInput
              value={interviewStart}
              onChange={(e: any) => setInterviewStart(e.target.value)}
              placeholder="例: 14:00"
            />
          </Field>
          <Field label="面接可能時間（終了）">
            <TextInput
              value={interviewEnd}
              onChange={(e: any) => setInterviewEnd(e.target.value)}
              placeholder="例: 19:00"
            />
          </Field>
          <Field label="当日体入可否">
            <SelectInput
              value={sameDayTrial}
              onChange={(e: any) =>
                setSameDayTrial(e.target.value)
              }
              options={["可", "不可"]}
            />
          </Field>
        </div>
      </SectionCard>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <SectionCard title="店舗の特徴" icon={Star}>
        <div className="space-y-5">
          <Field
            label="特徴タグ"
            hint="Enterキーでタグを追加できます"
          >
            <div className="flex flex-wrap gap-2 mb-3">
              {tags.map((tag, i) => (
                <span
                  key={i}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/8 text-primary rounded-full text-sm border border-primary/15"
                >
                  {tag}
                  <button
                    onClick={() =>
                      setTags(tags.filter((_, idx) => idx !== i))
                    }
                    className="hover:text-destructive transition"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
            <input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && tagInput.trim()) {
                  e.preventDefault();
                  setTags([...tags, tagInput.trim()]);
                  setTagInput("");
                }
              }}
              placeholder="タグを入力してEnter（例: 未経験歓迎）"
              className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </Field>
          <Field label="店舗紹介文">
            <TextArea
              value={description}
              onChange={(e: any) => setDescription(e.target.value)}
              rows={4}
              placeholder="お店の雰囲気や魅力を伝える紹介文を入力してください"
            />
          </Field>
          <Field label="お店の特徴テキスト">
            <TextArea
              value={featureText}
              onChange={(e: any) => setFeatureText(e.target.value)}
              rows={3}
              placeholder="他店との差別化ポイントや特徴を入力してください"
            />
          </Field>
        </div>
      </SectionCard>

      <SectionCard title="店舗分析" icon={BarChart3}>
        <div className="space-y-6">
          <SliderField
            label="経験レベル"
            value={expLevel}
            onChange={(e: any) => setExpLevel(Number(e.target.value))}
            leftLabel="初心者向け"
            rightLabel="経験者向け"
          />
          <SliderField
            label="雰囲気"
            value={atmosphere}
            onChange={(e: any) =>
              setAtmosphere(Number(e.target.value))
            }
            leftLabel="落ち着き"
            rightLabel="賑やか"
          />
          <div>
            <label className="block text-sm mb-3 text-foreground">
              キャストスタイル
              <OptionalBadge />
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Field label="美人系">
                <TextInput
                  type="number"
                  value={castBijin}
                  onChange={(e: any) => setCastBijin(e.target.value)}
                />
              </Field>
              <Field label="かわいい系">
                <TextInput
                  type="number"
                  value={castKawaii}
                  onChange={(e: any) =>
                    setCastKawaii(e.target.value)
                  }
                />
              </Field>
              <Field label="グラマー系">
                <TextInput
                  type="number"
                  value={castGlamour}
                  onChange={(e: any) =>
                    setCastGlamour(e.target.value)
                  }
                />
              </Field>
              <Field label="ナチュラル系">
                <TextInput
                  type="number"
                  value={castNatural}
                  onChange={(e: any) =>
                    setCastNatural(e.target.value)
                  }
                />
              </Field>
            </div>
          </div>
          <SliderField
            label="経験者:未経験者 比率"
            value={expRatio}
            onChange={(e: any) =>
              setExpRatio(Number(e.target.value))
            }
            leftLabel="未経験者多め"
            rightLabel="経験者多め"
          />
          <Field label="客層年齢分布">
            <DynamicPairList
              items={clientAge}
              setItems={setClientAge}
              labelPlaceholder="年齢層"
              valuePlaceholder="割合"
            />
          </Field>
          <SliderField
            label="客層の飲み方"
            value={drinkStyle}
            onChange={(e: any) =>
              setDrinkStyle(Number(e.target.value))
            }
            leftLabel="落ち着き"
            rightLabel="盛り上がり"
          />
        </div>
      </SectionCard>

    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-6">
      <SectionCard title="面接・採用" icon={UserCheck}>
        <div className="space-y-5">
          <Field label="面接時の服装アドバイス">
            <TextArea
              value={dressAdvice}
              onChange={(e: any) => setDressAdvice(e.target.value)}
              placeholder="面接時のおすすめの服装について入力してください"
            />
          </Field>
          <Field label="服装Tips">
            <DynamicTextList
              items={dressTips}
              setItems={setDressTips}
              placeholder="例: ワンピースがおすすめ"
            />
          </Field>
          <Field label="ドレスコード">
            <TextInput
              value={dressCode}
              onChange={(e: any) => setDressCode(e.target.value)}
              placeholder="例: フリー / ドレス貸し出しあり"
            />
          </Field>
          <Field label="採用基準">
            <TextArea
              value={hiringCriteria}
              onChange={(e: any) =>
                setHiringCriteria(e.target.value)
              }
              placeholder="採用時に重視するポイントを入力してください"
            />
          </Field>
          <Field
            label="面接サポート対話"
            hint="面接の流れを会話形式で入力してください"
          >
            <DynamicPairList
              items={interviewDialog}
              setItems={setInterviewDialog}
              labelPlaceholder="話者（スタッフ/ユーザー）"
              valuePlaceholder="テキスト"
            />
          </Field>
        </div>
      </SectionCard>

      <SectionCard title="必要書類" icon={FileText}>
        <div className="space-y-5">
          <Field
            label="書類リスト"
            hint="面接・入店時に必要な書類を登録してください"
          >
            <DynamicTextList
              items={documents}
              setItems={setDocuments}
              placeholder="例: 身分証明書（顔写真付き）"
            />
          </Field>
          <Field label="補足メモ">
            <TextArea
              value={docNote}
              onChange={(e: any) => setDocNote(e.target.value)}
              placeholder="書類に関する補足情報があれば入力してください"
            />
          </Field>
        </div>
      </SectionCard>

      <SectionCard title="勤務スケジュール" icon={Calendar}>
        <div className="space-y-5">
          <p className="text-xs text-muted-foreground">営業時間・定休日はStep1「基本情報」で設定してください。</p>
          <Field label="シフト情報">
            <TextArea
              value={shiftInfo}
              onChange={(e: any) => setShiftInfo(e.target.value)}
              placeholder="例: 週2日〜OK。シフト自由制。前日までに連絡いただければ変更可能。"
            />
          </Field>
        </div>
      </SectionCard>

      <SectionCard title="直近の採用実績" icon={TrendingUp}>
        <div className="space-y-5">
          {hiringEntries.map((entry, i) => (
            <div
              key={i}
              className="border border-border rounded-xl p-5 space-y-4 bg-muted/20"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm text-foreground px-2.5 py-1 bg-primary/5 text-primary rounded-lg">
                  {entry.month}
                </span>
                <button
                  onClick={() =>
                    setHiringEntries(
                      hiringEntries.filter((_, idx) => idx !== i)
                    )
                  }
                  className="text-muted-foreground hover:text-destructive transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <Field label="採用人数">
                <TextInput
                  type="number"
                  value={entry.count}
                  onChange={(e: any) => {
                    const updated = [...hiringEntries];
                    updated[i] = {
                      ...updated[i],
                      count: e.target.value,
                    };
                    setHiringEntries(updated);
                  }}
                  placeholder="人数を入力"
                />
              </Field>
              <Field label="採用例">
                <DynamicTextList
                  items={entry.examples}
                  setItems={(newExamples) => {
                    const updated = [...hiringEntries];
                    updated[i] = {
                      ...updated[i],
                      examples: newExamples,
                    };
                    setHiringEntries(updated);
                  }}
                  placeholder="例: 20歳 未経験 → 時給5,000円スタート"
                />
              </Field>
            </div>
          ))}
          <button
            onClick={() =>
              setHiringEntries([
                ...hiringEntries,
                { month: "2026年3月", count: "", examples: [] },
              ])
            }
            className="flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 transition"
          >
            <Plus className="w-3.5 h-3.5" /> 月を追加
          </button>
          <Field label="直近の合計テキスト">
            <TextInput
              value={hiringTotal}
              onChange={(e: any) =>
                setHiringTotal(e.target.value)
              }
              placeholder="例: 直近5ヶ月で52名採用"
            />
          </Field>
        </div>
      </SectionCard>
    </div>
  );

  const renderStep5 = () => (
    <div className="space-y-6">
      <SectionCard title="ドレスコード（OK / NG）" icon={Star}>
        <div className="space-y-5">
          <Field label="ドレスコード説明" hint="お店で働く際の服装ルール全体を記載してください">
            <TextArea
              value={dressCodeDescription}
              onChange={(e: any) => setDressCodeDescription(e.target.value)}
              rows={3}
              placeholder="例: ミニドレス着用必須 / 貸し出しドレスあり / 黒ドレス NG"
            />
          </Field>
          <Field label="OKな例" hint="OKな服装の説明文（任意で画像URL）を登録できます">
            <div className="space-y-2">
              {dressCodeOk.map((item, i) => (
                <div key={i} className="flex gap-2 items-start group">
                  <div className="text-muted-foreground/40 text-xs w-5 text-center shrink-0 pt-3">
                    {i + 1}
                  </div>
                  <div className="flex-1 space-y-2">
                    <input
                      value={item.note}
                      onChange={(e) => {
                        const next = [...dressCodeOk];
                        next[i] = { ...next[i], note: e.target.value };
                        setDressCodeOk(next);
                      }}
                      placeholder="例: 明るめのカラードレス"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    />
                    <input
                      value={item.image_url}
                      onChange={(e) => {
                        const next = [...dressCodeOk];
                        next[i] = { ...next[i], image_url: e.target.value };
                        setDressCodeOk(next);
                      }}
                      placeholder="画像URL（任意）"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    />
                  </div>
                  <button
                    onClick={() => setDressCodeOk(dressCodeOk.filter((_, idx) => idx !== i))}
                    className="p-1.5 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition mt-2"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <button
                onClick={() => setDressCodeOk([...dressCodeOk, { note: "", image_url: "" }])}
                className="flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 transition px-5"
              >
                <Plus className="w-3.5 h-3.5" /> OK例を追加
              </button>
            </div>
          </Field>
          <Field label="NGな例" hint="NGな服装の説明文（任意で画像URL）を登録できます">
            <div className="space-y-2">
              {dressCodeNg.map((item, i) => (
                <div key={i} className="flex gap-2 items-start group">
                  <div className="text-muted-foreground/40 text-xs w-5 text-center shrink-0 pt-3">
                    {i + 1}
                  </div>
                  <div className="flex-1 space-y-2">
                    <input
                      value={item.note}
                      onChange={(e) => {
                        const next = [...dressCodeNg];
                        next[i] = { ...next[i], note: e.target.value };
                        setDressCodeNg(next);
                      }}
                      placeholder="例: 黒ドレス・ビジュー付き"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    />
                    <input
                      value={item.image_url}
                      onChange={(e) => {
                        const next = [...dressCodeNg];
                        next[i] = { ...next[i], image_url: e.target.value };
                        setDressCodeNg(next);
                      }}
                      placeholder="画像URL（任意）"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    />
                  </div>
                  <button
                    onClick={() => setDressCodeNg(dressCodeNg.filter((_, idx) => idx !== i))}
                    className="p-1.5 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition mt-2"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <button
                onClick={() => setDressCodeNg([...dressCodeNg, { note: "", image_url: "" }])}
                className="flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 transition px-5"
              >
                <Plus className="w-3.5 h-3.5" /> NG例を追加
              </button>
            </div>
          </Field>
        </div>
      </SectionCard>

      <SectionCard title="人気の特徴" icon={Star}>
        <div className="space-y-5">
          <Field label="特徴リスト">
            <DynamicTextList
              items={popularFeatures}
              setItems={setPopularFeatures}
              placeholder="特徴を入力"
            />
          </Field>
        </div>
      </SectionCard>

      <SectionCard title="シャンパン情報" icon={Wine}>
        <div className="space-y-5">
          <Field
            label="シャンパン説明"
            hint="シャンパンメニューや注文ルールなどを記載してください"
          >
            <TextArea
              value={champagneDescription}
              onChange={(e: any) => setChampagneDescription(e.target.value)}
              rows={4}
              placeholder="例: ドンペリ 50,000円〜 / モエシャン 30,000円〜 など"
            />
          </Field>
        </div>
      </SectionCard>

      <SectionCard title="シャンパン金額（4銘柄）" icon={Wine}>
        <p className="text-xs text-muted-foreground mb-4">
          新地・六本木の高級店向け。空欄でも構いません。
        </p>
        <div className="space-y-3">
          {([
            { key: "tequila", label: "テキーラ" },
            { key: "belle_epoque", label: "ベル・エポック" },
            { key: "armand", label: "アルマンド" },
            { key: "lavay", label: "ラベイ" },
          ] as const).map(({ key, label }) => (
            <div
              key={key}
              className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center border border-border rounded-xl p-3 bg-muted/10"
            >
              <div className="text-sm font-medium text-foreground md:col-span-1">
                {label}
              </div>
              <div className="md:col-span-1">
                <TextInput
                  type="number"
                  value={champagnePrices[key].amount}
                  onChange={(e: any) =>
                    setChampagnePrices({
                      ...champagnePrices,
                      [key]: { ...champagnePrices[key], amount: e.target.value },
                    })
                  }
                  placeholder="金額（円）"
                />
              </div>
              <div className="md:col-span-1">
                <TextInput
                  value={champagnePrices[key].note}
                  onChange={(e: any) =>
                    setChampagnePrices({
                      ...champagnePrices,
                      [key]: { ...champagnePrices[key], note: e.target.value },
                    })
                  }
                  placeholder="備考（任意）"
                />
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="セット料金" icon={DollarSign}>
        <div className="space-y-5">
          <Field
            label="セット料金項目"
            hint="ボトル代・席料・チャージなど、項目ごとに金額を登録してください"
          >
            <div className="space-y-2">
              {setFeeItems.map((item, i) => (
                <div key={i} className="flex gap-2 items-start group">
                  <div className="text-muted-foreground/40 text-xs w-5 text-center shrink-0 pt-3">
                    {i + 1}
                  </div>
                  <input
                    value={item.label}
                    onChange={(e) => {
                      const next = [...setFeeItems];
                      next[i] = { ...next[i], label: e.target.value };
                      setSetFeeItems(next);
                    }}
                    placeholder="項目名（例: 90分セット）"
                    className="flex-1 px-3.5 py-2.5 rounded-xl border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  />
                  <input
                    value={item.amount}
                    onChange={(e) => {
                      const next = [...setFeeItems];
                      next[i] = { ...next[i], amount: e.target.value };
                      setSetFeeItems(next);
                    }}
                    placeholder="金額（円）"
                    className="w-32 px-3.5 py-2.5 rounded-xl border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  />
                  <input
                    value={item.note}
                    onChange={(e) => {
                      const next = [...setFeeItems];
                      next[i] = { ...next[i], note: e.target.value };
                      setSetFeeItems(next);
                    }}
                    placeholder="備考（任意）"
                    className="flex-1 px-3.5 py-2.5 rounded-xl border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  />
                  <button
                    onClick={() => setSetFeeItems(setFeeItems.filter((_, idx) => idx !== i))}
                    className="p-1.5 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition mt-2"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <button
                onClick={() =>
                  setSetFeeItems([...setFeeItems, { label: "", amount: "", note: "" }])
                }
                className="flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 transition px-5"
              >
                <Plus className="w-3.5 h-3.5" /> セット項目を追加
              </button>
            </div>
          </Field>
          <Field label="セット料金 補足">
            <TextArea
              value={setFeeNotes}
              onChange={(e: any) => setSetFeeNotes(e.target.value)}
              rows={2}
              placeholder="例: 延長30分ごと+1,500円、税込表記"
            />
          </Field>
        </div>
      </SectionCard>

      <SectionCard title="レクタ経由入店女性エピソード" icon={Sparkles}>
        <p className="text-xs text-muted-foreground mb-4">
          レクタ経由で入店した在籍キャストのエピソードを登録できます（顔出しOK時のみ）。
        </p>
        <div className="space-y-4">
          {rectaEpisodes.map((ep, i) => (
            <div
              key={i}
              className="border border-border rounded-xl p-4 space-y-3 bg-muted/10"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">エピソード {i + 1}</span>
                <button
                  onClick={() => setRectaEpisodes(rectaEpisodes.filter((_, idx) => idx !== i))}
                  className="text-muted-foreground hover:text-destructive transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Field label="名前">
                  <TextInput
                    value={ep.name}
                    onChange={(e: any) => {
                      const next = [...rectaEpisodes];
                      next[i] = { ...next[i], name: e.target.value };
                      setRectaEpisodes(next);
                    }}
                    placeholder="例: みき"
                  />
                </Field>
                <Field label="Instagram URL（任意）">
                  <TextInput
                    value={ep.instagram_url}
                    onChange={(e: any) => {
                      const next = [...rectaEpisodes];
                      next[i] = { ...next[i], instagram_url: e.target.value };
                      setRectaEpisodes(next);
                    }}
                    placeholder="https://instagram.com/..."
                  />
                </Field>
              </div>
              <Field label="写真URL（任意）">
                <TextInput
                  value={ep.photo_url}
                  onChange={(e: any) => {
                    const next = [...rectaEpisodes];
                    next[i] = { ...next[i], photo_url: e.target.value };
                    setRectaEpisodes(next);
                  }}
                  placeholder="https://..."
                />
              </Field>
              <Field label="エピソード">
                <TextArea
                  value={ep.comment}
                  onChange={(e: any) => {
                    const next = [...rectaEpisodes];
                    next[i] = { ...next[i], comment: e.target.value };
                    setRectaEpisodes(next);
                  }}
                  rows={3}
                  placeholder="例: 上京して2ヶ月で月収100万達成！"
                />
              </Field>
            </div>
          ))}
          <button
            onClick={() =>
              setRectaEpisodes([
                ...rectaEpisodes,
                { name: "", comment: "", instagram_url: "", photo_url: "" },
              ])
            }
            className="flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 transition px-5"
          >
            <Plus className="w-3.5 h-3.5" /> エピソードを追加
          </button>
        </div>
      </SectionCard>

      <SectionCard title="送り・交通サポート" icon={Car}>
        <div className="space-y-5">
          <Field
            label="送りの説明"
            hint="送りサービスの詳細を記載してください"
          >
            <TextArea
              value={transferDescription}
              onChange={(e: any) => setTransferDescription(e.target.value)}
              rows={3}
              placeholder="例: 営業終了後、自宅まで無料送迎あり"
            />
          </Field>
          <Field label="送り距離">
            <TextInput
              value={transferKm}
              onChange={(e: any) => setTransferKm(e.target.value)}
              placeholder="例: 20km圏内"
            />
          </Field>
        </div>
      </SectionCard>

      <SectionCard title="Q&A" icon={HelpCircle}>
        <Field
          label="よくある質問"
          hint="求職者からよく聞かれる質問と回答を登録してください"
        >
          <DynamicPairList
            items={qaItems}
            setItems={setQaItems}
            labelPlaceholder="質問"
            valuePlaceholder="回答"
          />
        </Field>
      </SectionCard>

      <SectionCard title="スタッフコメント" icon={MessageSquare}>
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Field label="スタッフ名">
              <TextInput
                value={staffName}
                onChange={(e: any) => setStaffName(e.target.value)}
                placeholder="例: 田中"
              />
            </Field>
            <Field label="スタッフ役職">
              <TextInput
                value={staffRole}
                onChange={(e: any) => setStaffRole(e.target.value)}
                placeholder="例: 店長"
              />
            </Field>
          </div>
          <Field label="コメント">
            <TextArea
              value={staffComment}
              onChange={(e: any) =>
                setStaffComment(e.target.value)
              }
              rows={4}
              placeholder="求職者へのメッセージを入力してください"
            />
          </Field>
          <Field label="サポート内容">
            <DynamicTextList
              items={supportItems}
              setItems={setSupportItems}
              placeholder="例: 面接時の送迎"
            />
          </Field>
        </div>
      </SectionCard>

      <SectionCard title="ピックアップ設定" icon={Crown}>
        <div className="space-y-5">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-2">
            <p className="text-[12px] text-amber-800">
              ここでの設定はトップページの「ピックアップ店舗」セクションの表示に反映されます。
              「コンテンツ管理」ページでも並び順の調整が可能です。
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Field label="ピックアップ掲載" hint="ONにするとトップページのピックアップ欄に表示候補になります">
              <div className="flex items-center gap-3">
                <button
                  className="relative w-11 h-6 rounded-full bg-emerald-500 transition"
                >
                  <span className="absolute left-[22px] top-[2px] w-5 h-5 rounded-full bg-white shadow transition-all" />
                </button>
                <span className="text-[13px] text-emerald-600">掲載中</span>
              </div>
            </Field>
            <Field label="PRバッジ" hint="ONにするとゴールドのPRタグが表示されます">
              <div className="flex items-center gap-3">
                <button
                  className="relative w-11 h-6 rounded-full bg-gray-200 transition"
                >
                  <span className="absolute left-[2px] top-[2px] w-5 h-5 rounded-full bg-white shadow transition-all" />
                </button>
                <span className="text-[13px] text-muted-foreground">OFF</span>
              </div>
            </Field>
          </div>
          <Field label="表示優先度" hint="数値が小さいほど先に表示されます（1が最優先）">
            <TextInput
              type="number"
              value="3"
              onChange={() => {}}
              placeholder="例: 1"
            />
          </Field>
        </div>
      </SectionCard>

      <SectionCard title="公開設定" icon={Globe}>
        <div className="space-y-5">
          <Field label="公開ステータス" required>
            <select
              value={publishStatus}
              onChange={(e) => setPublishStatus(e.target.value as "published" | "unpublished" | "draft")}
              className="w-full px-3 py-2 rounded-lg border border-border bg-white text-[13px] focus:outline-none focus:ring-2 focus:ring-foreground/10 focus:border-foreground/30 appearance-none transition-all"
            >
              <option value="draft">下書き</option>
              <option value="published">公開中</option>
              <option value="unpublished">非公開</option>
            </select>
          </Field>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Field label="公開開始日時">
              <TextInput
                type="datetime-local"
                value=""
                onChange={() => {}}
              />
            </Field>
            <Field label="公開終了日時">
              <TextInput
                type="datetime-local"
                value=""
                onChange={() => {}}
              />
            </Field>
          </div>
          <Field label="SEOメタディスクリプション" hint="検索エンジン向けの説明文（120文字以内推奨）">
            <TextArea
              value=""
              onChange={() => {}}
              rows={2}
              placeholder="店舗の特徴を簡潔に記述してください"
            />
          </Field>
        </div>
      </SectionCard>
    </div>
  );

  const stepRenderers = [
    renderStep1,
    renderStep2,
    renderStep3,
    renderStep4,
    renderStep5,
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-amber-50 border border-amber-200 mb-4">
          <Building2 className="w-7 h-7 text-amber-600" />
        </div>
        <h2 className="text-lg font-semibold text-gray-900 mb-1.5">店舗が見つかりませんでした</h2>
        <p className="text-sm text-gray-500 mb-6">指定されたID（{id}）の店舗は存在しないか、削除された可能性があります。</p>
        <button
          onClick={() => navigate("/admin/shops")}
          className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          店舗一覧に戻る
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {saveSuccess && (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="bg-emerald-600 text-white px-4 py-2.5 rounded-lg shadow-lg text-[13px] flex items-center gap-2">
            <Save className="w-3.5 h-3.5" />
            保存しました
          </div>
        </div>
      )}
      {saveError && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-[13px] text-red-700">
          {saveError}
        </div>
      )}
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/admin/shops")}
            className="p-2 rounded-xl hover:bg-accent transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-base">
              {isNew ? "店舗作成" : "店舗編集"}
            </h2>
            {!isNew && (
              <p className="text-xs text-muted-foreground">
                {shopName}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isNew && (
            <button
              onClick={() => setShowCopyModal(true)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-border text-sm hover:bg-accent transition text-muted-foreground"
            >
              <Copy className="w-4 h-4" /> 既存店舗から複製
            </button>
          )}
          <button
            onClick={() => setShowPreview(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-border text-sm hover:bg-accent transition"
          >
            <Eye className="w-4 h-4" /> プレビュー
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-indigo-600 text-white text-[13px] hover:bg-indigo-700 transition disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? "保存中..." : "保存"}
          </button>
        </div>
      </div>

      {/* Copy from existing modal */}
      {showCopyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowCopyModal(false)}
          />
          <div className="relative bg-white rounded-xl shadow-2xl border border-border w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base">既存店舗から複製</h3>
              <button
                onClick={() => setShowCopyModal(false)}
                className="p-1 rounded-lg hover:bg-accent transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              既存の店舗データをベースに新しい店舗を作成できます。
              <br />
              複製後に各項目を編集してください。
            </p>
            <div className="space-y-2">
              {existingShops.map((shop) => (
                <button
                  key={shop.id}
                  onClick={() => {
                    api.get<Store>(`/admin/stores/${shop.id}`).then(store => {
                      populateFromStore(store);
                      setShowCopyModal(false);
                    });
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-border hover:bg-accent hover:border-primary/30 transition text-left group"
                >
                  <div className="w-9 h-9 rounded-lg bg-primary/5 text-primary flex items-center justify-center text-xs">
                    {shop.name[0]}
                  </div>
                  <span className="text-sm">{shop.name}</span>
                  <Copy className="w-4 h-4 text-muted-foreground ml-auto opacity-0 group-hover:opacity-100 transition" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Floating preview panel — renders actual StoreDetailPage */}
      {showPreview && (
        <FloatingPreview onClose={() => setShowPreview(false)}>
          <div className="flex flex-col items-center" style={{ transform: 'scale(0.8)', transformOrigin: 'top center' }}>
            {/* Phone shell — 390×844 (iPhone 14) at 80% scale */}
            <div className="w-[390px] bg-black rounded-[48px] p-[10px] shadow-2xl ring-1 ring-white/10">
              <div className="relative bg-[#f7f6f3] rounded-[38px] h-[844px] overflow-hidden flex flex-col">
                {/* Dynamic island */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 z-20 w-[120px] h-[32px] bg-black rounded-b-[20px]" />
                {/* Scrollable content */}
                <div className="flex-1 overflow-y-auto overscroll-contain pt-8">
                  <StoreDetailPage
              id={isNew ? 0 : Number(id)}
              previewData={{
                store: {
                  id: isNew ? 0 : Number(id),
                  name: shopName || "店舗名未設定",
                  area: area,
                  address: address,
                  nearest_station: station,
                  category: category,
                  business_hours: openingTime && closingTime ? `${openingTime}〜${closingTime}` : "",
                  opening_time: openingTime || null,
                  closing_time: closingTime || null,
                  holidays: holiday,
                  shift_info: shiftInfo || null,
                  phone: phone,
                  website_url: website,
                  hourly_min: Number(minWage) || 0,
                  hourly_max: Number(maxWage) || 0,
                  daily_estimate: Number(dailyPay) || 0,
                  back_items: backItems.map((b) => ({ label: b.label, amount: Number(b.value) || 0 })),
                  fee_items: feeItems.map((f) => ({ label: f.label, amount: Number(f.value) || 0 })),
                  salary_notes: salaryNote,
                  guarantee_period: guaranteePeriod,
                  guarantee_details: guaranteeDetail,
                  norma_info: normaInfo,
                  trial_avg_hourly: Number(avgWage) || 0,
                  trial_hourly: Number(trialWage) || 0,
                  interview_hours: interviewStart && interviewEnd ? `${interviewStart}〜${interviewEnd}` : "",
                  interview_start: interviewStart || null,
                  interview_end: interviewEnd || null,
                  same_day_trial: sameDayTrial === "可",
                  feature_tags: tags,
                  description: description,
                  features_text: featureText,
                  images: storeImages.length > 0 ? storeImages.map((url, i) => ({ url, order: i })) : null,
                  video_url: videoUrl,
                  analysis: {
                    experience_level: expLevel,
                    atmosphere: atmosphere,
                    cast_style: {
                      beauty: Number(castBijin) || 0,
                      cute: Number(castKawaii) || 0,
                      glamour: Number(castGlamour) || 0,
                      natural: Number(castNatural) || 0,
                    },
                    experience_ratio: expRatio,
                    customer_age: clientAge.map((c) => ({
                      label: c.label,
                      ratio: parseFloat(c.value) || 0,
                    })),
                    drinking_style: drinkStyle,
                  },
                  interview_info: dressAdvice || dressTips.length > 0 || interviewDialog.length > 0
                    ? {
                        dress_advice: dressAdvice,
                        tips: dressTips,
                        dress_code: dressCode,
                        criteria: hiringCriteria,
                        dialog: interviewDialog.map((d) => ({
                          text: d.value,
                          speaker: d.label,
                        })),
                      }
                    : null,
                  required_documents: documents.length > 0 || docNote
                    ? { documents, notes: docNote }
                    : null,
                  schedule: shiftInfo ? { shift_info: shiftInfo } : null,
                  recent_hires: hiringEntries.length > 0
                    ? hiringEntries.map((h) => ({
                        month: h.month,
                        count: Number(h.count) || 0,
                        examples: h.examples,
                      }))
                    : null,
                  recent_hires_summary: hiringTotal,
                  popular_features: popularFeatures.length > 0
                    ? { features: popularFeatures }
                    : null,
                  qa: qaItems.length > 0
                    ? qaItems.map((q) => ({ question: q.label, answer: q.value }))
                    : null,
                  staff_comment: staffName || staffComment
                    ? {
                        name: staffName,
                        role: staffRole,
                        comment: staffComment,
                        supports: supportItems,
                      }
                    : null,
                  recruitment_standards: null,
                  rank: null,
                  gal_point: 50,
                  loose_point: 50,
                  age_point: 50,
                  waiwai_point: 50,
                  cute_point: 50,
                  transfer_description: transferDescription || null,
                  transfer_km: transferKm || null,
                  unit_wage_type: null,
                  dress_code: dressCodeDescription || dressCodeOk.length > 0 || dressCodeNg.length > 0
                    ? {
                        description: dressCodeDescription || undefined,
                        ok_examples: dressCodeOk
                          .filter((e) => e.note || e.image_url)
                          .map((e) => ({
                            note: e.note || undefined,
                            image_url: e.image_url || "",
                          })),
                        ng_examples: dressCodeNg
                          .filter((e) => e.note || e.image_url)
                          .map((e) => ({
                            note: e.note || undefined,
                            image_url: e.image_url || "",
                          })),
                      }
                    : null,
                  payroll_system_type: payrollSystemType || null,
                  payroll_system_description: payrollSystemDescription || null,
                  champagne_description: champagneDescription || null,
                  champagne_prices: (() => {
                    const out: Record<string, { amount: number; note?: string }> = {};
                    (Object.keys(champagnePrices) as Array<keyof typeof champagnePrices>).forEach((k) => {
                      const item = champagnePrices[k];
                      const trimmedAmount = item.amount.trim();
                      if (!trimmedAmount && !item.note.trim()) return;
                      const num = Number(trimmedAmount.replace(/[^\d.-]/g, ""));
                      out[k as string] = {
                        amount: Number.isFinite(num) ? num : 0,
                        ...(item.note.trim() ? { note: item.note.trim() } : {}),
                      };
                    });
                    return Object.keys(out).length > 0 ? out : null;
                  })(),
                  set_fee: (setFeeItems.some((it) => it.label || it.amount) || setFeeNotes)
                    ? {
                        items: setFeeItems
                          .filter((it) => it.label || it.amount)
                          .map((it) => {
                            const num = Number(it.amount.replace(/[^\d.-]/g, ""));
                            return {
                              label: it.label,
                              amount: Number.isFinite(num) ? num : it.amount,
                              ...(it.note ? { note: it.note } : {}),
                            };
                          }),
                        ...(setFeeNotes ? { notes: setFeeNotes } : {}),
                      }
                    : null,
                  recta_episodes: rectaEpisodes
                    .filter((ep) => ep.name)
                    .map((ep) => ({
                      name: ep.name,
                      ...(ep.comment ? { comment: ep.comment } : {}),
                      ...(ep.instagram_url ? { instagram_url: ep.instagram_url } : {}),
                      ...(ep.photo_url ? { photo_url: ep.photo_url } : {}),
                    })),
                  reviews_count: 0,
                  average_rating: 0,
                  reviews: [],
                },
              } satisfies StoreDetailResponse}
            />
                </div>
                {/* Bottom tab bar — pinned inside the iPhone shell, not the viewport */}
                <div className="shrink-0">
                  <BottomTabBar inline />
                </div>
                {/* Home indicator */}
                <div className="h-6 flex items-center justify-center shrink-0">
                  <div className="w-[120px] h-[4px] bg-gray-300 rounded-full" />
                </div>
              </div>
            </div>
          </div>
        </FloatingPreview>
      )}

      {/* New shop tip */}
      {isNew && currentStep === 0 && (
        <div className="bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 flex items-start gap-3 mb-6">
          <Zap className="w-4 h-4 text-stone-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-[13px] text-foreground">
              効率的に入力するには
            </p>
            <p className="text-[12px] text-muted-foreground mt-0.5">
              「既存店舗から複製」ボタンで登録済みの店舗データをテンプレートとして利用できます。また、各ステップは自由に行き来でき、必須項目以外は後から入力しても問題ありません。
            </p>
          </div>
        </div>
      )}

      <div className="flex gap-6">
        {/* Step Navigation Sidebar */}
        <div className="hidden lg:block w-64 shrink-0">
          <div className="sticky top-[53px] space-y-4">
            {/* Progress */}
            <div className="bg-white border border-border rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] text-muted-foreground uppercase tracking-wider">
                  進捗
                </span>
                <span className="text-xs text-primary px-2 py-0.5 bg-primary/5 rounded-md">
                  {progress}%
                </span>
              </div>
              <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {/* Step list */}
            <div className="bg-white border border-border rounded-2xl overflow-hidden">
              <div className="px-5 py-3 border-b border-border">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  ステップ
                </p>
              </div>
              <nav className="p-2">
                {steps.map((step, idx) => {
                  const isActive = idx === currentStep;
                  const isCompleted = completedSteps.has(idx);
                  return (
                    <button
                      key={step.id}
                      onClick={() => handleStepClick(idx)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all mb-0.5 ${
                        isActive
                          ? "bg-primary/8 text-primary"
                          : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                      }`}
                    >
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all ${
                          isCompleted
                            ? "bg-emerald-100 text-emerald-600"
                            : isActive
                            ? "bg-indigo-600 text-white"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {isCompleted ? (
                          <Check className="w-3.5 h-3.5" />
                        ) : (
                          <span className="text-[11px]">
                            {idx + 1}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs truncate">
                          {step.title}
                        </p>
                        <p className="text-[10px] text-muted-foreground truncate">
                          {step.sections.length}セクション
                        </p>
                      </div>
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Sections within current step */}
            <div className="bg-white border border-border rounded-2xl overflow-hidden">
              <div className="px-5 py-3 border-b border-border">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  現在のセクション
                </p>
              </div>
              <div className="p-2">
                {steps[currentStep].sections.map((section) => (
                  <div
                    key={section.id}
                    className="flex items-center gap-2.5 px-3 py-2 text-sm text-muted-foreground"
                  >
                    <section.icon className="w-3.5 h-3.5 shrink-0" />
                    <span className="text-xs truncate">
                      {section.title}
                    </span>
                    {section.required && (
                      <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0 ml-auto" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          {/* Mobile step indicator */}
          <div className="lg:hidden mb-4">
            <div className="flex items-center gap-2 mb-3 overflow-x-auto pb-2">
              {steps.map((step, idx) => {
                const isActive = idx === currentStep;
                const isCompleted = completedSteps.has(idx);
                return (
                  <button
                    key={step.id}
                    onClick={() => handleStepClick(idx)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl whitespace-nowrap text-sm shrink-0 transition-all ${
                      isActive
                        ? "bg-primary/10 text-primary border border-primary/20"
                        : isCompleted
                        ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                        : "bg-muted/50 text-muted-foreground"
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (
                      <Circle className="w-4 h-4" />
                    )}
                    {step.title}
                  </button>
                );
              })}
            </div>
            <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                style={{
                  width: `${((currentStep + 1) / steps.length) * 100}%`,
                }}
              />
            </div>
          </div>

          {/* Step Header */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-1">
              <div
                className="w-9 h-9 rounded-lg bg-indigo-600 text-white flex items-center justify-center"
              >
                {(() => {
                  const StepIcon = steps[currentStep].icon;
                  return <StepIcon className="w-4 h-4" />;
                })()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    Step {currentStep + 1} / {steps.length}
                  </span>
                </div>
                <h3 className="text-base text-foreground">
                  {steps[currentStep].title}
                </h3>
              </div>
            </div>
            <p className="text-sm text-muted-foreground ml-[52px]">
              {steps[currentStep].subtitle}
            </p>
          </div>

          {/* Step Content */}
          <div className="space-y-6">{stepRenderers[currentStep]()}</div>

          {/* Step Navigation */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-border">
            <button
              onClick={handlePrev}
              disabled={currentStep === 0}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm transition-all ${
                currentStep === 0
                  ? "text-muted-foreground/40 cursor-not-allowed"
                  : "text-foreground hover:bg-accent border border-border"
              }`}
            >
              <ArrowLeft className="w-4 h-4" /> 前のステップ
            </button>

            <div className="flex items-center gap-1.5">
              {steps.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => handleStepClick(idx)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    idx === currentStep
                      ? "w-6 bg-primary"
                      : completedSteps.has(idx)
                      ? "bg-emerald-400"
                      : "bg-muted-foreground/20"
                  }`}
                />
              ))}
            </div>

            {currentStep < steps.length - 1 ? (
              <button
                onClick={handleNext}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-[13px] hover:bg-indigo-700 transition"
              >
                次のステップ <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-[13px] hover:bg-indigo-700 transition disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {saving ? "保存中..." : "保存して完了"}
              </button>
            )}
          </div>

          {/* Bottom spacer */}
          <div className="h-8" />
        </div>
      </div>
    </div>
  );
}
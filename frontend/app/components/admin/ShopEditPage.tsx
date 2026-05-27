import { useState, useCallback, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router";
import { api } from "~/lib/api";
import { useShopImages } from "~/hooks/useShopImages";
import { useStepProgression } from "~/hooks/useStepProgression";
import { useFileUpload } from "~/hooks/useFileUpload";
import { formToPayload, storeToForm, type ShopForm } from "~/hooks/useShopForm";
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
  ChevronUp,
  ChevronDown,
  Zap,
  CheckCircle2,
  Circle,
  Crown,
  Globe,
  Loader2,
  GripVertical,
} from "lucide-react";
import { ShopPhonePreview } from "./ShopPhonePreview";
import StoreMap from "~/components/shared/StoreMap";
import StoreDetailPage from "~/components/user/StoreDetailPage";
import type { StoreDetailResponse } from "~/components/user/StoreDetailPage";
import BottomTabBar from "~/components/user/shared/BottomTabBar";

// --- Step Definitions ---
interface StepConfig {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  gradient: string;
  sections: { id: string; title: string; icon: React.ComponentType<{ className?: string }>; required?: boolean }[];
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
  inputMode,
}: {
  placeholder?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
}) {
  return (
    <input
      type={type}
      inputMode={inputMode}
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
}: {
  placeholder?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  rows?: number;
}) {
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

function SelectInput({
  options,
  value,
  onChange,
  placeholder,
}: {
  options: string[];
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  placeholder?: string;
}) {
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
  labelOptions,
  defaultLabel,
}: {
  items: { label: string; value: string }[];
  setItems: (items: { label: string; value: string }[]) => void;
  labelPlaceholder?: string;
  valuePlaceholder?: string;
  /** 指定するとラベル側が <select> になる。話者など固定候補の入力に使う。 */
  labelOptions?: string[];
  /** 「追加」時に初期セットされるラベル (主に labelOptions と組み合わせる)。 */
  defaultLabel?: string;
}) {
  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="flex gap-2 items-center group">
          <div className="text-muted-foreground/40 text-xs w-5 text-center shrink-0">
            {i + 1}
          </div>
          {labelOptions ? (
            <select
              value={item.label}
              onChange={(e) => {
                const newItems = [...items];
                newItems[i] = { ...newItems[i], label: e.target.value };
                setItems(newItems);
              }}
              className="w-32 shrink-0 px-3 py-2.5 rounded-xl border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            >
              {!labelOptions.includes(item.label) && item.label !== "" && (
                <option value={item.label}>{item.label}</option>
              )}
              {item.label === "" && <option value="">{labelPlaceholder}</option>}
              {labelOptions.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          ) : (
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
          )}
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
        onClick={() =>
          setItems([
            ...items,
            { label: defaultLabel ?? (labelOptions?.[0] ?? ""), value: "" },
          ])
        }
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
}: {
  label: string;
  value: number;
  onChange?: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  leftLabel: string;
  rightLabel: string;
  required?: boolean;
}) {
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

/**
 * URL text input + 「画像を選択」ボタンの 2 つで構成された入力。
 * S3 upload (kind ごと) と組み合わせて、選択した画像を upload し
 * 返ってきた public URL を value に流す。
 * StaffPhotosEditor / DressCode OK・NG など複数箇所で再利用。
 */
function ImageUrlInput({
  value,
  onChange,
  kind,
  placeholder = "https://example.com/image.jpg",
}: {
  value: string;
  onChange: (next: string) => void;
  kind: string;
  placeholder?: string;
}) {
  const { uploadFile, uploading, error } = useFileUpload(kind);
  return (
    <div>
      <div className="flex gap-2 items-start">
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1 w-full px-3 py-2 rounded-lg border border-border bg-white text-[13px] focus:outline-none focus:ring-2 focus:ring-foreground/10 focus:border-foreground/30 transition-all placeholder:text-muted-foreground/50"
        />
        <label
          className="shrink-0 inline-flex items-center justify-center gap-1 px-3 py-2 rounded-lg border border-border bg-white text-[12px] cursor-pointer hover:bg-accent transition disabled:opacity-50 whitespace-nowrap"
          aria-disabled={uploading}
        >
          <Upload className="w-3.5 h-3.5" />
          {uploading ? "..." : "画像を選択"}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            disabled={uploading}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (file) {
                const url = await uploadFile(file);
                if (url) onChange(url);
              }
              e.target.value = ""; // 同じファイル再選択を許可
            }}
          />
        </label>
      </div>
      {error && <p className="text-[11px] text-red-500 mt-1">{error}</p>}
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
  icon: React.ComponentType<{ className?: string }>;
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
  // ステップ管理 (currentStep / completedSteps / next/prev/goTo / 進捗計算) は
  // useStepProgression に集約 (Phase 3-1)。stepCount は 5 固定 (下の steps 配列と整合)。
  const stepFlow = useStepProgression(5);
  const { currentStep, completedSteps } = stepFlow;
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // --- State ---
  const [shopName, setShopName] = useState("");
  const [area, setArea] = useState("");
  const [address, setAddress] = useState("");
  // 緯度経度 — Google Geocoding (admin の「住所から取得」ボタンで埋める)。
  // null = 未取得。詳細ページの送り・足代マップの表示可否判定に使う。
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [geocodeLoading, setGeocodeLoading] = useState(false);
  const [geocodeError, setGeocodeError] = useState<string | null>(null);
  const [station, setStation] = useState("");
  const [category, setCategory] = useState("");
  const [openingTime, setOpeningTime] = useState("");
  const [closingTime, setClosingTime] = useState("");
  const [holiday, setHoliday] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  // Multi-video editor state. Each row is one video with its own label and
  // description so the public store-detail page can render them interleaved.
  type VideoDraft = { video_url: string; label: string; description: string };
  const [videos, setVideos] = useState<VideoDraft[]>([]);

  // 在籍女性ギャラリー（StoreDetail 8b セクション）の編集 state。
  type StaffPhotoDraft = {
    image_url: string;
    caption: string;
    instagram_url: string;
    staff_type: string;
  };
  const [staffPhotos, setStaffPhotos] = useState<StaffPhotoDraft[]>([]);
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
  const [trialMinWage, setTrialMinWage] = useState("");
  const [trialMaxWage, setTrialMaxWage] = useState("");
  const [interviewStart, setInterviewStart] = useState("");
  const [interviewEnd, setInterviewEnd] = useState("");
  const [sameDayTrial, setSameDayTrial] = useState("可");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [description, setDescription] = useState("");
  const [featureText, setFeatureText] = useState("");
  const [expLevel, setExpLevel] = useState(50);
  const [atmosphere, setAtmosphere] = useState(50);
  // BUG-Live-03 (続き): 新規作成時に prefill 値があると、未編集のまま保存して
  // 全店舗が同じ「綺麗系30/可愛い系40/...」「20代20%/30代35%/...」になる事故が起きる。
  // populateFromStore() で既存店舗の値は復元される。
  const [castBijin, setCastBijin] = useState("");
  const [castKawaii, setCastKawaii] = useState("");
  const [castGlamour, setCastGlamour] = useState("");
  const [castNatural, setCastNatural] = useState("");
  const [clientAge, setClientAge] = useState<
    { label: string; value: string }[]
  >([]);
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
  // BUG-Live-03: 新規作成時にダミー値が入っていると、保存ボタンを押した瞬間に
  // 「2026年2月 12人 採用」「直近5ヶ月で52名採用」などのテキストが実 DB に
  // 入ってしまう。新規作成では空にし、既存店舗を開いたときだけ
  // populateFromStore() で実データを流す。
  const [hiringEntries, setHiringEntries] = useState<
    { month: string; count: string; examples: string[] }[]
  >([]);
  const [hiringTotal, setHiringTotal] = useState("");
  // New schema fields
  const [transferDescription, setTransferDescription] = useState("");
  const [transferKm, setTransferKm] = useState("");
  // 距離別の足代テーブル（六本木・銀座の高級店向け）。空のままなら API に null を送る。
  const [transferZones, setTransferZones] = useState<
    Array<{ label: string; radius_km: string; fee: string; color: string }>
  >([]);
  // 系列店（管理者が明示的に紐づけた他店舗）。store.id の配列。
  const [relatedStoreIds, setRelatedStoreIds] = useState<number[]>([]);
  // 系列店セレクタの候補ソース — 現在の店舗以外の published 店舗一覧。
  const [storeCandidates, setStoreCandidates] = useState<
    Array<{ id: number; name: string; area: string | null }>
  >([]);
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
  const [setFeeList, setSetFeeList] = useState<
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
  const [seoMetaDescription, setSeoMetaDescription] = useState("");

  const [publishStatus, setPublishStatus] = useState<"published" | "unpublished" | "draft">("draft");
  // 画像アップロード/削除の state とハンドラは useShopImages フックに集約。
  // setStoreImages は populate (既存店舗 GET 後の反映) と save 後の reset で
  // 使うので、フックから返ってきた setter を引き続きそのまま使う。
  const {
    images: storeImages,
    setImages: setStoreImages,
    upload: uploadShopImages,
    remove: removeShopImage,
    uploading: uploadingImage,
    error: shopImageError,
  } = useShopImages(isNew ? null : (id ?? null));

  const [existingShops, setExistingShops] = useState<{id: number; name: string}[]>([]);
  // エリア/業種カテゴリのマスタ。マスタテーブルと options が乖離するとSelectの復元が壊れる
  // (BUG-001) ので、ハードコードせず API から取得する。
  const [areaOptions, setAreaOptions] = useState<string[]>([]);
  const [categoryOptions, setCategoryOptions] = useState<string[]>([]);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Phase 3-2: 旧 200 行の populateFromStore は useShopForm の storeToForm に移管。
  // 結果の Partial<ShopForm> を個別 setter にディスパッチする薄い wrapper だけ残す。
  // 88 useState 自体は historical reasons でここに残してあるが、変換ロジックは
  // hook 内で Unit テストできる純粋関数になった。
  const populateFromStore = useCallback((store: Store) => {
    const f = storeToForm(store);
    if (f.shopName !== undefined) setShopName(f.shopName);
    if (f.area !== undefined) setArea(f.area);
    if (f.address !== undefined) setAddress(f.address);
    if (f.lat !== undefined) setLat(f.lat);
    if (f.lng !== undefined) setLng(f.lng);
    if (f.station !== undefined) setStation(f.station);
    if (f.category !== undefined) setCategory(f.category);
    if (f.openingTime !== undefined) setOpeningTime(f.openingTime);
    if (f.closingTime !== undefined) setClosingTime(f.closingTime);
    if (f.holiday !== undefined) setHoliday(f.holiday);
    if (f.phone !== undefined) setPhone(f.phone);
    if (f.website !== undefined) setWebsite(f.website);
    if (f.videos !== undefined) setVideos(f.videos);
    if (f.staffPhotos !== undefined) setStaffPhotos(f.staffPhotos);
    if (f.minWage !== undefined) setMinWage(f.minWage);
    if (f.maxWage !== undefined) setMaxWage(f.maxWage);
    if (f.dailyPay !== undefined) setDailyPay(f.dailyPay);
    if (f.backItems !== undefined) setBackItems(f.backItems);
    if (f.feeItems !== undefined) setFeeItems(f.feeItems);
    if (f.salaryNote !== undefined) setSalaryNote(f.salaryNote);
    if (f.guaranteePeriod !== undefined) setGuaranteePeriod(f.guaranteePeriod);
    if (f.guaranteeDetail !== undefined) setGuaranteeDetail(f.guaranteeDetail);
    if (f.normaInfo !== undefined) setNormaInfo(f.normaInfo);
    if (f.trialMinWage !== undefined) setTrialMinWage(f.trialMinWage);
    if (f.trialMaxWage !== undefined) setTrialMaxWage(f.trialMaxWage);
    if (f.interviewStart !== undefined) setInterviewStart(f.interviewStart);
    if (f.interviewEnd !== undefined) setInterviewEnd(f.interviewEnd);
    if (f.sameDayTrial !== undefined) setSameDayTrial(f.sameDayTrial);
    if (f.payrollSystemType !== undefined) setPayrollSystemType(f.payrollSystemType);
    if (f.payrollSystemDescription !== undefined) setPayrollSystemDescription(f.payrollSystemDescription);
    if (f.tags !== undefined) setTags(f.tags);
    if (f.description !== undefined) setDescription(f.description);
    if (f.featureText !== undefined) setFeatureText(f.featureText);
    if (f.expLevel !== undefined) setExpLevel(f.expLevel);
    if (f.atmosphere !== undefined) setAtmosphere(f.atmosphere);
    if (f.castBijin !== undefined) setCastBijin(f.castBijin);
    if (f.castKawaii !== undefined) setCastKawaii(f.castKawaii);
    if (f.castGlamour !== undefined) setCastGlamour(f.castGlamour);
    if (f.castNatural !== undefined) setCastNatural(f.castNatural);
    if (f.clientAge !== undefined) setClientAge(f.clientAge);
    if (f.drinkStyle !== undefined) setDrinkStyle(f.drinkStyle);
    if (f.dressAdvice !== undefined) setDressAdvice(f.dressAdvice);
    if (f.dressTips !== undefined) setDressTips(f.dressTips);
    if (f.dressCode !== undefined) setDressCode(f.dressCode);
    if (f.hiringCriteria !== undefined) setHiringCriteria(f.hiringCriteria);
    if (f.interviewDialog !== undefined) setInterviewDialog(f.interviewDialog);
    if (f.documents !== undefined) setDocuments(f.documents);
    if (f.docNote !== undefined) setDocNote(f.docNote);
    if (f.shiftInfo !== undefined) setShiftInfo(f.shiftInfo);
    if (f.hiringEntries !== undefined) setHiringEntries(f.hiringEntries);
    if (f.hiringTotal !== undefined) setHiringTotal(f.hiringTotal);
    if (f.transferDescription !== undefined) setTransferDescription(f.transferDescription);
    if (f.transferKm !== undefined) setTransferKm(f.transferKm);
    if (f.transferZones !== undefined) setTransferZones(f.transferZones);
    if (f.relatedStoreIds !== undefined) setRelatedStoreIds(f.relatedStoreIds);
    if (f.champagneDescription !== undefined) setChampagneDescription(f.champagneDescription);
    if (f.champagnePrices !== undefined) setChampagnePrices(f.champagnePrices);
    if (f.dressCodeDescription !== undefined) setDressCodeDescription(f.dressCodeDescription);
    if (f.dressCodeOk !== undefined) setDressCodeOk(f.dressCodeOk);
    if (f.dressCodeNg !== undefined) setDressCodeNg(f.dressCodeNg);
    if (f.setFeeList !== undefined) setSetFeeList(f.setFeeList);
    if (f.setFeeNotes !== undefined) setSetFeeNotes(f.setFeeNotes);
    if (f.rectaEpisodes !== undefined) setRectaEpisodes(f.rectaEpisodes);
    if (f.qaItems !== undefined) setQaItems(f.qaItems);
    if (f.staffName !== undefined) setStaffName(f.staffName);
    if (f.staffRole !== undefined) setStaffRole(f.staffRole);
    if (f.staffComment !== undefined) setStaffComment(f.staffComment);
    if (f.supportItems !== undefined) setSupportItems(f.supportItems);
    if (f.seoMetaDescription !== undefined) setSeoMetaDescription(f.seoMetaDescription);
    // publish_status と images は ShopForm 範囲外
    setPublishStatus(store.publish_status || "draft");
    setStoreImages(
      ((store.images as unknown[]) || []).map((img) =>
        typeof img === "string" ? img : (img as { url: string }).url,
      ),
    );
  }, [setStoreImages]);

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

  // エリア/業種マスタを取得して Select options に流す。
  useEffect(() => {
    Promise.all([
      fetch("/api/areas").then((r) => r.ok ? r.json() : []),
      fetch("/api/categories").then((r) => r.ok ? r.json() : []),
    ])
      .then(([areas, categories]: [unknown, unknown]) => {
        const areaList = (Array.isArray(areas) ? areas : (areas as { data?: unknown[] })?.data ?? []) as { name: string }[];
        const catList = (Array.isArray(categories) ? categories : (categories as { data?: unknown[] })?.data ?? []) as { name: string }[];
        setAreaOptions(areaList.map((a) => a.name).filter(Boolean));
        setCategoryOptions(catList.map((c) => c.name).filter(Boolean));
      })
      .catch(() => {
        /* マスタが取れなくても画面は止めない。Select は空になり、保存できない状態で気付ける。 */
      });
  }, []);

  // 系列店セレクタの候補ロード — 自店舗を除外した published 店舗一覧。
  useEffect(() => {
    api.get<{ data: Store[] }>("/admin/stores?per_page=200&publish_status=published")
      .then((res) => {
        const meId = id ? Number(id) : null;
        setStoreCandidates(
          res.data
            .filter((s) => s.id !== meId)
            .map((s) => ({ id: s.id, name: s.name, area: s.area }))
        );
      })
      .catch(() => {
        /* 系列店セレクタは非クリティカル機能なので失敗しても画面は止めない */
      });
  }, [id]);

  useEffect(() => {
    if (!showCopyModal) return;
    // 複製候補は実用上 200 件あれば十分 (店舗数が増えてもモーダル内検索で
    // たどれる)。per_page=20 だと最近 20 件しか見えず、古い店をベースに
    // 複製したいケースで詰む。
    api.get<{data: Store[]}>("/admin/stores?per_page=200").then(res => {
      setExistingShops(res.data.map(s => ({ id: s.id, name: s.name })));
    });
  }, [showCopyModal]);

  // Phase 3-2: 旧 240 行の buildPayload は useShopForm の formToPayload に移管。
  // 個別 useState を ShopForm 形にまとめて変換関数に渡す薄い wrapper だけ残す。
  // 88 useState 自体は historical reasons でここに残してあるが、ロジックは
  // hook 内で Unit テストできる純粋関数になった。
  const buildPayload = useCallback(() => {
    const form: ShopForm = {
      shopName, area, address, lat, lng, station, category,
      openingTime, closingTime, holiday, phone, website,
      videos, staffPhotos,
      minWage, maxWage, dailyPay, backItems, feeItems, salaryNote,
      guaranteePeriod, guaranteeDetail, normaInfo,
      trialMinWage, trialMaxWage, interviewStart, interviewEnd, sameDayTrial,
      payrollSystemType, payrollSystemDescription,
      tags, description, featureText, expLevel, atmosphere,
      castBijin, castKawaii, castGlamour, castNatural, clientAge, drinkStyle,
      dressAdvice, dressTips, dressCode, hiringCriteria, interviewDialog,
      documents, docNote, shiftInfo, hiringEntries, hiringTotal,
      transferDescription, transferKm, transferZones, relatedStoreIds,
      champagneDescription, champagnePrices,
      dressCodeDescription, dressCodeOk, dressCodeNg,
      setFeeList, setFeeNotes, rectaEpisodes, qaItems,
      staffName, staffRole, staffComment, supportItems,
      seoMetaDescription,
    };
    return formToPayload(form, { storeImages: [], publishStatus });
  }, [
    shopName, area, address, lat, lng, station, category,
    openingTime, closingTime, holiday, phone, website,
    videos, staffPhotos,
    minWage, maxWage, dailyPay, backItems, feeItems, salaryNote,
    guaranteePeriod, guaranteeDetail, normaInfo,
    trialMinWage, trialMaxWage, interviewStart, interviewEnd, sameDayTrial,
    payrollSystemType, payrollSystemDescription,
    tags, description, featureText, expLevel, atmosphere,
    castBijin, castKawaii, castGlamour, castNatural, clientAge, drinkStyle,
    dressAdvice, dressTips, dressCode, hiringCriteria, interviewDialog,
    documents, docNote, shiftInfo, hiringEntries, hiringTotal,
    transferDescription, transferKm, transferZones, relatedStoreIds,
    champagneDescription, champagnePrices,
    dressCodeDescription, dressCodeOk, dressCodeNg,
    setFeeList, setFeeNotes, rectaEpisodes, qaItems,
    staffName, staffRole, staffComment, supportItems,
    seoMetaDescription,
    publishStatus,
  ]);

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

  // 旧 handleImageUpload / handleImageDelete は useShopImages フックに移管 (Phase 3-1)。
  // 呼び出し側は uploadShopImages / removeShopImage を使う。
  // hook の error は別 state なので、save 結果欄に集約するため effect で saveError に流す。
  useEffect(() => {
    if (shopImageError) setSaveError(shopImageError);
  }, [shopImageError]);

  // step ナビゲーションは useStepProgression に集約。ハンドラはスクロール処理だけ
  // 上乗せして wrapping する (旧コードはスクロール込みだったので挙動互換のため)。
  const handleNext = useCallback(() => {
    stepFlow.next();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [stepFlow]);

  const handlePrev = useCallback(() => {
    stepFlow.prev();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [stepFlow]);

  const handleStepClick = useCallback(
    (index: number) => {
      stepFlow.goTo(index);
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [stepFlow],
  );

  // BUG-010: 進捗バーは「『次へ』で踏んだ Step 数」だけで計算していたため、
  // データ入力済みの既存店舗を開いた直後は 0% で固定だった。
  // 各 Step の代表フィールドの充足を見て充足率を計算する。
  const stepFilled: boolean[] = [
    // Step1: 基本情報
    !!(shopName && area && category && station && address),
    // Step2: 給与・待遇
    !!(minWage && maxWage),
    // Step3: 特徴・分析
    !!(tags.length > 0 || featureText),
    // Step4: 採用・勤務
    !!(hiringCriteria || hiringEntries.length > 0 || shiftInfo),
    // Step5: その他
    !!(qaItems.length > 0 || staffComment || publishStatus === "published"),
  ];
  const { progress } = stepFlow.computeProgress(stepFilled);

  // --- Step Content Renderers ---
  const renderStep1 = () => (
    <div className="space-y-6">
      <SectionCard title="店舗基本情報" icon={Building2} required>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="md:col-span-2">
            <Field label="店舗名" required>
              <TextInput
                value={shopName}
                onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setShopName(e.target.value)}
                placeholder="例: CLUB LUNA"
              />
            </Field>
          </div>
          <Field label="エリア" required>
            <SelectInput
              value={area}
              onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setArea(e.target.value)}
              placeholder="エリアを選択"
              // 既存店舗の area がマスタに無い旧表記 ("新宿・歌舞伎町" 等) でも、
              // 現在値を options に合流させて value 復元を維持する。
              options={
                area && !areaOptions.includes(area)
                  ? [area, ...areaOptions]
                  : areaOptions
              }
            />
          </Field>
          <Field label="最寄り駅" required>
            <TextInput
              value={station}
              onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setStation(e.target.value)}
              placeholder="例: 新宿駅"
            />
          </Field>
          <div className="md:col-span-2">
            <Field label="住所" required>
              <TextInput
                value={address}
                onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setAddress(e.target.value)}
                placeholder="例: 東京都新宿区歌舞伎町1-1-1"
              />
            </Field>
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              <button
                type="button"
                disabled={!address.trim() || geocodeLoading}
                onClick={async () => {
                  setGeocodeError(null);
                  setGeocodeLoading(true);
                  try {
                    const res = await api.post<{ lat: number; lng: number; formatted_address: string }>(
                      "/admin/stores/geocode",
                      { address: address.trim() }
                    );
                    setLat(res.lat);
                    setLng(res.lng);
                  } catch (err) {
                    const msg = err instanceof Error ? err.message : "緯度経度の取得に失敗しました";
                    setGeocodeError(msg);
                  } finally {
                    setGeocodeLoading(false);
                  }
                }}
                className="text-xs rounded-md px-3 py-1.5 bg-primary text-primary-foreground disabled:opacity-50"
              >
                {geocodeLoading ? "取得中…" : "📍 住所から緯度経度を取得"}
              </button>
              {lat != null && lng != null && (
                <span className="text-xs text-muted-foreground">
                  {lat.toFixed(5)}, {lng.toFixed(5)}
                </span>
              )}
              {(lat != null || lng != null) && (
                <button
                  type="button"
                  onClick={() => { setLat(null); setLng(null); }}
                  className="text-xs text-muted-foreground hover:text-destructive"
                >
                  クリア
                </button>
              )}
              {geocodeError && (
                <span className="text-xs text-destructive">{geocodeError}</span>
              )}
            </div>
            {lat != null && lng != null && (
              <div className="mt-3">
                <StoreMap lat={lat} lng={lng} height={180} />
              </div>
            )}
          </div>
          <Field label="業種カテゴリ" required>
            <SelectInput
              value={category}
              onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setCategory(e.target.value)}
              placeholder="業種を選択"
              options={
                category && !categoryOptions.includes(category)
                  ? [category, ...categoryOptions]
                  : categoryOptions
              }
            />
          </Field>
          <Field label="営業時間（開始）">
            <TextInput
              value={openingTime}
              onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setOpeningTime(e.target.value)}
              placeholder="例: 20:00"
            />
          </Field>
          <Field label="営業時間（終了）">
            <TextInput
              value={closingTime}
              onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setClosingTime(e.target.value)}
              placeholder="例: 1:00 / LAST"
            />
          </Field>
          <Field label="定休日">
            <TextInput
              value={holiday}
              onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setHoliday(e.target.value)}
              placeholder="例: 日曜日"
            />
          </Field>
          <Field label="電話番号">
            <TextInput
              value={phone}
              onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setPhone(e.target.value)}
              placeholder="例: 03-0000-0000"
            />
          </Field>
          <div className="md:col-span-2">
            <Field label="公式サイトURL">
              <TextInput
                value={website}
                onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setWebsite(e.target.value)}
                placeholder="https://"
              />
            </Field>
          </div>
          {/* 時給/日給目安/シフト は管理画面上「店舗情報」の一部として扱う。
              ユーザー画面の店舗情報カードにも同じ並びで出る。詳細な給与
              (バック / 控除 / 保証 / ノルマ等) は STEP2「給与・待遇」へ。 */}
          <Field label="時給の最低額（円）" required>
            <TextInput
              type="number"
              value={minWage}
              onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setMinWage(e.target.value)}
              placeholder="4000"
            />
          </Field>
          <Field label="時給の最高額（円）" required>
            <TextInput
              type="number"
              value={maxWage}
              onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setMaxWage(e.target.value)}
              placeholder="8000"
            />
          </Field>
          <Field label="日給目安">
            <TextInput
              value={dailyPay}
              onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setDailyPay(e.target.value)}
              placeholder="例: 30000〜60000"
            />
          </Field>
          <div className="md:col-span-2">
            <Field label="シフト">
              <TextArea
                value={shiftInfo}
                onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setShiftInfo(e.target.value)}
                placeholder="例: 週1日からOK / 短期OK / 終電上がり相談可"
                rows={2}
              />
            </Field>
          </div>
          <div className="md:col-span-2">
            <Field
              label="SEOメタディスクリプション"
              hint="任意。検索結果の説明文に使われます（120〜140 文字推奨）。未入力なら自動生成。"
            >
              <TextArea
                value={seoMetaDescription}
                onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setSeoMetaDescription(e.target.value)}
                placeholder="例: 新宿歌舞伎町のキャバクラ◯◯。時給◯円〜、日払いOK。体入歓迎で未経験も安心。"
                rows={2}
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
                      onClick={() => removeShopImage(idx)}
                      className="absolute top-1.5 right-1.5 w-6 h-6 bg-black/60 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <ImageUploadZone
              onUpload={uploadShopImages}
              uploading={uploadingImage}
              disabled={isNew}
            />
          </Field>
          <Field label="動画（複数登録可）">
            <VideoListEditor videos={videos} onChange={setVideos} />
          </Field>
          <Field label="在籍女性ギャラリー（複数登録可）">
            <StaffPhotosEditor photos={staffPhotos} onChange={setStaffPhotos} />
          </Field>
        </div>
      </SectionCard>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <SectionCard title="給与・待遇" icon={DollarSign} required>
        <div className="space-y-5">
          {/* 時給 / 日給目安は STEP1「店舗基本情報」に移動済み。ここはバック・
              控除・備考・支払い方法・保証・ノルマ等の詳細を扱う。 */}
          <Field
            label="バック項目"
            hint="指名バック・同伴バックなど、項目名と金額を入力してください"
          >
            <DynamicPairList
              items={backItems}
              setItems={setBackItems}
              labelPlaceholder="バック名"
              valuePlaceholder="例: 1,000円 / 10%"
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
          <Field label="給与備考">
            <TextArea
              value={salaryNote}
              onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setSalaryNote(e.target.value)}
              placeholder="その他、給与に関する補足情報があれば入力してください"
            />
          </Field>
          <Field label="給与支払い方法">
            <SelectInput
              value={payrollSystemType}
              onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setPayrollSystemType(e.target.value)}
              options={["全額日払い", "日払い可", "月2回", "月末締め翌月払い"]}
              placeholder="選択してください"
            />
          </Field>
          <Field label="給与支払い補足">
            <TextArea
              value={payrollSystemDescription}
              onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setPayrollSystemDescription(e.target.value)}
              placeholder="給与支払いに関する補足（例: 日払い上限5万円まで等）"
              rows={2}
            />
          </Field>
          {/* 保証・ノルマはユーザー画面では給与・待遇カード内に同居するため、
              管理画面も同じセクション内にまとめる。 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
            <Field label="保証期間">
              <TextInput
                value={guaranteePeriod}
                onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
                  setGuaranteePeriod(e.target.value)
                }
                placeholder="例: 3ヶ月"
              />
            </Field>
          </div>
          <Field label="保証詳細">
            <TextArea
              value={guaranteeDetail}
              onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
                setGuaranteeDetail(e.target.value)
              }
              placeholder="保証の具体的な内容を入力してください"
            />
          </Field>
          <Field label="ノルマ情報">
            <TextArea
              value={normaInfo}
              onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setNormaInfo(e.target.value)}
              placeholder="ノルマの有無や内容を入力してください"
            />
          </Field>
        </div>
      </SectionCard>

      <SectionCard title="体入（体験入店）情報" icon={Sparkles}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* BUG-013: 体入時給は単位なしの数値だけ受け付ける。
              表示側 (StoreDetailPage) は数値前提で `.toLocaleString()` を呼ぶ
              ため、`"5,000円"` のような文字列が入ると表示が崩れる。 */}
          <Field label="体入時給（最低額・円）">
            <TextInput
              type="number"
              inputMode="numeric"
              value={trialMinWage}
              onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setTrialMinWage(e.target.value.replace(/[^\d]/g, ""))}
              placeholder="例: 4500"
            />
          </Field>
          <Field label="体入時給（最高額・円）">
            <TextInput
              type="number"
              inputMode="numeric"
              value={trialMaxWage}
              onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setTrialMaxWage(e.target.value.replace(/[^\d]/g, ""))}
              placeholder="例: 6000"
            />
          </Field>
          <Field label="面接可能時間（開始）">
            <TextInput
              value={interviewStart}
              onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setInterviewStart(e.target.value)}
              placeholder="例: 14:00"
            />
          </Field>
          <Field label="面接可能時間（終了）">
            <TextInput
              value={interviewEnd}
              onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setInterviewEnd(e.target.value)}
              placeholder="例: 19:00"
            />
          </Field>
          <Field label="当日体入可否">
            <SelectInput
              value={sameDayTrial}
              onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
                setSameDayTrial(e.target.value)
              }
              options={["可", "不可"]}
            />
          </Field>
        </div>
      </SectionCard>

      {/* 直近の採用実績は体入と一緒に検討できるほうが運営フローに合うので、
          STEP4 から STEP2 (体入) 直後に移動。 */}
      <SectionCard title="直近の採用実績" icon={TrendingUp}>
        <div className="space-y-5">
          {hiringEntries.map((entry, i) => (
            <div
              key={i}
              className="border border-border rounded-xl p-5 space-y-4 bg-muted/20"
            >
              <div className="flex items-center justify-between gap-2">
                {/* BUG-Live-07: 月名を編集可能に。これまで <span> で固定表示
                    だったため、「月を追加」で出る `"2026年3月"` を任意の月に
                    変えられず、過去月の実績を入力できなかった。 */}
                <TextInput
                  value={entry.month}
                  onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
                    const updated = [...hiringEntries];
                    updated[i] = { ...updated[i], month: e.target.value };
                    setHiringEntries(updated);
                  }}
                  placeholder="例: 2026年4月"
                />
                <button
                  onClick={() =>
                    setHiringEntries(
                      hiringEntries.filter((_, idx) => idx !== i)
                    )
                  }
                  className="text-muted-foreground hover:text-destructive transition shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <Field label="採用人数">
                <TextInput
                  type="number"
                  value={entry.count}
                  onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
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
            onClick={() => {
              const now = new Date();
              const defaultMonth = `${now.getFullYear()}年${now.getMonth() + 1}月`;
              setHiringEntries([
                ...hiringEntries,
                { month: defaultMonth, count: "", examples: [] },
              ]);
            }}
            className="flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 transition"
          >
            <Plus className="w-3.5 h-3.5" /> 月を追加
          </button>
          <Field label="直近の合計テキスト">
            <TextInput
              value={hiringTotal}
              onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
                setHiringTotal(e.target.value)
              }
              placeholder="例: 直近5ヶ月で52名採用"
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
          {/* BUG-009: 「店舗紹介文」(description) はユーザー画面に表示位置が無く、
              「お店の特徴テキスト」と二重入力になっていたため UI から外した。
              既存DB値は保持 (state/payload は残してある) ので、必要になれば
              UI を復活させるだけで再開できる。 */}
          <Field label="お店の特徴テキスト">
            <TextArea
              value={featureText}
              onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setFeatureText(e.target.value)}
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
            onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setExpLevel(Number(e.target.value))}
            leftLabel="初心者向け"
            rightLabel="経験者向け"
          />
          <SliderField
            label="雰囲気"
            value={atmosphere}
            onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
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
              {/* BUG-006: ラベル表記をユーザー画面に揃える (JSONキー beauty/cute/glamour/natural は不変)。 */}
              <Field label="綺麗系">
                <TextInput
                  type="number"
                  value={castBijin}
                  onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setCastBijin(e.target.value)}
                />
              </Field>
              <Field label="可愛い系">
                <TextInput
                  type="number"
                  value={castKawaii}
                  onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
                    setCastKawaii(e.target.value)
                  }
                />
              </Field>
              <Field label="派手系">
                <TextInput
                  type="number"
                  value={castGlamour}
                  onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
                    setCastGlamour(e.target.value)
                  }
                />
              </Field>
              <Field label="素人系">
                <TextInput
                  type="number"
                  value={castNatural}
                  onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
                    setCastNatural(e.target.value)
                  }
                />
              </Field>
            </div>
          </div>
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
            onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
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
              onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setDressAdvice(e.target.value)}
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
              onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setDressCode(e.target.value)}
              placeholder="例: フリー / ドレス貸し出しあり"
            />
          </Field>
          <Field label="採用基準">
            <TextArea
              value={hiringCriteria}
              onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
                setHiringCriteria(e.target.value)
              }
              placeholder="採用時に重視するポイントを入力してください"
            />
          </Field>
          <Field
            label="面接サポート対話"
            hint="面接の流れを会話形式で。話者は「面接官 / 応募者」を選択。"
          >
            <DynamicPairList
              items={interviewDialog}
              setItems={setInterviewDialog}
              labelPlaceholder="話者"
              valuePlaceholder="セリフ"
              labelOptions={["面接官", "応募者"]}
              defaultLabel="面接官"
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
              onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setDocNote(e.target.value)}
              placeholder="書類に関する補足情報があれば入力してください"
            />
          </Field>
        </div>
      </SectionCard>

      {/* 勤務スケジュール (シフト) は STEP1「店舗基本情報」に移動済み。 */}
      {/* 直近の採用実績は STEP2「体入（体験入店）情報」直後に移動済み。 */}
    </div>
  );

  const renderStep5 = () => (
    <div className="space-y-6">
      <SectionCard title="ドレスコード（OK / NG）" icon={Star}>
        <div className="space-y-5">
          <Field label="ドレスコード説明" hint="お店で働く際の服装ルール全体を記載してください">
            <TextArea
              value={dressCodeDescription}
              onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setDressCodeDescription(e.target.value)}
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
                    <ImageUrlInput
                      value={item.image_url}
                      onChange={(next) => {
                        const arr = [...dressCodeOk];
                        arr[i] = { ...arr[i], image_url: next };
                        setDressCodeOk(arr);
                      }}
                      kind="dress-code"
                      placeholder="画像URL（任意）または「画像を選択」"
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
                    <ImageUrlInput
                      value={item.image_url}
                      onChange={(next) => {
                        const arr = [...dressCodeNg];
                        arr[i] = { ...arr[i], image_url: next };
                        setDressCodeNg(arr);
                      }}
                      kind="dress-code"
                      placeholder="画像URL（任意）または「画像を選択」"
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

      <SectionCard title="シャンパン情報" icon={Wine}>
        <div className="space-y-5">
          <Field
            label="シャンパン説明"
            hint="シャンパンメニューや注文ルールなどを記載してください"
          >
            <TextArea
              value={champagneDescription}
              onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setChampagneDescription(e.target.value)}
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
                  onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
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
                  onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
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
              {setFeeList.map((item, i) => (
                <div key={i} className="flex gap-2 items-start group">
                  <div className="text-muted-foreground/40 text-xs w-5 text-center shrink-0 pt-3">
                    {i + 1}
                  </div>
                  <input
                    value={item.label}
                    onChange={(e) => {
                      const next = [...setFeeList];
                      next[i] = { ...next[i], label: e.target.value };
                      setSetFeeList(next);
                    }}
                    placeholder="項目名（例: 90分セット）"
                    className="flex-1 px-3.5 py-2.5 rounded-xl border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  />
                  <input
                    value={item.amount}
                    onChange={(e) => {
                      const next = [...setFeeList];
                      next[i] = { ...next[i], amount: e.target.value };
                      setSetFeeList(next);
                    }}
                    placeholder="金額（円）"
                    className="w-32 px-3.5 py-2.5 rounded-xl border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  />
                  <input
                    value={item.note}
                    onChange={(e) => {
                      const next = [...setFeeList];
                      next[i] = { ...next[i], note: e.target.value };
                      setSetFeeList(next);
                    }}
                    placeholder="備考（任意）"
                    className="flex-1 px-3.5 py-2.5 rounded-xl border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  />
                  <button
                    onClick={() => setSetFeeList(setFeeList.filter((_, idx) => idx !== i))}
                    className="p-1.5 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition mt-2"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <button
                onClick={() =>
                  setSetFeeList([...setFeeList, { label: "", amount: "", note: "" }])
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
              onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setSetFeeNotes(e.target.value)}
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
                    onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
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
                    onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
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
                  onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
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
                  onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
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
              onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setTransferDescription(e.target.value)}
              rows={3}
              placeholder="例: 営業終了後、自宅まで無料送迎あり"
            />
          </Field>
          <Field label="送り距離">
            <TextInput
              value={transferKm}
              onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setTransferKm(e.target.value)}
              placeholder="例: 20km圏内"
            />
          </Field>
          <Field
            label="足代テーブル（高級店向け）"
            hint="距離別の足代を設定。空のままなら詳細ページに表示されません。"
          >
            <div className="space-y-2">
              {transferZones.map((z, i) => (
                <div
                  key={i}
                  className="grid grid-cols-12 gap-2 items-center rounded-lg border border-border bg-muted/20 p-2"
                >
                  <input
                    className="col-span-3 rounded-md border border-input bg-background px-2 py-1.5 text-xs"
                    placeholder="ラベル (例: 都内)"
                    value={z.label}
                    onChange={(e) => {
                      const next = [...transferZones];
                      next[i] = { ...next[i], label: e.target.value };
                      setTransferZones(next);
                    }}
                  />
                  <input
                    className="col-span-3 rounded-md border border-input bg-background px-2 py-1.5 text-xs"
                    placeholder="半径 km"
                    value={z.radius_km}
                    onChange={(e) => {
                      const next = [...transferZones];
                      next[i] = { ...next[i], radius_km: e.target.value };
                      setTransferZones(next);
                    }}
                  />
                  <input
                    className="col-span-3 rounded-md border border-input bg-background px-2 py-1.5 text-xs"
                    placeholder="足代 ¥"
                    value={z.fee}
                    onChange={(e) => {
                      const next = [...transferZones];
                      next[i] = { ...next[i], fee: e.target.value };
                      setTransferZones(next);
                    }}
                  />
                  <input
                    type="color"
                    className="col-span-2 h-8 w-full cursor-pointer rounded border border-input bg-background"
                    value={z.color || "#D4AF37"}
                    onChange={(e) => {
                      const next = [...transferZones];
                      next[i] = { ...next[i], color: e.target.value };
                      setTransferZones(next);
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setTransferZones(transferZones.filter((_, idx) => idx !== i))}
                    className="col-span-1 text-xs text-muted-foreground hover:text-destructive"
                    aria-label="削除"
                  >
                    ×
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() =>
                  setTransferZones([
                    ...transferZones,
                    { label: "", radius_km: "", fee: "", color: "#D4AF37" },
                  ])
                }
                className="text-xs text-primary hover:underline"
              >
                + 距離区分を追加
              </button>
            </div>
          </Field>
        </div>
      </SectionCard>

      <SectionCard title="系列店舗" icon={Building2}>
        <Field
          label="紐づけ店舗"
          hint="詳細ページで「系列店舗」として表示する他店舗を選択してください。"
        >
          <div className="space-y-2">
            <select
              value=""
              onChange={(e) => {
                const n = Number(e.target.value);
                if (!n || relatedStoreIds.includes(n)) return;
                setRelatedStoreIds([...relatedStoreIds, n]);
              }}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">+ 系列店を追加</option>
              {storeCandidates
                .filter((s) => !relatedStoreIds.includes(s.id))
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} {s.area ? `（${s.area}）` : ""}
                  </option>
                ))}
            </select>
            {relatedStoreIds.length > 0 && (
              <ul className="flex flex-wrap gap-2">
                {relatedStoreIds.map((rid) => {
                  const c = storeCandidates.find((s) => s.id === rid);
                  return (
                    <li
                      key={rid}
                      className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs"
                    >
                      <span>{c?.name ?? `店舗#${rid}`}</span>
                      <button
                        type="button"
                        onClick={() => setRelatedStoreIds(relatedStoreIds.filter((i) => i !== rid))}
                        aria-label="削除"
                        className="text-muted-foreground hover:text-destructive"
                      >
                        ×
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </Field>
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
                onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setStaffName(e.target.value)}
                placeholder="例: 田中"
              />
            </Field>
            <Field label="スタッフ役職">
              <TextInput
                value={staffRole}
                onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setStaffRole(e.target.value)}
                placeholder="例: 店長"
              />
            </Field>
          </div>
          <Field label="コメント">
            <TextArea
              value={staffComment}
              onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
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

      {/* BUG-E08: ここのトグル・優先度 input は state にも save にも繋がって
          おらず、ピックアップを切り替えたつもりでも `pickup_shops` テーブルに
          反映されない。連動を実装するまで誤動作させないように、
          編集UIではなく案内パネルだけ残す。 */}
      <SectionCard title="ピックアップ設定" icon={Crown}>
        <div className="space-y-3">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-[12px] text-amber-800 leading-relaxed">
              ピックアップ掲載・PRバッジ・表示優先度の編集は
              「<a href="/admin/content" className="underline font-medium">コンテンツ管理 → ピックアップ店舗</a>」
              から行ってください。
              <br />
              （店舗側からの直接編集UIは未実装のため、ここからは設定できません）
            </p>
          </div>
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
          {/* mx-4: モバイル時の左右余白
              max-h-[85vh]: ビューポート 85% を超えないように
              flex flex-col + overflow on inner list: ヘッダー/説明文は固定、
              店舗リスト部分だけ縦スクロール (店舗数が多くても画面外に行かない) */}
          <div className="relative bg-white rounded-xl shadow-2xl border border-border w-full max-w-md mx-4 p-6 flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between mb-5 shrink-0">
              <h3 className="text-base">既存店舗から複製</h3>
              <button
                onClick={() => setShowCopyModal(false)}
                className="p-1 rounded-lg hover:bg-accent transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground mb-4 shrink-0">
              既存の店舗データをベースに新しい店舗を作成できます。
              <br />
              複製後に各項目を編集してください。
            </p>
            <div className="space-y-2 overflow-y-auto -mx-2 px-2">
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
                  <div className="w-9 h-9 rounded-lg bg-primary/5 text-primary flex items-center justify-center text-xs shrink-0">
                    {shop.name[0]}
                  </div>
                  <span className="text-sm">{shop.name}</span>
                  <Copy className="w-4 h-4 text-muted-foreground ml-auto opacity-0 group-hover:opacity-100 transition shrink-0" />
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
                  lat,
                  lng,
                  nearest_station: station,
                  category: category,
                  business_hours: openingTime && closingTime ? `${openingTime}〜${closingTime}` : "",
                  opening_time: openingTime || null,
                  closing_time: closingTime || null,
                  holidays: holiday,
                  shift_info: shiftInfo || null,
                  phone: phone,
                  website_url: website,
                  hourly_min: minWage ? Number(minWage) : null,
                  hourly_max: maxWage ? Number(maxWage) : null,
                  daily_estimate: dailyPay || null,
                  back_items: backItems
                    .filter((b) => b.label)
                    .map((b) => ({ label: b.label, amount: b.value })),
                  fee_items: feeItems
                    .filter((f) => f.label)
                    .map((f) => ({ label: f.label, amount: f.value })),
                  salary_notes: salaryNote,
                  guarantee_period: guaranteePeriod,
                  guarantee_details: guaranteeDetail,
                  norma_info: normaInfo,
                  trial_hourly_min: trialMinWage || null,
                  trial_hourly_max: trialMaxWage || null,
                  interview_hours: interviewStart && interviewEnd ? `${interviewStart}〜${interviewEnd}` : "",
                  interview_start: interviewStart || null,
                  interview_end: interviewEnd || null,
                  same_day_trial: sameDayTrial === "可",
                  feature_tags: tags,
                  description: description,
                  features_text: featureText,
                  images: storeImages.length > 0 ? storeImages.map((url, i) => ({ url, order: i })) : null,
                  // Preview consumes the same `videos` shape as the public API.
                  videos: videos
                    .filter((v) => v.video_url.trim() !== "")
                    .map((v, i) => ({
                      video_url: v.video_url.trim(),
                      label: v.label.trim() || null,
                      description: v.description.trim() || null,
                      poster_url: null,
                      display_order: i,
                    })),
                  video_url: videos.find((v) => v.video_url.trim() !== "")?.video_url ?? null,
                  staff_photos: staffPhotos
                    .filter((p) => p.image_url.trim() !== "")
                    .map((p, i) => ({
                      image_url: p.image_url.trim(),
                      caption: p.caption.trim() || null,
                      instagram_url: p.instagram_url.trim() || null,
                      staff_type: p.staff_type.trim() || null,
                      display_order: i,
                    })),
                  analysis: {
                    experience_level: expLevel,
                    atmosphere: atmosphere,
                    cast_style: {
                      beauty: Number(castBijin) || 0,
                      cute: Number(castKawaii) || 0,
                      glamour: Number(castGlamour) || 0,
                      natural: Number(castNatural) || 0,
                    },
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
                        // UI: label="面接官"/"応募者", value=セリフ。
                        // DB / StoreDetail 表示は speaker:"staff"|"user" で
                        // 左右振り分けするので、ここで変換する。
                        dialog: interviewDialog.map((d) => ({
                          text: d.value,
                          speaker:
                            d.label === "面接官" || d.label === "staff"
                              ? "staff"
                              : d.label === "応募者" || d.label === "user"
                                ? "user"
                                : d.label,
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
                  set_fee: (setFeeList.some((it) => it.label || it.amount) || setFeeNotes)
                    ? {
                        items: setFeeList
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

// ---------------------------------------------------------------------------
// VideoListEditor — 動画の複数登録 UI
// ---------------------------------------------------------------------------
//
// 動画は store_videos に 1 件 1 行で保存される。
// ここでは「URL / ラベル / 説明」を 1 行のカードで編集し、上下ボタンで並び替え、
// ✕ で削除、＋ボタンで新規追加できる。並び順 = display_order。
//
// 保存はフォーム本体の save() で他フィールドと一緒に POST/PUT される。
// （別エンドポイント不要 — Admin StoreController が videos[] を受け取って syncVideos() する）
function VideoListEditor({
  videos,
  onChange,
}: {
  videos: { video_url: string; label: string; description: string }[];
  onChange: (next: { video_url: string; label: string; description: string }[]) => void;
}) {
  const update = (i: number, patch: Partial<{ video_url: string; label: string; description: string }>) => {
    onChange(videos.map((v, idx) => (idx === i ? { ...v, ...patch } : v)));
  };
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= videos.length) return;
    const next = [...videos];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  const remove = (i: number) => {
    onChange(videos.filter((_, idx) => idx !== i));
  };
  const add = () => {
    onChange([...videos, { video_url: "", label: "", description: "" }]);
  };

  return (
    <div className="space-y-3">
      {videos.length === 0 && (
        <p className="text-[12px] text-muted-foreground">
          動画はまだ登録されていません。下のボタンから追加できます。
        </p>
      )}

      {videos.map((video, i) => (
        <div
          key={i}
          className="rounded-lg border border-border bg-white p-3 space-y-2.5"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <span
                className="inline-flex items-center justify-center rounded-md bg-foreground/5 text-[11px] font-semibold text-foreground/70 px-1.5 py-0.5"
                aria-label={`動画 ${i + 1}`}
              >
                #{i + 1}
              </span>
              <span className="text-[11px] text-muted-foreground">
                表示順は上から
              </span>
            </div>
            <div className="flex items-center gap-1">
              {/* 1 行のみの場合、上下移動は意味がないため非表示 */}
              {videos.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => move(i, -1)}
                    disabled={i === 0}
                    aria-label="この動画を1つ上へ"
                    className="p-1.5 rounded-md hover:bg-foreground/5 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ChevronUp className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => move(i, 1)}
                    disabled={i === videos.length - 1}
                    aria-label="この動画を1つ下へ"
                    className="p-1.5 rounded-md hover:bg-foreground/5 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ChevronDown className="size-4" />
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={() => remove(i)}
                aria-label="この動画を削除"
                className="p-1.5 rounded-md hover:bg-red-50 text-red-500"
              >
                <X className="size-4" />
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <div>
              <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                動画URL（YouTube / .mp4 直リンク）
              </label>
              <TextInput
                value={video.video_url}
                onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => update(i, { video_url: e.target.value })}
                placeholder="例: https://youtube.com/watch?v=... または https://example.com/video.mp4"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                ラベル（任意・例: 店内ツアー / 店長インタビュー）
              </label>
              <TextInput
                value={video.label}
                onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => update(i, { label: e.target.value })}
                placeholder="動画の見出しになります（空でも可）"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                説明テキスト（任意・動画の下に表示）
              </label>
              <TextArea
                value={video.description}
                onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => update(i, { description: e.target.value })}
                rows={2}
                placeholder="動画の補足説明。改行は反映されます。"
              />
            </div>
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={add}
        className="inline-flex items-center gap-1.5 text-[12px] font-medium text-foreground/70 hover:text-foreground px-3 py-2 rounded-md border border-dashed border-border hover:bg-foreground/5 transition-colors"
      >
        <Plus className="size-3.5" />
        動画を追加
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// StaffPhotosEditor — 在籍女性ギャラリーの編集 UI
// ---------------------------------------------------------------------------
//
// 画像URL（外部URLまたはアップロード済の /storage/... パス）、
// キャプション、staff_type バッジ、インスタプロフURLを編集できる。
// VideoListEditor と同じパターン（全置換 + 上下並び替え + ＋追加）。
function StaffPhotosEditor({
  photos,
  onChange,
}: {
  photos: { image_url: string; caption: string; instagram_url: string; staff_type: string }[];
  onChange: (next: { image_url: string; caption: string; instagram_url: string; staff_type: string }[]) => void;
}) {
  const { uploadFile, uploading, error: uploadError } = useFileUpload("staff-photo");

  const update = (
    i: number,
    patch: Partial<{ image_url: string; caption: string; instagram_url: string; staff_type: string }>,
  ) => {
    onChange(photos.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));
  };

  const handlePick = async (i: number, file: File) => {
    const url = await uploadFile(file);
    if (url) update(i, { image_url: url });
  };
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= photos.length) return;
    const next = [...photos];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  const remove = (i: number) => {
    onChange(photos.filter((_, idx) => idx !== i));
  };
  const add = () => {
    onChange([
      ...photos,
      { image_url: "", caption: "", instagram_url: "", staff_type: "" },
    ]);
  };

  return (
    <div className="space-y-3">
      {photos.length === 0 && (
        <p className="text-[12px] text-muted-foreground">
          在籍女性の写真はまだ登録されていません。下のボタンから追加できます。
        </p>
      )}

      {photos.map((photo, i) => (
        <div
          key={i}
          className="rounded-lg border border-border bg-white p-3 space-y-2.5"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <span
                className="inline-flex items-center justify-center rounded-md bg-foreground/5 text-[11px] font-semibold text-foreground/70 px-1.5 py-0.5"
                aria-label={`スタッフ写真 ${i + 1}`}
              >
                #{i + 1}
              </span>
              {photo.image_url && (
                <span
                  aria-hidden
                  className="inline-block rounded overflow-hidden"
                  style={{ width: 28, height: 28, background: "#0E1316" }}
                >
                  <img
                    src={photo.image_url}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {/* 1 行のみの場合、上下移動は意味がないため非表示 */}
              {photos.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => move(i, -1)}
                    disabled={i === 0}
                    aria-label="この写真を1つ上へ"
                    className="p-1.5 rounded-md hover:bg-foreground/5 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ChevronUp className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => move(i, 1)}
                    disabled={i === photos.length - 1}
                    aria-label="この写真を1つ下へ"
                    className="p-1.5 rounded-md hover:bg-foreground/5 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ChevronDown className="size-4" />
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={() => remove(i)}
                aria-label="この写真を削除"
                className="p-1.5 rounded-md hover:bg-red-50 text-red-500"
              >
                <X className="size-4" />
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <div>
              <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                画像URL
              </label>
              <div className="flex gap-2 items-start">
                <div className="flex-1">
                  <TextInput
                    value={photo.image_url}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => update(i, { image_url: e.target.value })}
                    placeholder="例: https://example.com/photo.jpg"
                  />
                </div>
                {/* S3 upload (Phase: media S3): 選択 -> upload -> 返ってきた URL を field にセット */}
                <label
                  className="shrink-0 inline-flex items-center justify-center gap-1 px-3 py-2 rounded-lg border border-border bg-white text-[12px] cursor-pointer hover:bg-accent transition disabled:opacity-50"
                  aria-disabled={uploading}
                >
                  <Upload className="w-3.5 h-3.5" />
                  {uploading ? "アップ中..." : "画像を選択"}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploading}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) await handlePick(i, file);
                      e.target.value = ""; // 同じファイル再選択を許可
                    }}
                  />
                </label>
              </div>
              {uploadError && (
                <p className="text-[11px] text-red-500 mt-1">{uploadError}</p>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                  ラベル（例: 在籍 / レクタ経由 / OG）
                </label>
                <TextInput
                  value={photo.staff_type}
                  onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => update(i, { staff_type: e.target.value })}
                  placeholder="任意"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                  Instagram URL（任意）
                </label>
                <TextInput
                  value={photo.instagram_url}
                  onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => update(i, { instagram_url: e.target.value })}
                  placeholder="https://instagram.com/..."
                />
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                キャプション（任意）
              </label>
              <TextInput
                value={photo.caption}
                onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => update(i, { caption: e.target.value })}
                placeholder="例: 在籍2年・お酒に強くなくてもOK"
              />
            </div>
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={add}
        className="inline-flex items-center gap-1.5 text-[12px] font-medium text-foreground/70 hover:text-foreground px-3 py-2 rounded-md border border-dashed border-border hover:bg-foreground/5 transition-colors"
      >
        <Plus className="size-3.5" />
        在籍女性の写真を追加
      </button>
    </div>
  );
}
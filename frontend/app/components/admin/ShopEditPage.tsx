import { useState, useCallback, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router";
import { api } from "~/lib/api";
import { useShopImages } from "~/hooks/useShopImages";
import { useStepProgression } from "~/hooks/useStepProgression";
import { useFileUpload } from "~/hooks/useFileUpload";
import { ImageCropDialog } from "~/components/admin/ImageCropDialog";
import { formToPayload, storeToForm, type ShopForm } from "~/hooks/useShopForm";
import type { Store } from "~/lib/types";
import { trialDailyEstimate } from "~/lib/wage";
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
} from "lucide-react";
import { FloatingPreview } from "./shared/FloatingPreview";
import { ShopPhonePreview } from "./ShopPhonePreview";
import StoreMap from "~/components/shared/StoreMap";
import StoreDetailPage from "~/components/user/StoreDetailPage";
import type { StoreDetailResponse } from "~/components/user/StoreDetailPage";

// --- Step Definitions ---
interface StepConfig {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  gradient: string;
  sections: { id: string; title: string; icon: React.ComponentType<{ className?: string }>; required?: boolean }[];
}

// 6 ステップ構成。ユーザー画面 (StoreDetailPage) の上から下への並びに
// 揃えて、運営がプレビューを見ながら上から順に入力できるようにしてある。
//
//   STEP1 店舗情報            ←→ ユーザー画面「【店名】の特徴は？」
//   STEP2 画像・動画          ←→ 動画 / 店内写真 / 在籍女性ギャラリー
//   STEP3 報酬・体入          ←→ 報酬・待遇 / 体験入店情報
//   STEP4 分析・面接          ←→ お店の分析 / 面接情報 (必要書類含む)
//   STEP5 価格・サービス      ←→ 送り・足代 / ボトル / セット / ドレス / レクタ
//   STEP6 コミュニケーション・公開 ←→ FAQ / スタッフ / 系列 + 運営用 (ピックアップ / 公開)
const steps: StepConfig[] = [
  {
    id: "step1",
    title: "店舗情報",
    subtitle: "基本情報・体入・特徴",
    icon: Building2,
    gradient: "from-indigo-500 to-violet-500",
    sections: [
      { id: "basic", title: "店舗基本情報", icon: Building2, required: true },
      { id: "trial", title: "体入（体験入店）情報", icon: Sparkles },
      { id: "features", title: "店舗の特徴", icon: Star },
    ],
  },
  {
    id: "step2",
    title: "画像・動画",
    subtitle: "店舗画像・動画・在籍女性ギャラリー",
    icon: ImageIcon,
    gradient: "from-pink-500 to-rose-500",
    sections: [
      { id: "images", title: "店舗画像・動画", icon: ImageIcon },
    ],
  },
  {
    id: "step3",
    title: "報酬・採用実績",
    subtitle: "報酬の内訳と採用実績 (体入は STEP1)",
    icon: DollarSign,
    gradient: "from-emerald-500 to-teal-500",
    sections: [
      { id: "salary", title: "報酬・待遇", icon: DollarSign, required: true },
      { id: "hiring", title: "直近の採用実績", icon: TrendingUp },
    ],
  },
  {
    id: "step4",
    title: "分析・面接",
    subtitle: "お店の分析・面接情報・必要書類",
    icon: BarChart3,
    gradient: "from-amber-500 to-orange-500",
    sections: [
      { id: "analysis", title: "店舗分析", icon: BarChart3 },
      { id: "interview", title: "面接・採用", icon: UserCheck },
      { id: "documents", title: "必要書類", icon: FileText },
    ],
  },
  {
    id: "step5",
    title: "価格・サービス",
    subtitle: "送り・ボトル・セット・ドレス・エピソード",
    icon: Wine,
    gradient: "from-sky-500 to-blue-500",
    sections: [
      { id: "transport", title: "送り・交通サポート", icon: Car },
      { id: "champagne_info", title: "シャンパン情報", icon: Wine },
      { id: "champagne_price", title: "シャンパン金額", icon: Wine },
      { id: "set_fee", title: "セット料金", icon: DollarSign },
      { id: "dress_code", title: "ドレスコード", icon: Star },
      { id: "recta_episodes", title: "レクタ経由エピソード", icon: Sparkles },
    ],
  },
  {
    id: "step6",
    title: "コミュニケーション・公開",
    subtitle: "Q&A・スタッフ・系列・ピックアップ・公開設定",
    icon: MessageSquare,
    gradient: "from-fuchsia-500 to-purple-500",
    sections: [
      { id: "qa", title: "Q&A", icon: HelpCircle },
      { id: "staff", title: "スタッフコメント", icon: MessageSquare },
      { id: "related", title: "系列店舗", icon: Building2 },
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

/**
 * HEIC/HEIF (iPhone 標準形式) かどうか。ブラウザは HEIC を canvas で描画できず
 * クライアント側トリミングが失敗するため、これらは生のままアップロードして
 * サーバ側で JPEG 変換させる (= トリミングを迂回する) 判定に使う。
 */
function isHeicFile(f: File): boolean {
  return /\.(heic|heif)$/i.test(f.name) || /hei[cf]/i.test(f.type);
}

/** 給料システム (複数選択)。詳細ロジックは別の備考欄に書く。 */
const PAY_SYSTEM_OPTIONS = [
  "完全時給制",
  "時給+バック",
  "時給+バックor売上の高い方",
  "売上スライド(歩合)制",
  "ポイントスライド制",
  "完全歩合制",
];

/** 給与サイクル。「日払い可」は廃止し、日払いは「日払い上限金額」欄で表現する。 */
const PAYROLL_CYCLE_OPTIONS = [
  "月末締め翌月払い",
  "月1回",
  "月2回",
  "週払い",
  "全額日払い",
];

/** 締め日・支払日の入力欄を出すサイクル (月締め系のみ)。 */
const PAYROLL_CYCLES_WITH_PAYDAY = ["月末締め翌月払い", "月1回", "月2回"];

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

/**
 * 入力もできるドロップダウン (combobox)。候補は datalist で出しつつ、
 * 候補にない値も自由入力できる。営業時間・面接時間など「だいたい決まった
 * 選択肢だが例外も許したい」項目に使う。listId は datalist の id として
 * ページ内で一意である必要がある。
 */
function ComboInput({
  value = "",
  onChange,
  options,
  placeholder = "",
  listId,
}: {
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  options: string[];
  placeholder?: string;
  listId: string;
}) {
  return (
    <>
      <input
        list={listId}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full px-3 py-2 rounded-lg border border-border bg-white text-[13px] focus:outline-none focus:ring-2 focus:ring-foreground/10 focus:border-foreground/30 transition-all placeholder:text-muted-foreground/50"
      />
      <datalist id={listId}>
        {options.map((o: string) => (
          <option key={o} value={o} />
        ))}
      </datalist>
    </>
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
// ImageUrlInput (URL 入力 + 「画像を選択」ボタン)。URL 直貼りだけでなく、
// その場でファイルを選んでアップロードもできる単一画像 URL フィールド。
// レクタ経由エピソードの写真など「URL 欄しかなくて貼りにくい」箇所で使う。
// HEIC/HEIF (iPhone) も選択でき、サーバ側で JPEG に変換される。
function ImageUrlInput({
  value,
  onChange,
  kind,
  placeholder = "https://...",
}: {
  value: string;
  onChange: (url: string) => void;
  kind: string;
  placeholder?: string;
}) {
  const { uploadFile, uploading, error } = useFileUpload(kind);
  return (
    <div>
      <div className="flex gap-2 items-start">
        <div className="flex-1">
          <TextInput
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
          />
        </div>
        <label
          className="shrink-0 inline-flex items-center justify-center gap-1 px-3 py-2 rounded-lg border border-border bg-white text-[12px] cursor-pointer hover:bg-accent transition"
          aria-disabled={uploading}
        >
          <Upload className="w-3.5 h-3.5" />
          {uploading ? "アップ中..." : "画像を選択"}
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/heic,image/heif,.heic,.heif"
            className="hidden"
            disabled={uploading}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file) return;
              const url = await uploadFile(file);
              if (url) onChange(url);
            }}
          />
        </label>
      </div>
      {value && (
        <img
          src={value}
          alt=""
          className="mt-2 h-20 w-20 rounded-lg object-cover border border-border"
        />
      )}
      {error && <p className="mt-1 text-[11px] text-red-500">{error}</p>}
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
        accept="image/png,image/jpeg,image/webp,image/heic,image/heif,.heic,.heif"
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
        PNG, JPG, WEBP, HEIC（最大5MB / iPhoneの写真もOK）
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
        PNG, JPG, WEBP, HEIC（最大5MB / iPhoneの写真もOK）
      </p>
    </div>
  );
}

function SectionCard({
  title,
  icon: Icon,
  required,
  children,
  previewAnchor,
  onFocusEnter,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  required?: boolean;
  children: React.ReactNode;
  /** Floating Preview 内の対応セクションを scrollIntoView するためのキー。
      StoreDetailPage 側の data-preview-anchor 属性と一致する文字列を渡す。 */
  previewAnchor?: string;
  /** SectionCard 内のフィールドに focus が入ったタイミングで呼ばれる。
      ShopEditPage が activePreviewAnchor state を更新し、Floating Preview
      の useEffect 経由で対応 DOM までスクロールする。 */
  onFocusEnter?: (anchor: string) => void;
}) {
  return (
    <div
      className="bg-white border border-border rounded-xl overflow-hidden"
      onFocusCapture={previewAnchor && onFocusEnter
        ? () => onFocusEnter(previewAnchor)
        : undefined}
    >
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

// FloatingPreview は ArticleEditPage でも使うため shared に切り出し済み。
// ここでは import して再利用する (元の inline 実装は削除)。

export function ShopEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  // The /admin/shops/new route renders this component without an :id param,
  // so id will be undefined. Treat both "new" string and missing param as
  // "new shop" mode.
  const isNew = id === "new" || id === undefined;
  // ステップ管理 (currentStep / completedSteps / next/prev/goTo / 進捗計算) は
  // useStepProgression に集約 (Phase 3-1)。stepCount は 6 固定 (上の steps 配列と整合)。
  const stepFlow = useStepProgression(6);
  const { currentStep, completedSteps } = stepFlow;
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  // プレビュー自動スクロール: admin SectionCard に focus が入ったとき
  // 対応する Floating Preview 内のセクション (data-preview-anchor) まで
  // スクロールするための state。
  const [activePreviewAnchor, setActivePreviewAnchor] = useState<string | null>(null);
  const previewScrollRef = useRef<HTMLDivElement | null>(null);
  const handlePreviewFocus = useCallback((anchor: string) => {
    setActivePreviewAnchor(anchor);
  }, []);

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
  const [paySystemTypes, setPaySystemTypes] = useState<string[]>([]);
  const [paySystemNote, setPaySystemNote] = useState("");
  const [backText, setBackText] = useState("");
  const [backItems, setBackItems] = useState<
    { label: string; value: string }[]
  >([]);
  const [feeItems, setFeeItems] = useState<
    { label: string; value: string }[]
  >([]);
  const [salaryNote, setSalaryNote] = useState("");
  const [payrollCycle, setPayrollCycle] = useState("");
  const [payrollPayDay, setPayrollPayDay] = useState("");
  const [dailyPayLimit, setDailyPayLimit] = useState("");
  const [guaranteePeriod, setGuaranteePeriod] = useState("");
  const [guaranteeDetail, setGuaranteeDetail] = useState("");
  const [normaInfo, setNormaInfo] = useState("");
  const [trialMinWage, setTrialMinWage] = useState("");
  const [trialMaxWage, setTrialMaxWage] = useState("");
  const [interviewStart, setInterviewStart] = useState("");
  const [interviewEnd, setInterviewEnd] = useState("");
  // 体入タイプ: 'same_day' (体験確約) / 'normal' (体入可能) / 'none' (体入なし)。
  const [sameDayTrial, setSameDayTrial] = useState<"same_day" | "normal" | "none">("normal");
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
  // 画像 (image_url) は廃止し note のみ。型は将来の互換のため optional 拡張可。
  const [dressCodeOk, setDressCodeOk] = useState<{ note: string }[]>([]);
  const [dressCodeNg, setDressCodeNg] = useState<{ note: string }[]>([]);
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
  /** 表示優先度 (-1000〜1000)。値が大きいほど一覧で上位。デフォルト 0。
   *  string で保持し、submit 時に payload で number 変換。 */
  const [priority, setPriority] = useState<string>("0");
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

  // 店舗ギャラリー画像。通常はアップロード前にブラウザでトリミングするが、
  // HEIC/HEIF (iPhone 標準) はブラウザが canvas で描画できずトリミングできない
  // ため、生のままサーバへ送って JPEG 変換してもらう (= サーバ側変換)。
  const [galleryCropQueue, setGalleryCropQueue] = useState<File[]>([]);

  // 新規店舗 (まだ id がない) では店舗紐付けの画像エンドポイントが使えないため、
  // 親非依存の汎用アップロード (useFileUpload) で URL を取得し storeImages に積む。
  // 保存時に payload の images として店舗本体と一緒に作成する。
  const { uploadFile: uploadGalleryFile, uploading: uploadingGalleryNew } =
    useFileUpload("store-extra");

  // 既存店舗はフックの remove (サーバ側 images を更新)、新規店舗はまだ保存前なので
  // ローカル state から取り除くだけ。
  const handleRemoveShopImage = useCallback(
    (idx: number) => {
      if (isNew) {
        setStoreImages(storeImages.filter((_, i) => i !== idx));
      } else {
        removeShopImage(idx);
      }
    },
    [isNew, storeImages, setStoreImages, removeShopImage],
  );

  // 1 枚アップロードする共通ハンドラ。新規/既存でアップロード先が違うだけで、
  // 結果は storeImages に反映される。トリミング済み JPEG でも生 HEIC でも使える。
  const uploadGalleryImage = useCallback(
    async (file: File) => {
      if (isNew) {
        const url = await uploadGalleryFile(file);
        if (url) setStoreImages((prev) => [...prev, url]);
      } else {
        await uploadShopImages([file]);
      }
    },
    [isNew, uploadGalleryFile, setStoreImages, uploadShopImages],
  );

  const enqueueGalleryFiles = useCallback(
    (files: FileList | File[]) => {
      const arr = Array.from(files);
      // HEIC はトリミングできないので即サーバへ (サーバで JPEG 変換)。
      const heic = arr.filter(isHeicFile);
      // それ以外でブラウザが画像と認識できるものだけトリミングキューへ。
      const cropable = arr.filter(
        (f) => !isHeicFile(f) && f.type.startsWith("image/"),
      );
      if (cropable.length > 0) setGalleryCropQueue(cropable);
      heic.forEach((f) => {
        void uploadGalleryImage(f);
      });
    },
    [uploadGalleryImage],
  );

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
    if (f.paySystemTypes !== undefined) setPaySystemTypes(f.paySystemTypes);
    if (f.paySystemNote !== undefined) setPaySystemNote(f.paySystemNote);
    if (f.backText !== undefined) setBackText(f.backText);
    if (f.backItems !== undefined) setBackItems(f.backItems);
    if (f.feeItems !== undefined) setFeeItems(f.feeItems);
    if (f.salaryNote !== undefined) setSalaryNote(f.salaryNote);
    if (f.payrollCycle !== undefined) setPayrollCycle(f.payrollCycle);
    if (f.payrollPayDay !== undefined) setPayrollPayDay(f.payrollPayDay);
    if (f.dailyPayLimit !== undefined) setDailyPayLimit(f.dailyPayLimit);
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
    if (f.priority !== undefined) setPriority(f.priority);
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
      minWage, maxWage, dailyPay,
      paySystemTypes, paySystemNote, backText,
      payrollCycle, payrollPayDay, dailyPayLimit,
      backItems, feeItems, salaryNote,
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
      priority,
    };
    return formToPayload(form, { storeImages: [], publishStatus });
  }, [
    shopName, area, address, lat, lng, station, category,
    openingTime, closingTime, holiday, phone, website,
    videos, staffPhotos,
    minWage, maxWage, dailyPay,
    paySystemTypes, paySystemNote, backText,
    payrollCycle, payrollPayDay, dailyPayLimit,
    backItems, feeItems, salaryNote,
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
    priority,
    publishStatus,
  ]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    // 必須項目チェック。STEP1 の必須フィールドが揃っていなければ保存しない。
    // これまで required ラベルは付いていたが、未入力でも payload 送信できて
    // しまい、API 側の validation も寛容で通っていた。フロントでまず止める。
    const requiredErrors: string[] = [];
    if (!shopName.trim()) requiredErrors.push("店舗名");
    if (!area) requiredErrors.push("エリア");
    if (!category) requiredErrors.push("業種カテゴリ");
    if (!station.trim()) requiredErrors.push("最寄り駅");
    if (!address.trim()) requiredErrors.push("住所");
    if (!openingTime.trim()) requiredErrors.push("営業時間（開始）");
    if (!closingTime.trim()) requiredErrors.push("営業時間（終了）");
    if (requiredErrors.length > 0) {
      setSaveError(`必須項目が未入力です: ${requiredErrors.join("、")}`);
      setSaving(false);
      // 最初の未入力フィールドへスクロールしたいが、STEP1 にあるので
      // 単純に Step1 へ移動してウィンドウを上に。
      stepFlow.goTo(0);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    try {
      const payload = buildPayload();
      if (isNew) {
        // 新規作成では保存前にアップロード済みの画像 URL を images として
        // 店舗本体と一緒に永続化する (既存店舗は別エンドポイントで管理済み)。
        const createPayload = {
          ...payload,
          images: storeImages.map((url, order) => ({ url, order })),
        };
        const created = await api.post<Store>("/admin/stores", createPayload);
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
  }, [
    isNew, id, buildPayload, navigate, storeImages,
    shopName, area, category, station, address, openingTime, closingTime,
    stepFlow,
  ]);

  // 旧 handleImageUpload / handleImageDelete は useShopImages フックに移管 (Phase 3-1)。
  // 呼び出し側は uploadShopImages / removeShopImage を使う。
  // hook の error は別 state なので、save 結果欄に集約するため effect で saveError に流す。
  useEffect(() => {
    if (shopImageError) setSaveError(shopImageError);
  }, [shopImageError]);

  // プレビュー自動スクロール: activePreviewAnchor が変わったら、Floating
  // Preview 内の data-preview-anchor=ANCHOR を探して scrollIntoView する。
  // preview を開いていないときは何もしない。
  useEffect(() => {
    if (!showPreview || !activePreviewAnchor) return;
    const container = previewScrollRef.current;
    if (!container) return;
    const handle = window.requestAnimationFrame(() => {
      const target = container.querySelector(
        `[data-preview-anchor="${activePreviewAnchor}"]`,
      ) as HTMLElement | null;
      if (!target) return;
      // container は overflow-y-auto。target.offsetTop はネスト次第で正しく
      // ないので getBoundingClientRect で相対距離を出して container.scrollTop
      // に加算する。先頭にちょっと余白を残したいので 24px 引く。
      const cRect = container.getBoundingClientRect();
      const tRect = target.getBoundingClientRect();
      const delta = tRect.top - cRect.top - 24;
      container.scrollTo({ top: container.scrollTop + delta, behavior: "smooth" });
    });
    return () => window.cancelAnimationFrame(handle);
  }, [activePreviewAnchor, showPreview]);

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
    // Step1: 店舗情報 (基本情報 + 特徴)。営業時間 (開始/終了) も必須。
    !!(shopName && area && category && station && address && openingTime && closingTime),
    // Step2: 画像・動画
    storeImages.length > 0 || videos.length > 0 || staffPhotos.length > 0,
    // Step3: 報酬・体入
    !!(minWage && maxWage),
    // Step4: 分析・面接
    !!(hiringCriteria || interviewDialog.length > 0 || expLevel > 0 || atmosphere > 0),
    // Step5: 価格・サービス
    !!(setFeeList.length > 0 || transferDescription || transferZones.length > 0
      || champagneDescription || rectaEpisodes.length > 0
      || dressCodeDescription || dressCodeOk.length > 0 || dressCodeNg.length > 0),
    // Step6: コミュニケーション・公開
    !!(qaItems.length > 0 || staffComment || publishStatus === "published"),
  ];
  const { progress } = stepFlow.computeProgress(stepFilled);

  // --- Step Content Renderers ---
  const renderStep1 = () => (
    <div className="space-y-6">
      <SectionCard title="店舗基本情報" icon={Building2} required previewAnchor="shop-info" onFocusEnter={handlePreviewFocus}>
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
          <Field label="営業時間（開始）" required hint="候補から選択、または直接入力できます">
            <ComboInput
              listId="opening-time-options"
              value={openingTime}
              onChange={(e) => setOpeningTime(e.target.value)}
              options={["19:00", "20:00", "21:00"]}
              placeholder="例: 20:00"
            />
          </Field>
          <Field label="営業時間（終了）" required hint="候補から選択、または直接入力できます">
            <ComboInput
              listId="closing-time-options"
              value={closingTime}
              onChange={(e) => setClosingTime(e.target.value)}
              options={["1:00", "LAST"]}
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
          {/* 給与は「体入時給(最低/最高)」と、そこから自動算出する「体入日給」に
              一本化した (本入店後の通常時給は撤去)。入力欄は下の「体入(体験入店)
              情報」セクションに集約している。シフト/詳細給与 (バック/控除/保証/
              ノルマ等) は STEP2「報酬・待遇」へ。 */}
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
          {/* SEO メタディスクリプションは運営側で書きにくいと判断したため
              入力欄を撤去。バックエンド (StoreResource::resolveMetaDescription)
              で「【エリア】のカテゴリ・店名。時給◯円〜、体入◯円〜。
              features_text 先頭60字」を自動生成して <meta description> に
              出力する。state (seoMetaDescription) は将来運営入力を復活
              させたい時のために残置 (空のまま送信されると自動生成側に
              フォールバック)。 */}
        </div>
      </SectionCard>

      {sectionTrial()}
      {sectionFeatures()}
    </div>
  );

  // 「店舗画像・動画」は新 STEP2 で別レンダラとして使うため切り出し。
  const sectionImages = () => (
    <SectionCard title="店舗画像・動画" icon={ImageIcon} previewAnchor="shop-media" onFocusEnter={handlePreviewFocus}>
      <div className="space-y-5">
        <Field
          label="店舗画像"
          hint="最大10枚まで。1枚目がサムネイルになります。スマホの写真もそのままアップロードできます。"
        >
          {storeImages.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              {storeImages.map((url, idx) => (
                <div key={idx} className="relative group rounded-lg overflow-hidden border border-border bg-muted aspect-video">
                  <img src={url} alt={`店舗画像 ${idx + 1}`} className="w-full h-full object-cover" />
                  {idx === 0 && (
                    <span className="absolute top-1.5 left-1.5 text-[10px] px-1.5 py-0.5 rounded bg-primary text-white">
                      サムネイル
                    </span>
                  )}
                  <button
                    onClick={() => handleRemoveShopImage(idx)}
                    className="absolute top-1.5 right-1.5 w-6 h-6 bg-black/60 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <ImageUploadZone
            onUpload={enqueueGalleryFiles}
            uploading={uploadingImage || uploadingGalleryNew}
          />
          {galleryCropQueue.length > 0 && (
            <ImageCropDialog
              file={galleryCropQueue[0]}
              aspect={16 / 9}
              title={`店舗写真をトリミング（残り ${galleryCropQueue.length} 枚）`}
              onCancel={() => setGalleryCropQueue([])}
              onCropped={async (cropped) => {
                await uploadGalleryImage(cropped);
                setGalleryCropQueue((q) => q.slice(1));
              }}
            />
          )}
        </Field>
        <Field label="動画（複数登録可）">
          <VideoListEditor videos={videos} onChange={setVideos} />
        </Field>
        <Field label="在籍女性ギャラリー（複数登録可）">
          <StaffPhotosEditor photos={staffPhotos} onChange={setStaffPhotos} />
        </Field>
      </div>
    </SectionCard>
  );

  // 体入（体験入店）情報。元 STEP3 にあったが、求職者目線ではユーザー画面
  // 上部に出る情報なので STEP1「店舗情報」末尾に同居させる。中身: 体入時給
  // (最低/最高)、面接可能時間 (開始/終了)、体験確約可否。
  const sectionTrial = () => (
    <SectionCard title="体入（体験入店）情報" icon={Sparkles} previewAnchor="trial" onFocusEnter={handlePreviewFocus}>
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
        {/* 体入日給は手入力せず「体入時給 × 1日4時間」で自動算出する (表示のみ)。
            体入時給を入れると即座に反映される。計算元は lib/wage.ts に一本化。 */}
        <Field
          label="体入日給（自動計算）"
          hint="体入時給 × 1日4時間で自動算出されます（入力不要）"
        >
          <div className="w-full px-3 py-2 rounded-lg border border-dashed border-border bg-muted/40 text-[13px] text-foreground/80 min-h-[38px] flex items-center">
            {trialDailyEstimate(trialMinWage, trialMaxWage) ?? (
              <span className="text-muted-foreground/60">
                体入時給を入力すると表示されます
              </span>
            )}
          </div>
        </Field>
        <Field label="面接可能時間(開始)" hint="候補から選択、または直接入力できます">
          <ComboInput
            listId="interview-start-options"
            value={interviewStart}
            onChange={(e) => setInterviewStart(e.target.value)}
            options={["17:00", "17:30", "18:00"]}
            placeholder="例: 17:00"
          />
        </Field>
        <Field label="面接可能時間(終了)" hint="候補から選択、または直接入力できます">
          <ComboInput
            listId="interview-end-options"
            value={interviewEnd}
            onChange={(e) => setInterviewEnd(e.target.value)}
            options={["20:00", "21:00", "22:00", "23:00"]}
            placeholder="例: 21:00"
          />
        </Field>
        <Field label="体入の種類" hint="店舗詳細やフィルターで「体験確約OK」リボンの出し分けに使用">
          <select
            value={sameDayTrial}
            onChange={(e) =>
              setSameDayTrial(e.target.value as "same_day" | "normal" | "none")
            }
            className="w-full px-3 py-2 rounded-lg border border-border bg-white text-[13px] focus:outline-none focus:ring-2 focus:ring-foreground/10 focus:border-foreground/30 appearance-none transition-all"
          >
            <option value="same_day">体験確約</option>
            <option value="normal">体入可能</option>
            <option value="none">体入なし</option>
          </select>
        </Field>
      </div>
    </SectionCard>
  );

  // === sectionFeatures に続く section helpers ===
  // NOTE: 「店舗の特徴」は renderStep1 末尾 (店舗画像・動画 SectionCard の
  // *直後*) に挿入するが、JSX の構造を最小修正にするため renderStep1 の return
  // 内で別 fragment として組み込まず、renderStep1 を後方互換のため触らない。
  // ユーザー画面 (詳細ページ) の「【店名】の特徴は？」カードと対応させるため、
  // sectionFeatures というレンダラを別出ししておく。
  const sectionFeatures = () => (
    <SectionCard title="店舗の特徴" icon={Star} previewAnchor="shop-info" onFocusEnter={handlePreviewFocus}>
      <div className="space-y-5">
        <Field
          label="特徴タグ"
          hint="日本語変換を確定したあと、もう一度Enterで追加されます"
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
              // IME 変換確定の Enter ではタグ登録しない (isComposing で判定)。
              // 日本語入力中は1回目の Enter = 変換確定、2回目の Enter = 登録、
              // となり「Enter1回で勝手に登録される」誤爆を防ぐ。
              if (
                e.key === "Enter" &&
                !e.nativeEvent.isComposing &&
                tagInput.trim()
              ) {
                e.preventDefault();
                setTags([...tags, tagInput.trim()]);
                setTagInput("");
              }
            }}
            placeholder="タグを入力してEnter（例: 未経験歓迎）"
            className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
        </Field>
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
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <SectionCard title="報酬・待遇" icon={DollarSign} previewAnchor="salary" onFocusEnter={handlePreviewFocus}>
        <div className="space-y-5">
          {/* 時給 / 日給目安は STEP1「店舗基本情報」に移動済み。ここは給料システム・
              バック・引かれ物・備考・サイクル・保証・ノルマ等の詳細を扱う。 */}
          {/* 給料システム (複数選択 + 詳細備考)。売上制/ポイント制なら具体ロジックを備考へ。 */}
          <Field label="給料システム" hint="当てはまるものを選択（複数可）。詳細は下の備考に記載">
            <div className="flex flex-wrap gap-2">
              {PAY_SYSTEM_OPTIONS.map((opt) => {
                const active = paySystemTypes.includes(opt);
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() =>
                      setPaySystemTypes(
                        active
                          ? paySystemTypes.filter((t) => t !== opt)
                          : [...paySystemTypes, opt],
                      )
                    }
                    className={`px-3 py-1.5 rounded-full text-[13px] border transition ${
                      active
                        ? "bg-primary text-white border-primary"
                        : "bg-white text-foreground/70 border-border hover:bg-muted"
                    }`}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          </Field>
          <Field label="給料システムの詳細備考" hint="売上スライド/ポイント制などの具体的な計算ルール">
            <TextArea
              value={paySystemNote}
              onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setPaySystemNote(e.target.value)}
              placeholder="例: 売上の◯%還元。ポイントは1pt=◯円で時給に加算。改行で見やすく書けます。"
              rows={3}
            />
          </Field>
          {/* バックは月本数で変わる複雑な体系もそのまま書けるようフリーテキスト。 */}
          <Field label="バック" hint="同伴/本指名/場内など。改行して自由に記載できます（公開ページにも改行が反映されます）">
            <TextArea
              value={backText}
              onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setBackText(e.target.value)}
              placeholder={"例:\n同伴バック：21:30までに入店\n1回目→5,000円 / 2回目→10,000円 …\n本指名バック：1セット目→3,000円\n場内バック：1,000円/本数"}
              rows={6}
            />
          </Field>
          <Field
            label="引かれ物"
            hint="雑費・送り代など、給与から引かれる項目を入力してください"
          >
            <DynamicPairList
              items={feeItems}
              setItems={setFeeItems}
              labelPlaceholder="引かれ物の名前"
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
          {/* 給与サイクル → 月締め系を選んだら締め日・支払日を条件表示。
              「日払い可」は廃止し、日払いは「日払い上限金額」欄で表す。 */}
          <Field label="給与サイクル">
            <SelectInput
              value={payrollCycle}
              onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setPayrollCycle(e.target.value)}
              options={PAYROLL_CYCLE_OPTIONS}
              placeholder="選択してください"
            />
          </Field>
          {PAYROLL_CYCLES_WITH_PAYDAY.includes(payrollCycle) && (
            <Field label="締め日・支払日" hint="例: 月末締め翌月15日払い / 15日・末日締め">
              <TextInput
                value={payrollPayDay}
                onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setPayrollPayDay(e.target.value)}
                placeholder="例: 月末締め翌月15日払い"
              />
            </Field>
          )}
          <Field label="日払い上限金額" hint="日払いの有無・上限。なければ空欄でOK">
            <TextInput
              value={dailyPayLimit}
              onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setDailyPayLimit(e.target.value)}
              placeholder="例: 30,000円まで / 上限なし / 要相談"
            />
          </Field>
          <Field label="給与支払い補足">
            <TextArea
              value={payrollSystemDescription}
              onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setPayrollSystemDescription(e.target.value)}
              placeholder="給与支払いに関する補足（改行で2行目以降も書けます）"
              rows={2}
            />
          </Field>
          {/* 保証・ノルマはユーザー画面では報酬・待遇カード内に同居するため、
              管理画面も同じセクション内にまとめる。保証詳細は廃止し、永久保証等も
              保証期間にまとめて書く。 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
            <Field label="保証期間" hint="例: 3ヶ月 / 永久保証 など（詳細もここにまとめて記載）">
              <TextInput
                value={guaranteePeriod}
                onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
                  setGuaranteePeriod(e.target.value)
                }
                placeholder="例: 3ヶ月 / 永久保証"
              />
            </Field>
          </div>
          <Field label="ノルマ情報">
            <TextArea
              value={normaInfo}
              onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setNormaInfo(e.target.value)}
              placeholder="ノルマの有無や内容を入力してください"
            />
          </Field>
        </div>
      </SectionCard>

      {/* 体入（体験入店）情報は STEP1「店舗情報」に移動済み (sectionTrial)。 */}
      {/* 直近の採用実績は体入と一緒に検討できるほうが運営フローに合うので、
          STEP4 から STEP3 (報酬・体入) 直後に維持。 */}
      <SectionCard title="直近の採用実績" icon={TrendingUp} previewAnchor="trial" onFocusEnter={handlePreviewFocus}>
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
      {/* 「店舗の特徴」は STEP1 末尾に移動 (sectionFeatures)。 */}
      <SectionCard title="店舗分析" icon={BarChart3} previewAnchor="analysis" onFocusEnter={handlePreviewFocus}>
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
      <SectionCard title="面接・採用" icon={UserCheck} previewAnchor="interview" onFocusEnter={handlePreviewFocus}>
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

      <SectionCard title="必要書類" icon={FileText} previewAnchor="interview" onFocusEnter={handlePreviewFocus}>
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

  // STEP5 価格・サービス — 送り → ボトル目安 → セット料金 → ドレスコード → レクタ経由
  // (ユーザー画面の順序: 送り足代 / ボトル目安 / セット / レクタ / ドレス)
  const renderStep5 = () => (
    <div className="space-y-6">
      {/* 送り・足代 (ユーザー画面で先に出るので先頭に) */}
      <SectionCard title="送り・交通サポート" icon={Car} previewAnchor="transfer" onFocusEnter={handlePreviewFocus}>
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

      {/* シャンパン情報 (説明文) → シャンパン金額 (4 銘柄) → セット料金 の順で
          単価系を並べる。ユーザー画面でもこの並びになっている。 */}
      <SectionCard title="シャンパン情報" icon={Wine} previewAnchor="champagne" onFocusEnter={handlePreviewFocus}>
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

      <SectionCard title="シャンパン金額（4銘柄）" icon={Wine} previewAnchor="champagne" onFocusEnter={handlePreviewFocus}>
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

      <SectionCard title="セット料金" icon={DollarSign} previewAnchor="set-fee" onFocusEnter={handlePreviewFocus}>
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

      <SectionCard title="ドレスコード（OK / NG）" icon={Star} previewAnchor="dress-code" onFocusEnter={handlePreviewFocus}>
        <div className="space-y-5">
          <Field label="ドレスコード説明" hint="お店で働く際の服装ルール全体を記載してください">
            <TextArea
              value={dressCodeDescription}
              onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setDressCodeDescription(e.target.value)}
              rows={3}
              placeholder="例: ミニドレス着用必須 / 貸し出しドレスあり / 黒ドレス NG"
            />
          </Field>
          <Field label="OKな例" hint="OKな服装の説明をテキストで列挙してください">
            <DynamicTextList
              items={dressCodeOk.map((d) => d.note)}
              setItems={(notes) => setDressCodeOk(notes.map((n) => ({ note: n })))}
              placeholder="例: 明るめのカラードレス"
            />
          </Field>
          <Field label="NGな例" hint="NGな服装の説明をテキストで列挙してください">
            <DynamicTextList
              items={dressCodeNg.map((d) => d.note)}
              setItems={(notes) => setDressCodeNg(notes.map((n) => ({ note: n })))}
              placeholder="例: 黒ドレス・ビジュー付き"
            />
          </Field>
        </div>
      </SectionCard>

      {/* シャンパン情報・金額・セット料金は STEP5 上部 (送り直後) に移動済み。 */}

      <SectionCard title="レクタ経由入店女性エピソード" icon={Sparkles} previewAnchor="recta" onFocusEnter={handlePreviewFocus}>
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
              <Field label="写真（URL貼り付け or アップロード・任意）">
                <ImageUrlInput
                  kind="store-extra"
                  value={ep.photo_url}
                  placeholder="https://... または「画像を選択」"
                  onChange={(url) => {
                    const next = [...rectaEpisodes];
                    next[i] = { ...next[i], photo_url: url };
                    setRectaEpisodes(next);
                  }}
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
    </div>
  );

  // STEP6 コミュニケーション・公開 — Q&A → スタッフコメント → 系列店舗 → ピックアップ → 公開設定
  const renderStep6 = () => (
    <div className="space-y-6">
      <SectionCard title="Q&A" icon={HelpCircle} previewAnchor="qa" onFocusEnter={handlePreviewFocus}>
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

      <SectionCard title="スタッフコメント" icon={MessageSquare} previewAnchor="staff" onFocusEnter={handlePreviewFocus}>
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

      <SectionCard title="系列店舗" icon={Building2} previewAnchor="related" onFocusEnter={handlePreviewFocus}>
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
          <Field
            label="表示優先度"
            hint="一覧の「おすすめ順」で並べる際の優先度。値が大きいほど上位に表示されます。範囲: -1000〜1000。デフォルト 0。"
          >
            <input
              type="number"
              min={-1000}
              max={1000}
              step={10}
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-32 px-3 py-2 rounded-lg border border-border bg-white text-[13px] focus:outline-none focus:ring-2 focus:ring-foreground/10 focus:border-foreground/30 transition-all tabular-nums"
            />
          </Field>
          {/* 公開開始/終了日時・SEO メタディスクリプション は STEP1 / 他で
              扱うため公開設定からは撤去。日時スケジューラは未実装、SEO は
              STEP1「店舗基本情報」末尾にある。 */}
        </div>
      </SectionCard>
    </div>
  );

  // 新 6 ステップ構成に合わせた renderers のマッピング:
  //   新 STEP1 店舗情報            → 旧 renderStep1 (基本情報 + sectionFeatures)
  //   新 STEP2 画像・動画          → sectionImages のみ
  //   新 STEP3 報酬・体入          → 旧 renderStep2 (報酬・体入・採用実績)
  //   新 STEP4 分析・面接          → 旧 renderStep3 (店舗分析) + 旧 renderStep4 (面接 + 必要書類)
  //   新 STEP5 価格・サービス      → renderStep5
  //   新 STEP6 コミュ・公開        → renderStep6
  const renderStepImages = () => (
    <div className="space-y-6">{sectionImages()}</div>
  );
  const renderStepAnalysisInterview = () => (
    <>
      {renderStep3()}
      {renderStep4()}
    </>
  );
  const stepRenderers = [
    renderStep1,
    renderStepImages,
    renderStep2,
    renderStepAnalysisInterview,
    renderStep5,
    renderStep6,
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
                {/* Scrollable content (admin focus 時にここを scroll させる) */}
                <div ref={previewScrollRef} className="flex-1 overflow-y-auto overscroll-contain pt-8">
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
                  // 体入タイプを enum string でそのまま渡す (プレビュー表示側は
                  // trial_type を読む)。同期保存時に backend が same_day_trial
                  // (JSONB) に書き込む。
                  trial_type: sameDayTrial,
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
                  // BUG-Live-11: プレビューで距離別足代マップが出なかったのは
                  // ここで transfer_zones を previewData に乗せていなかったため。
                  // 地図表示条件は (zones.length > 0 && lat && lng)。
                  transfer_zones: transferZones
                    .filter((z) => z.label.trim() || z.radius_km.trim() || z.fee.trim())
                    .map((z) => ({
                      label: z.label.trim() || null,
                      radius_km: z.radius_km.trim()
                        ? (Number(z.radius_km) || z.radius_km.trim())
                        : null,
                      fee: z.fee.trim()
                        ? (Number(z.fee.replace(/[^\d.-]/g, "")) || z.fee.trim())
                        : null,
                      color: z.color.trim() || null,
                    })),
                  unit_wage_type: null,
                  dress_code: dressCodeDescription || dressCodeOk.length > 0 || dressCodeNg.length > 0
                    ? {
                        description: dressCodeDescription || undefined,
                        // 画像 (image_url) は廃止。note のみ。
                        ok_examples: dressCodeOk
                          .filter((e) => e.note)
                          .map((e) => ({ note: e.note })),
                        ng_examples: dressCodeNg
                          .filter((e) => e.note)
                          .map((e) => ({ note: e.note })),
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
                {/* 実サイトはボトムタブバー (トップ/一覧/LINEで相談) を撤去し
                    右下フローティング (UserFab) に移行済み。プレビューでも旧
                    BottomTabBar は描画せず、実際の見た目に合わせる
                    (フローティング fab は viewport 固定要素のため mock 内では再現しない)。 */}
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
            {/* 動画ラベル欄は運用上不要 (レクタ経由などは別枠管理) のため撤去。
                既存データの label は保持され、保存時もそのまま送られる。 */}
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
  // トリミング待ちの選択ファイル (どの行か + File)
  const [pendingCrop, setPendingCrop] = useState<{ index: number; file: File } | null>(null);

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
                    accept="image/*,.heic,.heif"
                    className="hidden"
                    disabled={uploading}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      e.target.value = ""; // 同じファイル再選択を許可
                      if (!file) return;
                      // HEIC はブラウザでトリミングできないので生のままアップロード
                      // (サーバで JPEG 変換)。それ以外はトリミングダイアログへ。
                      if (isHeicFile(file)) {
                        void handlePick(i, file);
                      } else {
                        setPendingCrop({ index: i, file });
                      }
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

      {pendingCrop && (
        <ImageCropDialog
          file={pendingCrop.file}
          aspect={3 / 4}
          title="スタッフ写真をトリミング"
          onCancel={() => setPendingCrop(null)}
          onCropped={async (cropped) => {
            const idx = pendingCrop.index;
            setPendingCrop(null);
            await handlePick(idx, cropped);
          }}
        />
      )}
    </div>
  );
}
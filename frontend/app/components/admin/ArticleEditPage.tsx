import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { ArrowLeft, Eye, ImagePlus, Loader2, Save, Trash2, X, Search } from "lucide-react";
import { ApiError, api } from "~/lib/api";
import type { Article, Paginated } from "~/lib/types";
import { ArticleEditor } from "./ArticleEditor";
import { ImageCropDialog } from "./ImageCropDialog";
import { FloatingPreview } from "./shared/FloatingPreview";
import { ColumnArticleView } from "~/routes/user/column-detail";

// status は backend で 'draft' | 'published' に正規化されているが、
// 生成型 (ArticleResource) では string となっている。フォーム側はゆるく
// string で受けて、UI 側の <select> の value 列挙でガードする。
interface FormState {
  title: string;
  slug: string;
  excerpt: string;
  category: string;
  section: string;       // C2: コラムTOPの大テーマ
  tags: string;          // comma-separated UI input
  status: string;
  thumbnail_url: string | null;
}

const EMPTY_FORM: FormState = {
  title: "",
  slug: "",
  excerpt: "",
  category: "",
  section: "",
  tags: "",
  status: "draft",
  thumbnail_url: null,
};

const COMMON_CATEGORIES = [
  "業界解説",
  "店舗特集",
  "上京サポート",
  "ノルマ・お給料",
  "面接対策",
  "その他",
];

/** C2: コラムTOP 上段ナビの大テーマ（backend Article::SECTIONS と一致させる）。 */
const SECTIONS = ["夜の始め方", "エリア別比較", "地方から上京", "Q&A"];

/**
 * コラムTOP「探すハブ」のファセットを動かすタグ。記事にこのタグを付けると、
 * 該当ファセット（条件 / エリア / 業種 / 働き方で探す）の絞り込みに出る。
 * フロントの columns.tsx FACET_TAGS と一致させること。
 */
const FACET_TAG_GROUPS: { label: string; tags: string[] }[] = [
  { label: "条件", tags: ["未経験歓迎", "日払いOK", "ノルマなし", "高時給", "送りあり"] },
  { label: "エリア", tags: ["渋谷", "新宿", "歌舞伎町", "六本木", "銀座", "池袋"] },
  { label: "業種", tags: ["キャバクラ", "ラウンジ", "クラブ", "ガールズバー"] },
  { label: "働き方", tags: ["週1OK", "Wワーク歓迎", "学生歓迎"] },
];

/** C4: 関連店舗ピッカーで保持する軽量サマリ。 */
interface RelatedStoreLite {
  id: number;
  name: string;
  area?: string | null;
}

export function ArticleEditPage() {
  const params = useParams();
  const articleId = params.id ? Number(params.id) : null;
  const isNew = articleId === null;
  const navigate = useNavigate();

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  // 生成型 (ArticleResource.body) は unknown[] | null となるが、実体は
  // TipTap JSON ドキュメント (object)。エディタへの渡し方が JSON 単位なので、
  // ここはルーズに unknown で受けてエディタコンポーネント側の型に任せる。
  const [body, setBody] = useState<Record<string, unknown> | null>(null);
  const [bodyHtml, setBodyHtml] = useState<string>("");
  // C4: この記事で紹介した店舗（手動紐付け）。
  const [relatedStores, setRelatedStores] = useState<RelatedStoreLite[]>([]);
  // 大テーマ候補は管理画面で編集可能（SiteSetting）。初期は固定値、マウント時に最新を取得。
  const [sectionOptions, setSectionOptions] = useState<string[]>(SECTIONS);
  useEffect(() => {
    let active = true;
    api
      .get<{ sections: { name: string }[] }>("/admin/columns/sections")
      .then((r) => {
        if (active) setSectionOptions(r.sections.map((s) => s.name));
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [pendingThumb, setPendingThumb] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // プレビュー用の article オブジェクト。フォーム値と editor の bodyHtml から
  // 公開ページと同じ構造を作る。実 API のレスポンスとは違って都度生成なので、
  // 一部の運用フィールド (id, slug, published_at) は仮値で埋める。
  const previewArticle = useMemo<Article>(
    () => ({
      id: articleId ?? 0,
      slug: form.slug || "preview",
      title: form.title || "（タイトル未入力）",
      excerpt: form.excerpt || null,
      category: form.category || null,
      section: form.section || null,
      related_store_ids: relatedStores.map((s) => s.id),
      related_stores: relatedStores.map((s) => ({
        id: s.id,
        name: s.name,
        slug: null,
        area: s.area ?? null,
        category: null,
        image: null,
      })),
      tags: form.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      status: form.status as Article["status"],
      thumbnail_url: form.thumbnail_url,
      body: body as Article["body"],
      body_html: bodyHtml,
      author_id: null,
      char_count: "0",
      published_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as unknown as Article),
    [articleId, form, body, bodyHtml],
  );

  // Load when editing
  useEffect(() => {
    if (isNew || !articleId) return;
    let active = true;
    (async () => {
      try {
        const a = await api.get<Article>(`/admin/articles/${articleId}`);
        if (!active) return;
        setForm({
          title: a.title,
          slug: a.slug,
          excerpt: a.excerpt ?? "",
          category: a.category ?? "",
          section: a.section ?? "",
          tags: (a.tags ?? []).join(", "),
          status: a.status,
          thumbnail_url: a.thumbnail_url,
        });
        setRelatedStores(
          ((a.related_stores ?? []) as RelatedStoreLite[]).map((s) => ({
            id: s.id,
            name: s.name,
            area: s.area,
          })),
        );
        setBody((a.body as Record<string, unknown> | null) ?? null);
        setBodyHtml(a.body_html ?? "");
      } catch (e) {
        console.error("Failed to load article", e);
        setError("記事の読み込みに失敗しました");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [isNew, articleId]);

  const handleEditorChange = useCallback(
    (json: Record<string, unknown>, html: string) => {
      setBody(json);
      setBodyHtml(html);
    },
    [],
  );

  async function handleSave(nextStatus?: "draft" | "published") {
    if (!form.title.trim()) {
      setError("タイトルを入力してください");
      return;
    }
    setSaving(true);
    setError(null);

    const payload: Record<string, unknown> = {
      title: form.title.trim(),
      slug: form.slug.trim() || null,
      excerpt: form.excerpt.trim() || null,
      category: form.category.trim() || null,
      section: form.section.trim() || null,
      related_store_ids: relatedStores.map((s) => s.id),
      tags: form.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      status: nextStatus ?? form.status,
      body,
      body_html: bodyHtml,
      thumbnail_url: form.thumbnail_url,
    };

    try {
      if (isNew) {
        const created = await api.post<Article>("/admin/articles", payload);
        navigate(`/admin/articles/${created.id}/edit`, { replace: true });
        setForm((f) => ({ ...f, slug: created.slug, status: created.status }));
      } else {
        const updated = await api.put<Article>(`/admin/articles/${articleId}`, payload);
        setForm((f) => ({ ...f, slug: updated.slug, status: updated.status }));
      }
    } catch (e) {
      if (e instanceof ApiError) {
        const errs = (e.data as { errors?: Record<string, string[]> }).errors;
        if (errs) {
          const firstKey = Object.keys(errs)[0];
          setError(`${firstKey}: ${errs[firstKey][0]}`);
        } else {
          setError(e.message);
        }
      } else {
        setError("保存に失敗しました");
      }
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!articleId) return;
    if (!confirm("この記事を削除しますか？この操作は取り消せません。")) return;
    try {
      await api.delete(`/admin/articles/${articleId}`);
      navigate("/admin/articles");
    } catch (e) {
      console.error(e);
      setError("削除に失敗しました");
    }
  }

  async function handleThumbnailUpload(file: File) {
    if (isNew) {
      setError("先に下書き保存してから画像をアップロードしてください");
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("image", file);
      const res = await api.upload<{ thumbnail_url: string }>(
        `/admin/articles/${articleId}/thumbnail`,
        fd,
      );
      setForm((f) => ({ ...f, thumbnail_url: res.thumbnail_url }));
    } catch (e) {
      console.error(e);
      setError("サムネイルのアップロードに失敗しました");
    } finally {
      setUploading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => navigate("/admin/articles")}
            className="p-1.5 rounded-md hover:bg-muted transition text-muted-foreground"
            title="戻る"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="min-w-0">
            <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700 }}>
              {isNew ? "新規コラム" : "コラム編集"}
            </h2>
            <p className="text-[12px] text-muted-foreground mt-0.5 truncate">
              {form.slug ? `/columns/${form.slug}` : "保存後にURLが確定します"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isNew && (
            <button
              onClick={handleDelete}
              className="flex items-center gap-1.5 px-3 py-2 text-rose-600 hover:bg-rose-50 rounded-lg text-[13px] transition"
            >
              <Trash2 className="w-4 h-4" />
              削除
            </button>
          )}
          <button
            onClick={() => setShowPreview((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-2 border border-border rounded-lg text-[13px] hover:bg-muted transition"
            aria-pressed={showPreview}
          >
            <Eye className="w-4 h-4" />
            {showPreview ? "プレビュー閉じる" : "プレビュー"}
          </button>
          <button
            disabled={saving}
            onClick={() => handleSave("draft")}
            className="px-3.5 py-2 border border-border rounded-lg text-[13px] hover:bg-muted transition disabled:opacity-50"
          >
            下書き保存
          </button>
          <button
            disabled={saving}
            onClick={() => handleSave("published")}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 text-white rounded-lg text-[13px] hover:bg-indigo-700 transition disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            公開
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[13px] text-rose-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5">
        {/* Main editor column */}
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-xl p-4 space-y-3">
            <label className="block text-[12px] text-muted-foreground">タイトル</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="例: キャバクラとラウンジの違いとは？"
              className="w-full px-3 py-2 rounded-lg border border-border bg-white text-[15px] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
            />
            <label className="block text-[12px] text-muted-foreground">
              抜粋（カード・SEO用）
            </label>
            <textarea
              value={form.excerpt}
              onChange={(e) => setForm((f) => ({ ...f, excerpt: e.target.value }))}
              placeholder="一覧カードに表示される短い説明"
              rows={2}
              className="w-full px-3 py-2 rounded-lg border border-border bg-white text-[13px] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
            />
          </div>

          <div className="bg-card border border-border rounded-xl">
            <ArticleEditor initialContent={body} onChange={handleEditorChange} />
          </div>
        </div>

        {/* Sidebar */}
        <aside className="space-y-4">
          {/* Status */}
          <div className="bg-card border border-border rounded-xl p-4 space-y-3">
            <label className="block text-[12px] text-muted-foreground">ステータス</label>
            <select
              value={form.status}
              onChange={(e) =>
                setForm((f) => ({ ...f, status: e.target.value as FormState["status"] }))
              }
              className="w-full px-3 py-2 rounded-lg border border-border bg-white text-[13px] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
            >
              <option value="draft">下書き</option>
              <option value="published">公開</option>
            </select>
          </div>

          {/* Slug */}
          <div className="bg-card border border-border rounded-xl p-4 space-y-2">
            <label className="block text-[12px] text-muted-foreground">スラッグ（URL）</label>
            <input
              type="text"
              value={form.slug}
              onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
              placeholder="kyabakura-vs-lounge"
              className="w-full px-3 py-2 rounded-lg border border-border bg-white text-[13px] font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
            />
            <p className="text-[11px] text-muted-foreground">
              空欄ならタイトルから自動生成。半角英数とハイフンのみ。
            </p>
          </div>

          {/* Category */}
          <div className="bg-card border border-border rounded-xl p-4 space-y-2">
            <label className="block text-[12px] text-muted-foreground">カテゴリ</label>
            <input
              list="article-categories"
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              placeholder="業界解説 / 店舗特集 など"
              className="w-full px-3 py-2 rounded-lg border border-border bg-white text-[13px] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
            />
            <datalist id="article-categories">
              {COMMON_CATEGORIES.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>

          {/* Section (C2): コラムTOP 上段ナビの大テーマ */}
          <div className="bg-card border border-border rounded-xl p-4 space-y-2">
            <label className="block text-[12px] text-muted-foreground">大テーマ（コラムTOP上段ナビ）</label>
            <select
              value={form.section}
              onChange={(e) => setForm((f) => ({ ...f, section: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-border bg-white text-[13px] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
            >
              <option value="">（未設定）</option>
              {/* 現在の値がリストから削除済みでも編集中は選択肢に残す（値を失わない）。 */}
              {(form.section && !sectionOptions.includes(form.section)
                ? [form.section, ...sectionOptions]
                : sectionOptions
              ).map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <p className="text-[11px] text-muted-foreground">
              大テーマの追加・削除は「コラム管理」画面の「大テーマを管理」から行えます。
            </p>
          </div>

          {/* Related stores (C4): この記事で紹介した店舗 */}
          <RelatedStorePicker value={relatedStores} onChange={setRelatedStores} />

          {/* Tags */}
          <div className="bg-card border border-border rounded-xl p-4 space-y-2">
            <label className="block text-[12px] text-muted-foreground">タグ</label>
            <input
              type="text"
              value={form.tags}
              onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
              placeholder="キャバクラ, ラウンジ, 体入"
              className="w-full px-3 py-2 rounded-lg border border-border bg-white text-[13px] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
            />
            <p className="text-[11px] text-muted-foreground">
              カンマ区切りで複数指定。下のタグはコラムTOPの「探すハブ」（条件/エリア/業種/働き方で探す）の絞り込みに使われます。クリックで追加・解除。
            </p>
            {(() => {
              const list = form.tags.split(",").map((s) => s.trim()).filter(Boolean);
              const toggle = (t: string) =>
                setForm((f) => {
                  const cur = f.tags.split(",").map((s) => s.trim()).filter(Boolean);
                  const next = cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t];
                  return { ...f, tags: next.join(", ") };
                });
              return (
                <div className="space-y-1.5 pt-1">
                  {FACET_TAG_GROUPS.map((g) => (
                    <div key={g.label} className="flex flex-wrap items-center gap-1">
                      <span className="w-9 shrink-0 text-[10px] text-muted-foreground">{g.label}</span>
                      {g.tags.map((t) => {
                        const on = list.includes(t);
                        return (
                          <button
                            key={t}
                            type="button"
                            onClick={() => toggle(t)}
                            className={`rounded-full border px-2 py-0.5 text-[11px] transition-colors ${
                              on
                                ? "border-indigo-600 bg-indigo-600 text-white"
                                : "border-border bg-white text-foreground hover:border-indigo-300"
                            }`}
                          >
                            {t}
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>

          {/* Thumbnail */}
          <div className="bg-card border border-border rounded-xl p-4 space-y-3">
            <label className="block text-[12px] text-muted-foreground">サムネイル</label>
            {form.thumbnail_url ? (
              <div className="relative">
                <img
                  src={form.thumbnail_url}
                  alt=""
                  className="w-full h-40 object-cover rounded-lg bg-stone-100"
                />
                <button
                  onClick={() => setForm((f) => ({ ...f, thumbnail_url: null }))}
                  className="absolute top-2 right-2 p-1.5 bg-white/90 rounded-md text-rose-600 hover:bg-white transition shadow"
                  title="画像を外す"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="border-2 border-dashed border-stone-200 rounded-lg p-6 flex flex-col items-center justify-center text-center text-[12px] text-muted-foreground">
                <ImagePlus className="w-6 h-6 mb-2 text-stone-400" />
                未設定
              </div>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) setPendingThumb(f);
                if (fileRef.current) fileRef.current.value = "";
              }}
            />
            {pendingThumb && (
              <ImageCropDialog
                file={pendingThumb}
                aspect={16 / 9}
                title="サムネイルをトリミング"
                onCancel={() => setPendingThumb(null)}
                onCropped={async (cropped) => {
                  setPendingThumb(null);
                  await handleThumbnailUpload(cropped);
                }}
              />
            )}
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading || isNew}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 border border-border rounded-lg text-[13px] hover:bg-muted transition disabled:opacity-50"
            >
              {uploading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ImagePlus className="w-4 h-4" />
              )}
              {isNew ? "保存後にアップロード可" : "画像をアップロード"}
            </button>
            <p className="text-[11px] text-muted-foreground">
              または上のURL入力欄に直接URLを貼り付けてください。
            </p>
            <input
              type="text"
              value={form.thumbnail_url ?? ""}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  thumbnail_url: e.target.value.trim() || null,
                }))
              }
              placeholder="画像URL"
              className="w-full px-3 py-2 rounded-lg border border-border bg-white text-[12px] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
            />
          </div>
        </aside>
      </div>

      {/* Floating draggable preview — 公開記事ページ (ColumnArticleView) を
          スマホシェル (390×844, scale 0.8) に詰めて表示。bodyHtml と form 値が
          変わると即時反映される。 */}
      {showPreview && (
        <FloatingPreview onClose={() => setShowPreview(false)}>
          <div className="flex flex-col items-center" style={{ transform: "scale(0.8)", transformOrigin: "top center" }}>
            <div className="w-[390px] bg-black rounded-[48px] p-[10px] shadow-2xl ring-1 ring-white/10">
              <div className="relative bg-[#f7f6f3] rounded-[38px] h-[844px] overflow-hidden flex flex-col">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 z-20 w-[120px] h-[32px] bg-black rounded-b-[20px]" />
                <div className="flex-1 overflow-y-auto overscroll-contain pt-8">
                  <ColumnArticleView article={previewArticle} />
                </div>
              </div>
            </div>
          </div>
        </FloatingPreview>
      )}
    </div>
  );
}

/**
 * C4: 「この記事で紹介した店舗」ピッカー。店舗名で検索して複数紐付ける。
 * 紐付けた店舗は記事末尾に表示され、店舗詳細 → LINE の回遊動線になる。
 */
function RelatedStorePicker({
  value,
  onChange,
}: {
  value: RelatedStoreLite[];
  onChange: (v: RelatedStoreLite[]) => void;
}) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<RelatedStoreLite[]>([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (q.trim().length < 1) {
      setResults([]);
      return;
    }
    let active = true;
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const res = await api.get<Paginated<{ id: number; name: string; area?: string | null }>>(
          `/admin/stores?search=${encodeURIComponent(q.trim())}&per_page=8`,
        );
        if (active) setResults(res.data.map((s) => ({ id: s.id, name: s.name, area: s.area })));
      } catch {
        if (active) setResults([]);
      } finally {
        if (active) setSearching(false);
      }
    }, 250);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [q]);

  const add = (s: RelatedStoreLite) => {
    if (!value.some((v) => v.id === s.id)) onChange([...value, s]);
    setQ("");
    setResults([]);
    setOpen(false);
  };
  const remove = (id: number) => onChange(value.filter((v) => v.id !== id));

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-2">
      <label className="block text-[12px] text-muted-foreground">この記事で紹介した店舗（回遊動線）</label>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((s) => (
            <span
              key={s.id}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-indigo-50 text-indigo-700 text-[12px]"
            >
              {s.name}
              {s.area ? `（${s.area}）` : ""}
              <button type="button" onClick={() => remove(s.id)} className="hover:text-indigo-900">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          placeholder="店舗名で検索して追加"
          className="w-full pl-8 pr-3 py-2 rounded-lg border border-border bg-white text-[13px] focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        />
        {open && q.trim() && (
          <div className="absolute z-10 mt-1 w-full bg-white border border-border rounded-lg shadow-lg max-h-48 overflow-auto">
            {searching ? (
              <div className="px-3 py-2 text-[12px] text-muted-foreground">検索中…</div>
            ) : results.length === 0 ? (
              <div className="px-3 py-2 text-[12px] text-muted-foreground">該当なし</div>
            ) : (
              results.map((s) => (
                <button
                  type="button"
                  key={s.id}
                  onClick={() => add(s)}
                  className="w-full text-left px-3 py-2 text-[13px] hover:bg-muted"
                >
                  {s.name} <span className="text-muted-foreground text-[11px]">{s.area}</span>
                </button>
              ))
            )}
          </div>
        )}
      </div>
      <p className="text-[11px] text-muted-foreground">
        記事末尾に「この記事で紹介した店舗」として表示され、店舗詳細へ誘導します。
      </p>
    </div>
  );
}

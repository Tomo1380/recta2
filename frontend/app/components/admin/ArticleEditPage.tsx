import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { ArrowLeft, ImagePlus, Loader2, Save, Trash2 } from "lucide-react";
import { ApiError, api } from "~/lib/api";
import type { Article } from "~/lib/types";
import { ArticleEditor } from "./ArticleEditor";

interface FormState {
  title: string;
  slug: string;
  excerpt: string;
  category: string;
  tags: string;          // comma-separated UI input
  status: "draft" | "published";
  thumbnail_url: string | null;
}

const EMPTY_FORM: FormState = {
  title: "",
  slug: "",
  excerpt: "",
  category: "",
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

export function ArticleEditPage() {
  const params = useParams();
  const articleId = params.id ? Number(params.id) : null;
  const isNew = articleId === null;
  const navigate = useNavigate();

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [body, setBody] = useState<Record<string, unknown> | null>(null);
  const [bodyHtml, setBodyHtml] = useState<string>("");
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

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
          tags: (a.tags ?? []).join(", "),
          status: a.status,
          thumbnail_url: a.thumbnail_url,
        });
        setBody(a.body ?? null);
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
            <p className="text-[11px] text-muted-foreground">カンマ区切りで複数指定</p>
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
                if (f) handleThumbnailUpload(f);
                if (fileRef.current) fileRef.current.value = "";
              }}
            />
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
    </div>
  );
}

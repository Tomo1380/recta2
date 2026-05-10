import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { ArrowLeft, Loader2, Save, Trash2 } from "lucide-react";
import { api, ApiError } from "~/lib/api";
import type { FineTuningQa } from "./FineTuningQaPage";

interface FormState {
  category: string;
  question: string;
  answer: string;
  tags: string; // comma-separated UI input
  source: string;
  status: "active" | "draft" | "archived";
}

const EMPTY_FORM: FormState = {
  category: "",
  question: "",
  answer: "",
  tags: "",
  source: "manual",
  status: "active",
};

export function FineTuningQaEditPage() {
  const params = useParams();
  const qaId = params.id ? Number(params.id) : null;
  const isNew = qaId === null;
  const navigate = useNavigate();

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isNew || !qaId) return;
    let active = true;
    (async () => {
      try {
        const qa = await api.get<FineTuningQa>(
          `/admin/fine-tuning/qa/${qaId}`,
        );
        if (!active) return;
        setForm({
          category: qa.category ?? "",
          question: qa.question,
          answer: qa.answer,
          tags: (qa.tags ?? []).join(", "),
          source: qa.source ?? "manual",
          status: qa.status,
        });
      } catch (e) {
        console.error("Failed to load Q&A", e);
        setError("Q&Aの読み込みに失敗しました");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [isNew, qaId]);

  async function handleSave() {
    if (!form.question.trim()) {
      setError("質問を入力してください");
      return;
    }
    if (!form.answer.trim()) {
      setError("回答を入力してください");
      return;
    }
    setSaving(true);
    setError(null);

    const tags = form.tags
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    const payload: Record<string, unknown> = {
      category: form.category.trim() || null,
      question: form.question.trim(),
      answer: form.answer.trim(),
      tags: tags.length > 0 ? tags : null,
      source: form.source.trim() || null,
      status: form.status,
    };

    try {
      if (isNew) {
        const created = await api.post<FineTuningQa>(
          `/admin/fine-tuning/qa`,
          payload,
        );
        navigate(`/admin/fine-tuning-qa/${created.id}/edit`, { replace: true });
      } else {
        await api.put<FineTuningQa>(
          `/admin/fine-tuning/qa/${qaId}`,
          payload,
        );
        navigate("/admin/fine-tuning-qa");
      }
    } catch (e) {
      const msg =
        e instanceof ApiError
          ? (e.data?.message as string) ?? "保存に失敗しました"
          : "保存に失敗しました";
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  async function handleArchive() {
    if (isNew || !qaId) return;
    if (!window.confirm("このQ&Aをアーカイブ（非表示）しますか？")) return;
    setArchiving(true);
    try {
      await api.delete(`/admin/fine-tuning/qa/${qaId}`);
      navigate("/admin/fine-tuning-qa");
    } catch (e) {
      console.error("Archive failed", e);
      setError("アーカイブに失敗しました");
    } finally {
      setArchiving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={() => navigate("/admin/fine-tuning-qa")}
          className="flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground transition"
        >
          <ArrowLeft className="w-4 h-4" />
          一覧へ戻る
        </button>
        <div className="flex items-center gap-2">
          {!isNew && (
            <button
              onClick={handleArchive}
              disabled={archiving || saving}
              className="flex items-center gap-1.5 px-3 py-2 bg-white border border-rose-200 text-rose-600 rounded-lg text-[13px] hover:bg-rose-50 transition-all disabled:opacity-50"
            >
              {archiving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
              アーカイブ
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 text-white rounded-lg text-[13px] hover:bg-indigo-700 transition-all disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {isNew ? "作成" : "保存"}
          </button>
        </div>
      </div>

      <div>
        <h2
          style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontWeight: 700,
          }}
        >
          {isNew ? "Q&A 新規作成" : `Q&A 編集 #${qaId}`}
        </h2>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[13px] text-rose-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-[12px] text-muted-foreground mb-1">
            カテゴリ
          </label>
          <input
            type="text"
            value={form.category}
            onChange={(e) =>
              setForm((f) => ({ ...f, category: e.target.value }))
            }
            placeholder="例: 業界知識 / エリア×条件"
            className="w-full px-3 py-2 rounded-lg border border-border bg-white text-[13px] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
          />
        </div>
        <div>
          <label className="block text-[12px] text-muted-foreground mb-1">
            ステータス
          </label>
          <select
            value={form.status}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                status: e.target.value as FormState["status"],
              }))
            }
            className="w-full px-3 py-2 rounded-lg border border-border bg-white text-[13px] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
          >
            <option value="active">active（学習対象）</option>
            <option value="draft">draft（下書き）</option>
            <option value="archived">archived（アーカイブ）</option>
          </select>
        </div>
        <div>
          <label className="block text-[12px] text-muted-foreground mb-1">
            ソース
          </label>
          <input
            type="text"
            value={form.source}
            onChange={(e) =>
              setForm((f) => ({ ...f, source: e.target.value }))
            }
            placeholder="manual / seed-1000 など"
            className="w-full px-3 py-2 rounded-lg border border-border bg-white text-[13px] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
          />
        </div>
      </div>

      <div>
        <label className="block text-[12px] text-muted-foreground mb-1">
          タグ（カンマ区切り）
        </label>
        <input
          type="text"
          value={form.tags}
          onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
          placeholder="例: 六本木, 初心者"
          className="w-full px-3 py-2 rounded-lg border border-border bg-white text-[13px] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
        />
      </div>

      <div>
        <label className="block text-[12px] text-muted-foreground mb-1">
          質問 (user)
        </label>
        <textarea
          value={form.question}
          onChange={(e) =>
            setForm((f) => ({ ...f, question: e.target.value }))
          }
          rows={3}
          className="w-full px-3 py-2 rounded-lg border border-border bg-white text-[13px] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all font-mono"
        />
      </div>

      <div>
        <label className="block text-[12px] text-muted-foreground mb-1">
          回答 (assistant)
        </label>
        <textarea
          value={form.answer}
          onChange={(e) => setForm((f) => ({ ...f, answer: e.target.value }))}
          rows={10}
          className="w-full px-3 py-2 rounded-lg border border-border bg-white text-[13px] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all font-mono leading-relaxed"
        />
        <p className="text-[11px] text-muted-foreground mt-1">
          150〜300字を目安に。改行・複数行可。
        </p>
      </div>
    </div>
  );
}

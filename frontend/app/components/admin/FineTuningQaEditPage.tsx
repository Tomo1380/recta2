import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { ArrowLeft, Loader2, Plus, Save, Search, Trash2, X } from "lucide-react";
import { api, ApiError } from "~/lib/api";
import type { Paginated, Store } from "~/lib/types";
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

// Pull all [STORE:ID] markers (in appearance order, no dedupe).
function extractStoreIds(answer: string): number[] {
  const ids: number[] = [];
  const re = /\[STORE:(\d+)\]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(answer)) !== null) {
    ids.push(Number(m[1]));
  }
  return ids;
}

export interface FineTuningQaEditPageProps {
  /**
   * Embedded mode: instead of using URL params and navigating to other admin
   * routes, accept the QA id (or null for new) as a prop and call back to the
   * host when the user wants to leave the editor (back / saved).
   */
  embedded?: boolean;
  embeddedQaId?: number | null;
  onBack?: () => void;
  /** Called after save/archive succeeds; host should refetch list & exit edit. */
  onSaved?: () => void;
}

export function FineTuningQaEditPage({
  embedded = false,
  embeddedQaId,
  onBack,
  onSaved,
}: FineTuningQaEditPageProps = {}) {
  const params = useParams();
  const navigate = useNavigate();
  const qaId = embedded
    ? (embeddedQaId ?? null)
    : params.id
      ? Number(params.id)
      : null;
  const isNew = qaId === null;

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Stores referenced by [STORE:ID] markers in the current answer text.
  const referencedIds = useMemo(
    () => Array.from(new Set(extractStoreIds(form.answer))),
    [form.answer],
  );
  const [referencedStores, setReferencedStores] = useState<
    Record<number, Store | { id: number; missing: true }>
  >({});

  // Picker modal state
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerQ, setPickerQ] = useState("");
  const [pickerLoading, setPickerLoading] = useState(false);
  const [pickerResults, setPickerResults] = useState<Store[]>([]);
  const [pickerError, setPickerError] = useState<string | null>(null);

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

  // Resolve referenced [STORE:ID] markers to actual stores so we can show names.
  // We only fetch IDs we don't already have cached.
  useEffect(() => {
    const missing = referencedIds.filter((id) => !(id in referencedStores));
    if (missing.length === 0) return;
    let active = true;
    (async () => {
      const updates: Record<number, Store | { id: number; missing: true }> = {};
      for (const id of missing) {
        try {
          const s = await api.get<Store>(`/admin/stores/${id}`);
          if (!active) return;
          updates[id] = s;
        } catch (e) {
          updates[id] = { id, missing: true };
        }
      }
      if (active) setReferencedStores((prev) => ({ ...prev, ...updates }));
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [referencedIds.join(",")]);

  function removeStoreId(id: number) {
    // Strip every occurrence of [STORE:<id>] (with any trailing whitespace) from answer.
    const re = new RegExp(`\\[STORE:${id}\\]\\s*`, "g");
    setForm((f) => ({ ...f, answer: f.answer.replace(re, "") }));
  }

  function appendStoreId(store: Store) {
    setForm((f) => {
      const stationPart = store.nearest_station
        ? `${store.area}/${store.nearest_station}`
        : store.area;
      const wage =
        store.trial_hourly_min && store.trial_hourly_max
          ? `体入時給${store.trial_hourly_min.toLocaleString()}〜${store.trial_hourly_max.toLocaleString()}円`
          : store.trial_hourly_min
            ? `体入時給${store.trial_hourly_min.toLocaleString()}円〜`
            : "";
      const line = `\n・[STORE:${store.id}] ${store.name}（${stationPart}）${wage}`;
      return { ...f, answer: f.answer.trimEnd() + line };
    });
    // Eagerly cache so the chip shows up without a refetch
    setReferencedStores((prev) => ({ ...prev, [store.id]: store }));
  }

  async function openPicker() {
    setPickerOpen(true);
    setPickerError(null);
    if (pickerResults.length === 0) {
      await runPickerSearch("");
    }
  }

  async function runPickerSearch(q: string) {
    setPickerLoading(true);
    setPickerError(null);
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set("search", q.trim());
      params.set("publish_status", "published");
      params.set("per_page", "30");
      const res = await api.get<Paginated<Store>>(
        `/admin/stores?${params.toString()}`,
      );
      setPickerResults(res.data ?? []);
    } catch (e) {
      console.error("Store search failed", e);
      setPickerError("店舗の検索に失敗しました");
    } finally {
      setPickerLoading(false);
    }
  }

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
        if (embedded) {
          if (onSaved) onSaved();
        } else {
          navigate(`/admin/fine-tuning-qa/${created.id}/edit`, {
            replace: true,
          });
        }
      } else {
        await api.put<FineTuningQa>(
          `/admin/fine-tuning/qa/${qaId}`,
          payload,
        );
        if (embedded) {
          if (onSaved) onSaved();
        } else {
          navigate("/admin/fine-tuning-qa");
        }
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
      if (embedded) {
        if (onSaved) onSaved();
      } else {
        navigate("/admin/fine-tuning-qa");
      }
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
          onClick={() => {
            if (embedded && onBack) {
              onBack();
            } else {
              navigate("/admin/fine-tuning-qa");
            }
          }}
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
          150〜300字を目安に。改行・複数行可。回答に
          {" "}<code className="px-1 bg-stone-100 rounded">[STORE:ID]</code>{" "}
          マーカーを書くと、Fine-tuning モードでサーバーが店舗カードに展開します。
        </p>
      </div>

      {/* ────────────────── 店舗マーカー管理セクション ────────────────── */}
      <div className="rounded-xl border border-border bg-white p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-[14px] font-semibold">この回答に出てくる店舗ID</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              回答内の <code className="px-1 bg-stone-100 rounded">[STORE:ID]</code>{" "}
              マーカーから抽出。 Fine-tuning モードで店舗カードとして表示されます。
            </p>
          </div>
          <button
            type="button"
            onClick={openPicker}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-700 text-[12px] hover:bg-indigo-100 transition"
          >
            <Plus className="w-3.5 h-3.5" />
            店舗を追加
          </button>
        </div>

        {referencedIds.length === 0 ? (
          <p className="text-[12px] text-muted-foreground italic">
            まだ店舗マーカーは含まれていません。
          </p>
        ) : (
          <ul className="space-y-1.5">
            {referencedIds.map((id) => {
              const s = referencedStores[id];
              const isMissing = s && "missing" in s && s.missing === true;
              const store = s && !("missing" in s) ? s : null;
              return (
                <li
                  key={id}
                  className={`flex items-center justify-between gap-2 px-3 py-2 rounded-lg border ${
                    isMissing
                      ? "border-amber-200 bg-amber-50"
                      : "border-stone-200 bg-stone-50"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-[13px]">
                      <code className="px-1.5 py-0.5 bg-white border border-stone-200 rounded text-[11px] text-stone-600">
                        [STORE:{id}]
                      </code>
                      {store ? (
                        <span className="font-medium truncate">
                          {store.name}
                        </span>
                      ) : isMissing ? (
                        <span className="text-amber-700 text-[12px]">
                          ⚠ 該当店舗が見つかりません（推論時に黙って除外されます）
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-[12px]">
                          読み込み中…
                        </span>
                      )}
                    </div>
                    {store && (
                      <div className="text-[11px] text-muted-foreground mt-0.5 truncate">
                        {store.area}
                        {store.nearest_station ? ` / ${store.nearest_station}` : ""}
                        {store.trial_hourly_min || store.trial_hourly_max
                          ? ` / 体入時給${(store.trial_hourly_min ?? 0).toLocaleString()}〜${(store.trial_hourly_max ?? 0).toLocaleString()}円`
                          : ""}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeStoreId(id)}
                    className="flex items-center gap-1 px-2 py-1 rounded text-[12px] text-rose-600 hover:bg-rose-50 transition"
                    aria-label={`Remove STORE:${id}`}
                  >
                    <X className="w-3.5 h-3.5" />
                    削除
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* ────────────────── 店舗ピッカー モーダル ────────────────── */}
      {pickerOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setPickerOpen(false);
          }}
        >
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h3 className="text-[14px] font-semibold">店舗を追加</h3>
              <button
                onClick={() => setPickerOpen(false)}
                className="text-stone-400 hover:text-stone-700"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-4 py-3 border-b border-border">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  runPickerSearch(pickerQ);
                }}
                className="relative"
              >
                <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-stone-400" />
                <input
                  type="text"
                  value={pickerQ}
                  onChange={(e) => setPickerQ(e.target.value)}
                  placeholder="店舗名・エリア・最寄り駅で検索"
                  className="w-full pl-8 pr-3 py-2 rounded-lg border border-border bg-white text-[13px] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
                  autoFocus
                />
              </form>
            </div>

            <div className="flex-1 overflow-y-auto px-2 py-2">
              {pickerLoading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />
                </div>
              ) : pickerError ? (
                <div className="text-rose-600 text-[12px] px-3 py-2">
                  {pickerError}
                </div>
              ) : pickerResults.length === 0 ? (
                <div className="text-stone-500 text-[12px] px-3 py-6 text-center">
                  該当する店舗がありません
                </div>
              ) : (
                <ul className="divide-y divide-stone-100">
                  {pickerResults.map((s) => {
                    const already = referencedIds.includes(s.id);
                    return (
                      <li
                        key={s.id}
                        className="flex items-center justify-between gap-2 px-2 py-2 hover:bg-stone-50 rounded"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="text-[13px] font-medium truncate">
                            {s.name}{" "}
                            <span className="text-[11px] text-stone-400 font-normal">
                              #{s.id}
                            </span>
                          </div>
                          <div className="text-[11px] text-muted-foreground truncate">
                            {s.area}
                            {s.nearest_station ? ` / ${s.nearest_station}` : ""}
                            {s.trial_hourly_min || s.trial_hourly_max
                              ? ` / 体入時給${(s.trial_hourly_min ?? 0).toLocaleString()}〜${(s.trial_hourly_max ?? 0).toLocaleString()}円`
                              : ""}
                          </div>
                        </div>
                        <button
                          type="button"
                          disabled={already}
                          onClick={() => {
                            appendStoreId(s);
                            setPickerOpen(false);
                          }}
                          className="px-2.5 py-1 rounded text-[12px] bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
                        >
                          {already ? "追加済み" : "追加"}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

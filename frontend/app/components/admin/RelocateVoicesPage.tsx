import { useCallback, useEffect, useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Save,
  X,
  ChevronUp,
  ChevronDown,
  Eye,
  EyeOff,
  Loader2,
  Plane,
} from "lucide-react";
// orval-generated client (Laravel scramble → OpenAPI → axios-functions).
// 既存 ~/lib/api と ~/lib/types の手書きは段階的にこちら側へ寄せていく。
// この画面が先行サンプル。
import {
  relocateVoiceIndex,
  relocateVoiceStore,
  relocateVoiceUpdate,
  relocateVoiceDestroy,
  relocateVoiceReorder,
} from "../../../orval/generated/relocate-voice";
import type { RelocateVoice } from "../../../orval/generated/api.schemas";

interface Toast {
  message: string;
  type: "success" | "error";
}

interface DraftFields {
  area_from: string;
  area_to: string;
  body: string;
}

const EMPTY_DRAFT: DraftFields = { area_from: "", area_to: "", body: "" };

export function RelocateVoicesPage() {
  const [voices, setVoices] = useState<RelocateVoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState<DraftFields>(EMPTY_DRAFT);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newDraft, setNewDraft] = useState<DraftFields>(EMPTY_DRAFT);
  const [toast, setToast] = useState<Toast | null>(null);

  const showToast = useCallback((message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const fetchVoices = useCallback(async () => {
    try {
      const data = await relocateVoiceIndex();
      setVoices(data);
    } catch (e) {
      console.error(e);
      showToast("取得に失敗しました", "error");
    }
  }, [showToast]);

  useEffect(() => {
    fetchVoices().finally(() => setLoading(false));
  }, [fetchVoices]);

  const startEdit = (voice: RelocateVoice) => {
    setEditingId(voice.id);
    setEditDraft({
      area_from: voice.area_from,
      area_to: voice.area_to,
      body: voice.body,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditDraft(EMPTY_DRAFT);
  };

  const saveEdit = async (id: number) => {
    if (!editDraft.area_from.trim() || !editDraft.area_to.trim() || !editDraft.body.trim()) {
      showToast("すべて入力してください", "error");
      return;
    }
    setSaving(true);
    try {
      await relocateVoiceUpdate(id, editDraft);
      await fetchVoices();
      cancelEdit();
      showToast("更新しました");
    } catch (e) {
      console.error(e);
      showToast("更新に失敗しました", "error");
    } finally {
      setSaving(false);
    }
  };

  const create = async () => {
    if (!newDraft.area_from.trim() || !newDraft.area_to.trim() || !newDraft.body.trim()) {
      showToast("すべて入力してください", "error");
      return;
    }
    setSaving(true);
    try {
      await relocateVoiceStore({
        ...newDraft,
        visible: true,
        display_order: voices.length,
      });
      await fetchVoices();
      setNewDraft(EMPTY_DRAFT);
      setShowAddModal(false);
      showToast("追加しました");
    } catch (e) {
      console.error(e);
      showToast("追加に失敗しました", "error");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: number) => {
    if (!confirm("削除しますか？")) return;
    try {
      await relocateVoiceDestroy(id);
      await fetchVoices();
      showToast("削除しました");
    } catch (e) {
      console.error(e);
      showToast("削除に失敗しました", "error");
    }
  };

  const toggleVisible = async (voice: RelocateVoice) => {
    try {
      await relocateVoiceUpdate(voice.id, { visible: !voice.visible });
      await fetchVoices();
    } catch (e) {
      console.error(e);
      showToast("更新に失敗しました", "error");
    }
  };

  const move = async (index: number, direction: -1 | 1) => {
    const next = index + direction;
    if (next < 0 || next >= voices.length) return;
    const reordered = [...voices];
    [reordered[index], reordered[next]] = [reordered[next], reordered[index]];
    setVoices(reordered);
    try {
      await relocateVoiceReorder({ ids: reordered.map((v) => v.id) });
    } catch (e) {
      console.error(e);
      showToast("並び替えに失敗しました", "error");
      fetchVoices();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
            <Plane className="w-5 h-5 text-amber-700" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">上京者の声</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              上京サポートページに表示する先輩の声を管理します
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-sm rounded-lg hover:bg-slate-800"
        >
          <Plus className="w-4 h-4" />
          新規追加
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
        {voices.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            まだ登録がありません
          </div>
        ) : (
          voices.map((voice, index) => {
            const isEditing = editingId === voice.id;
            return (
              <div key={voice.id} className="p-5">
                <div className="flex items-start gap-3">
                  <div className="flex flex-col items-center gap-1 pt-1">
                    <button
                      onClick={() => move(index, -1)}
                      disabled={index === 0}
                      className="p-0.5 text-slate-400 hover:text-slate-700 disabled:opacity-30"
                      aria-label="上に移動"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <span className="text-[10px] text-slate-400 font-mono">{index + 1}</span>
                    <button
                      onClick={() => move(index, 1)}
                      disabled={index === voices.length - 1}
                      className="p-0.5 text-slate-400 hover:text-slate-700 disabled:opacity-30"
                      aria-label="下に移動"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex-1 min-w-0">
                    {isEditing ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={editDraft.area_from}
                            onChange={(e) => setEditDraft({ ...editDraft, area_from: e.target.value })}
                            placeholder="出身地（例: 北海道）"
                            className="flex-1 px-3 py-1.5 border border-slate-200 rounded-lg text-sm"
                          />
                          <span className="text-slate-400">→</span>
                          <input
                            type="text"
                            value={editDraft.area_to}
                            onChange={(e) => setEditDraft({ ...editDraft, area_to: e.target.value })}
                            placeholder="勤務地（例: 六本木）"
                            className="flex-1 px-3 py-1.5 border border-slate-200 rounded-lg text-sm"
                          />
                        </div>
                        <textarea
                          value={editDraft.body}
                          onChange={(e) => setEditDraft({ ...editDraft, body: e.target.value })}
                          placeholder="本文"
                          rows={3}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm resize-y"
                        />
                      </div>
                    ) : (
                      <div className={voice.visible ? "" : "opacity-50"}>
                        <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                          <span className="font-medium text-slate-700">{voice.area_from}</span>
                          <span>→</span>
                          <span className="font-medium text-slate-700">{voice.area_to}</span>
                          {!voice.visible && (
                            <span className="ml-2 px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 text-[10px]">
                              非公開
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-line">
                          {voice.body}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    {isEditing ? (
                      <>
                        <button
                          onClick={() => saveEdit(voice.id)}
                          disabled={saving}
                          className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg disabled:opacity-50"
                          aria-label="保存"
                        >
                          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg"
                          aria-label="キャンセル"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => toggleVisible(voice)}
                          className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg"
                          aria-label={voice.visible ? "非公開にする" : "公開にする"}
                        >
                          {voice.visible ? (
                            <Eye className="w-4 h-4" />
                          ) : (
                            <EyeOff className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={() => startEdit(voice)}
                          className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg"
                          aria-label="編集"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => remove(voice.id)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                          aria-label="削除"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add modal */}
      {showAddModal && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={() => setShowAddModal(false)}
        >
          <div
            className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold text-slate-900">上京者の声を追加</h2>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newDraft.area_from}
                  onChange={(e) => setNewDraft({ ...newDraft, area_from: e.target.value })}
                  placeholder="出身地（例: 北海道）"
                  className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm"
                />
                <span className="text-slate-400">→</span>
                <input
                  type="text"
                  value={newDraft.area_to}
                  onChange={(e) => setNewDraft({ ...newDraft, area_to: e.target.value })}
                  placeholder="勤務地（例: 六本木）"
                  className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm"
                />
              </div>
              <textarea
                value={newDraft.body}
                onChange={(e) => setNewDraft({ ...newDraft, body: e.target.value })}
                placeholder="本文（例: 面接から入店まで全部オンラインで完結...）"
                rows={4}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm resize-y"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setNewDraft(EMPTY_DRAFT);
                }}
                className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                キャンセル
              </button>
              <button
                onClick={create}
                disabled={saving}
                className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-sm rounded-lg hover:bg-slate-800 disabled:opacity-50"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                追加
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 px-4 py-3 rounded-lg shadow-lg text-sm text-white ${
            toast.type === "success" ? "bg-emerald-600" : "bg-red-600"
          }`}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}

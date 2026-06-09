import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router";
import {
  ArrowLeft,
  Loader2,
  Pencil,
  Check,
  X,
  UserCheck,
  UserX,
  MessageCircle,
  Star,
  Bot,
  ExternalLink,
} from "lucide-react";
import { api } from "~/lib/api";
import type { AdminPerson, PersonShowResponse, PersonProfile, PlacementStatus } from "~/lib/types";
import { PLACEMENT_STATUS_LABELS } from "~/lib/types";
import { ConversationPanel } from "~/components/admin/ConversationPanel";
import { ChatLogItem } from "~/components/admin/ChatLogItem";

/**
 * 人物詳細 (line_user_id 基準・LINEトーク主役)。1ページで完結し、
 * 左カラム = 管理メモ + 口コミ、右カラム = LINEトーク (会話 + 送信)。
 * 友だちのみ (LINEログイン未連携) の相手でも同じ枠組みで扱える (2026-06-07 FB)。
 */
export function PersonDetailPage() {
  const navigate = useNavigate();
  const { lineUserId } = useParams<{ lineUserId: string }>();
  const [person, setPerson] = useState<AdminPerson | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [savingName, setSavingName] = useState(false);

  const [notesDraft, setNotesDraft] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [notesDirty, setNotesDirty] = useState(false);

  const [chatsExpanded, setChatsExpanded] = useState(false);
  const CHATS_COLLAPSED = 3;

  // CRM 属性 (流入種別・気になるエリア・入店進捗・上京希望) の編集ドラフト。
  const [profileDraft, setProfileDraft] = useState<PersonProfile | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);

  const fetchPerson = useCallback(async () => {
    if (!lineUserId) return;
    try {
      setLoading(true);
      const res = await api.get<PersonShowResponse>(`/admin/line-friends/${encodeURIComponent(lineUserId)}`);
      setPerson(res.person);
      setNotesDraft(res.person.admin_notes ?? "");
      setNotesDirty(false);
      setProfileDraft(res.person.profile);
    } catch (err) {
      setError(err instanceof Error ? err.message : "読み込みに失敗しました");
    } finally {
      setLoading(false);
    }
  }, [lineUserId]);

  useEffect(() => {
    fetchPerson();
  }, [fetchPerson]);

  const saveName = async () => {
    if (!lineUserId || savingName) return;
    try {
      setSavingName(true);
      const res = await api.put<PersonShowResponse>(
        `/admin/line-friends/${encodeURIComponent(lineUserId)}/name`,
        { admin_name: nameDraft.trim() || null }
      );
      setPerson(res.person);
      setEditingName(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "表示名の保存に失敗しました");
    } finally {
      setSavingName(false);
    }
  };

  const saveProfile = async () => {
    if (!lineUserId || savingProfile || !profileDraft) return;
    try {
      setSavingProfile(true);
      const res = await api.put<PersonShowResponse>(
        `/admin/line-friends/${encodeURIComponent(lineUserId)}/profile`,
        {
          placement_status: profileDraft.placement_status,
          interested_area: profileDraft.interested_area || null,
          wants_relocation: profileDraft.wants_relocation,
          referral_source: profileDraft.referral_source || null,
        },
      );
      setPerson(res.person);
      setProfileDraft(res.person.profile);
    } catch (err) {
      setError(err instanceof Error ? err.message : "プロフィールの保存に失敗しました");
    } finally {
      setSavingProfile(false);
    }
  };

  const saveNotes = async () => {
    if (!lineUserId || savingNotes) return;
    try {
      setSavingNotes(true);
      const res = await api.put<PersonShowResponse>(
        `/admin/line-friends/${encodeURIComponent(lineUserId)}/notes`,
        { admin_notes: notesDraft.trim() || null }
      );
      setPerson(res.person);
      setNotesDraft(res.person.admin_notes ?? "");
      setNotesDirty(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "メモの保存に失敗しました");
    } finally {
      setSavingNotes(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
      </div>
    );
  }
  if (!person) {
    return <div className="py-16 text-center text-[13px] text-muted-foreground">{error ?? "見つかりませんでした"}</div>;
  }

  const displayName = person.name || person.display_name || "名前なし";

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-[13px] text-red-700 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)}><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Header (full width) */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate("/admin/users")} className="p-2 rounded-lg hover:bg-muted transition">
          <ArrowLeft className="w-5 h-5" />
        </button>
        {person.picture_url ? (
          <img src={person.picture_url} alt="" className="w-12 h-12 rounded-full object-cover" />
        ) : (
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground text-lg">
            {displayName[0]}
          </div>
        )}
        <div className="flex-1 min-w-0">
          {editingName ? (
            <div className="flex items-center gap-1.5">
              <input
                autoFocus
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") saveName(); if (e.key === "Escape") setEditingName(false); }}
                placeholder="管理用の表示名"
                className="px-2 py-1 rounded-md border border-border bg-white text-[15px] focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
              <button onClick={saveName} disabled={savingName} className="p-1.5 rounded-md bg-indigo-600 text-white disabled:opacity-50">
                {savingName ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              </button>
              <button onClick={() => setEditingName(false)} className="p-1.5 rounded-md hover:bg-muted"><X className="w-3.5 h-3.5" /></button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <h2 className="text-[17px] truncate" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700 }}>
                {displayName}
              </h2>
              <button onClick={() => { setNameDraft(person.admin_name ?? ""); setEditingName(true); }} aria-label="表示名を編集" className="p-1 rounded-md hover:bg-muted text-muted-foreground">
                <Pencil className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground flex-wrap mt-0.5">
            {person.admin_name && person.display_name && <span>LINE名: {person.display_name}</span>}
            {person.is_talk ? (
              person.is_following ? (
                <span className="inline-flex items-center gap-0.5 text-emerald-600"><UserCheck className="w-3 h-3" />フォロー中</span>
              ) : (
                <span className="inline-flex items-center gap-0.5 text-red-600"><UserX className="w-3 h-3" />ブロック</span>
              )
            ) : (
              <span className="text-stone-500">トークなし</span>
            )}
            {person.has_account ? (
              <span className="text-indigo-600">ログイン済{person.user?.status ? `（${person.user.status === "active" ? "有効" : "停止"}）` : ""}</span>
            ) : (
              <span className="text-amber-600">LINE未ログイン</span>
            )}
          </div>
        </div>
        {person.line_chat_url && (
          <a
            href={person.line_chat_url}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#06C755] text-white text-[13px] font-medium hover:bg-[#05b34c] transition"
            title="LINE公式アカウントのチャットでこの人に返信"
          >
            <MessageCircle className="w-4 h-4" />
            LINE公式で返信
            <ExternalLink className="w-3.5 h-3.5 opacity-80" />
          </a>
        )}
      </div>

      {/* 2 カラム: 左=管理メモ+口コミ / 右=LINEトーク */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        {/* 左 */}
        <div className="space-y-4">
          {/* 対応状況・属性 (CRM) */}
          {profileDraft && (
            <section className="bg-card border border-border rounded-xl p-4">
              <h3 className="text-[13px] font-bold mb-3">対応状況・属性</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-[12px] text-muted-foreground mb-1">入店進捗</label>
                  <select
                    value={profileDraft.placement_status}
                    onChange={(e) =>
                      setProfileDraft({ ...profileDraft, placement_status: e.target.value as PlacementStatus })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-border bg-white text-[13px] focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    {(Object.keys(PLACEMENT_STATUS_LABELS) as PlacementStatus[]).map((s) => (
                      <option key={s} value={s}>{PLACEMENT_STATUS_LABELS[s]}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[12px] text-muted-foreground mb-1">気になるエリア</label>
                    <input
                      type="text"
                      value={profileDraft.interested_area ?? ""}
                      onChange={(e) => setProfileDraft({ ...profileDraft, interested_area: e.target.value })}
                      placeholder="例: 六本木 / 銀座"
                      className="w-full px-3 py-2 rounded-lg border border-border bg-white text-[13px] focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-[12px] text-muted-foreground mb-1">流入種別</label>
                    <input
                      type="text"
                      value={profileDraft.referral_source ?? ""}
                      onChange={(e) => setProfileDraft({ ...profileDraft, referral_source: e.target.value })}
                      placeholder="例: コラム / SNS / 紹介"
                      className="w-full px-3 py-2 rounded-lg border border-border bg-white text-[13px] focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                </div>
                <label className="flex items-center gap-2 text-[13px] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={profileDraft.wants_relocation}
                    onChange={(e) => setProfileDraft({ ...profileDraft, wants_relocation: e.target.checked })}
                    className="accent-indigo-600"
                  />
                  上京希望
                </label>
                <button
                  onClick={saveProfile}
                  disabled={savingProfile}
                  className="px-3 py-1.5 rounded-lg text-[13px] bg-indigo-600 text-white hover:bg-indigo-700 transition disabled:opacity-50"
                >
                  {savingProfile ? "保存中…" : "保存"}
                </button>
              </div>
            </section>
          )}

          {/* 管理メモ */}
          <section className="bg-card border border-border rounded-xl p-4">
            <h3 className="text-[13px] font-bold mb-2">管理メモ</h3>
            <textarea
              value={notesDraft}
              onChange={(e) => { setNotesDraft(e.target.value); setNotesDirty(true); }}
              rows={3}
              placeholder="この人についての社内メモ（友だちのみの相手でも書けます）"
              className="w-full px-3 py-2 rounded-lg border border-border bg-white text-[13px] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none"
            />
            {notesDirty && (
              <div className="flex justify-end mt-2">
                <button onClick={saveNotes} disabled={savingNotes} className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-[12px] disabled:opacity-50 flex items-center gap-1.5">
                  {savingNotes ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  メモを保存
                </button>
              </div>
            )}
          </section>

          {/* 口コミ */}
          <section className="bg-card border border-border rounded-xl p-4">
            <h3 className="text-[13px] font-bold flex items-center gap-1.5 mb-2">
              <Star className="w-4 h-4 text-amber-400" />
              口コミ{person.has_account ? `（${person.user?.reviews_count ?? 0}件）` : ""}
            </h3>
            {!person.has_account ? (
              <div className="py-4 text-center">
                <p className="text-[13px] text-amber-700 font-medium">LINE未ログイン</p>
                <p className="text-[11.5px] text-muted-foreground mt-1">この相手はLINEログインしていないため、口コミは投稿できません。</p>
              </div>
            ) : person.reviews.length === 0 ? (
              <p className="text-[12px] text-muted-foreground py-2">まだ口コミはありません</p>
            ) : (
              <div className="divide-y divide-border">
                {person.reviews.map((r) => (
                  <div key={r.id} className="py-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[13px] font-medium truncate">{r.store?.name ?? `店舗#${r.store_id}`}</span>
                      <span className="text-[11px] text-amber-500 shrink-0">{"★".repeat(r.rating)}</span>
                    </div>
                    {r.body && <p className="text-[12px] text-muted-foreground mt-0.5 line-clamp-2">{r.body}</p>}
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* AIチャット履歴 (この人=line_user_id の会話。LINEログイン時に紐づく) */}
          {(person.has_account || person.ai_chats.length > 0) && (
            <section className="bg-card border border-border rounded-xl p-4">
              <h3 className="text-[13px] font-bold flex items-center gap-1.5 mb-2">
                <Bot className="w-4 h-4 text-emerald-500" />
                AIチャット履歴{person.ai_chats_total > 0 ? `（${person.ai_chats_total}件）` : ""}
              </h3>
              {person.ai_chats.length === 0 ? (
                <p className="text-[12px] text-muted-foreground py-2">まだAIチャットの履歴はありません</p>
              ) : (
                <>
                  <div className="space-y-2.5">
                    {(chatsExpanded ? person.ai_chats : person.ai_chats.slice(0, CHATS_COLLAPSED)).map((c) => (
                      <ChatLogItem key={c.id} log={c} showUser={false} />
                    ))}
                  </div>
                  {person.ai_chats.length > CHATS_COLLAPSED && (
                    <button
                      onClick={() => setChatsExpanded((v) => !v)}
                      className="mt-2.5 w-full py-2 rounded-lg border border-border text-[12px] text-indigo-600 hover:bg-muted/40 transition"
                    >
                      {chatsExpanded ? "閉じる" : `もっと見る（あと${person.ai_chats.length - CHATS_COLLAPSED}件）`}
                    </button>
                  )}
                  {person.ai_chats_total > person.ai_chats.length && (
                    <p className="mt-1.5 text-[11px] text-muted-foreground text-center">
                      最新{person.ai_chats.length}件を表示（全{person.ai_chats_total}件）
                    </p>
                  )}
                </>
              )}
            </section>
          )}
        </div>

        {/* 右: LINEトーク */}
        <section className="bg-card border border-border rounded-xl overflow-hidden flex flex-col">
          <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-border">
            <MessageCircle className="w-4 h-4 text-emerald-500" />
            <h3 className="text-[13px] font-bold">LINEトーク（{person.messages_total}件）</h3>
          </div>
          <ConversationPanel lineUserId={person.line_user_id} isFollowing={person.is_following} />
        </section>
      </div>
    </div>
  );
}

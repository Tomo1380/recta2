import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router";
import {
  ArrowLeft,
  Loader2,
  Radio,
  Send,
  X,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";
import { api } from "~/lib/api";
import type { LineMessage, Paginated } from "~/lib/types";

export function LineBroadcastPage() {
  const navigate = useNavigate();
  const [messageText, setMessageText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  // Broadcast history
  const [history, setHistory] = useState<LineMessage[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const fetchHistory = useCallback(async () => {
    try {
      setHistoryLoading(true);
      const data = await api.get<{
        friend: null;
        messages: Paginated<LineMessage>;
      }>("/admin/line/friends/broadcast/messages?per_page=20");
      setHistory(data.messages.data);
    } catch {
      // broadcast history might not exist yet, that's fine
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleBroadcast = async () => {
    if (!messageText.trim() || sending) return;

    try {
      setSending(true);
      setError(null);
      setShowConfirm(false);

      await api.post("/admin/line/broadcast", {
        message: messageText.trim(),
      });

      showToast("ブロードキャストを送信しました");

      // Add to local history
      const newMsg: LineMessage = {
        id: Date.now(),
        line_user_id: "broadcast",
        user_id: null,
        direction: "outbound",
        message_type: "text",
        content: messageText.trim(),
        line_message_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setHistory((prev) => [newMsg, ...prev]);
      setMessageText("");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "送信に失敗しました";
      setError(message);
    } finally {
      setSending(false);
    }
  };

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-5">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="bg-emerald-600 text-white px-4 py-2.5 rounded-lg shadow-lg text-[13px] flex items-center gap-2">
            <CheckCircle className="w-3.5 h-3.5" />
            {toastMessage}
          </div>
        </div>
      )}

      {/* Confirm Dialog */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl border border-border shadow-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h3 className="text-[15px] font-semibold">一斉配信の確認</h3>
                <p className="text-[12px] text-muted-foreground">
                  すべての友だちにメッセージが送信されます
                </p>
              </div>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 mb-5 text-[13px] whitespace-pre-wrap max-h-40 overflow-y-auto">
              {messageText}
            </div>
            <div className="flex items-center gap-2 justify-end">
              <button
                onClick={() => setShowConfirm(false)}
                className="px-4 py-2 text-[13px] rounded-lg border border-border hover:bg-muted transition"
              >
                キャンセル
              </button>
              <button
                onClick={handleBroadcast}
                disabled={sending}
                className="px-4 py-2 text-[13px] rounded-lg bg-[#06C755] text-white hover:bg-[#05b04d] transition disabled:opacity-50 flex items-center gap-2"
              >
                {sending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                送信する
              </button>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-[13px] text-red-700 flex items-center justify-between">
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="text-red-400 hover:text-red-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate("/admin/line")}
          className="p-2 rounded-lg hover:bg-muted transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2
            style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontWeight: 700,
            }}
          >
            一斉配信
          </h2>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            すべてのLINE友だちにメッセージを一斉配信
          </p>
        </div>
      </div>

      {/* Compose */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4 max-w-2xl">
        <div>
          <label className="block text-[13px] mb-1.5">メッセージ内容</label>
          <textarea
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            placeholder="配信メッセージを入力..."
            rows={6}
            maxLength={5000}
            className="w-full px-3 py-2 rounded-lg border border-border bg-white text-[13px] focus:outline-none focus:ring-2 focus:ring-[#06C755]/20 focus:border-[#06C755] resize-y"
          />
          <p className="text-[11px] text-muted-foreground mt-1">
            {messageText.length} / 5,000 文字
          </p>
        </div>

        <button
          onClick={() => setShowConfirm(true)}
          disabled={!messageText.trim() || sending}
          className="px-5 py-2.5 bg-[#06C755] text-white rounded-lg text-[13px] hover:bg-[#05b04d] transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <Radio className="w-4 h-4" />
          一斉配信する
        </button>
      </div>

      {/* Broadcast History */}
      <div>
        <h3 className="text-[14px] font-semibold mb-3">配信履歴</h3>
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {historyLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-[13px]">
              配信履歴はまだありません
            </div>
          ) : (
            <div className="divide-y divide-border">
              {history.map((msg) => (
                <div key={msg.id} className="px-5 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="w-8 h-8 rounded-full bg-[#06C755]/10 flex items-center justify-center shrink-0 mt-0.5">
                        <Send className="w-3.5 h-3.5 text-[#06C755]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] whitespace-pre-wrap break-words">
                          {msg.content}
                        </p>
                      </div>
                    </div>
                    <span className="text-[11px] text-muted-foreground shrink-0">
                      {formatDateTime(msg.created_at)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import { useState } from "react";
import { Bot, User as UserIcon, ChevronDown } from "lucide-react";

export interface ChatLogItemData {
  id: number;
  user_message: string;
  ai_response: string;
  page_type?: string | null;
  total_tokens?: number;
  ip_address?: string | null;
  user_name?: string | null;
  created_at?: string | null;
}

const PAGE_TYPE_LABEL: Record<string, string> = { top: "トップ", list: "一覧", detail: "店舗詳細" };

function formatTime(s?: string | null): string {
  if (!s) return "—";
  return new Date(s).toLocaleString("ja-JP", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

/**
 * AIチャット1件 (質問+回答) の表示カード。回答は既定で折りたたみ、クリックで全文展開。
 * 履歴タブと人物詳細の両方で使う。showUser=false なら投稿者名を出さない (本人の詳細用)。
 */
export function ChatLogItem({ log, showUser = true }: { log: ChatLogItemData; showUser?: boolean }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2 text-[11px] text-muted-foreground flex-wrap">
        {log.page_type && <span className="px-1.5 py-0.5 rounded bg-muted">{PAGE_TYPE_LABEL[log.page_type] ?? log.page_type}</span>}
        {showUser && <span>{log.user_name ?? (log.ip_address ? `IP: ${log.ip_address}` : "匿名")}</span>}
        <span className="ml-auto">{formatTime(log.created_at)}{log.total_tokens != null ? ` ・ ${log.total_tokens} tokens` : ""}</span>
      </div>

      <div className="flex items-start gap-2 mb-2">
        <UserIcon className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
        <p className="text-[13px] text-foreground whitespace-pre-wrap">{log.user_message || "（空）"}</p>
      </div>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full text-left rounded-lg bg-muted/40 p-2.5 hover:bg-muted/60 transition"
      >
        <div className="flex items-start gap-2">
          <Bot className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
          <p className={`flex-1 text-[13px] text-muted-foreground whitespace-pre-wrap ${open ? "" : "line-clamp-3"}`}>
            {log.ai_response || "（空）"}
          </p>
          <ChevronDown className={`w-4 h-4 text-muted-foreground shrink-0 mt-0.5 transition-transform ${open ? "rotate-180" : ""}`} />
        </div>
        <span className="block text-[11px] text-indigo-600 mt-1.5 pl-6">{open ? "閉じる" : "全文を表示"}</span>
      </button>
    </div>
  );
}

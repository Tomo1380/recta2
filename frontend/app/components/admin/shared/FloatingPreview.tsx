import { useCallback, useRef, useState, type ReactNode } from "react";
import { GripVertical, X } from "lucide-react";

/**
 * 管理画面用「フロート式ドラッグ可能プレビューパネル」。
 * 右上にスマホシェル想定の小ウィンドウとして浮き、ドラッグで移動できる。
 *
 * 元々 ShopEditPage 内 inline で定義していたが、ArticleEditPage でも
 * 同じ UX を使いたいので shared に切り出した。
 */
export function FloatingPreview({
  children,
  onClose,
}: {
  children: ReactNode;
  onClose: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState(() =>
    typeof window === "undefined"
      ? { x: 0, y: 80 }
      : { x: window.innerWidth - 420, y: 80 },
  );
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
          aria-label="プレビューを閉じる"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      {children}
    </div>
  );
}

export default FloatingPreview;

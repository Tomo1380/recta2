import { useState, type DragEvent } from "react";

/** 配列の要素を from → to へ移動した新しい配列を返す（純粋関数）。 */
export function arrayMove<T>(arr: T[], from: number, to: number): T[] {
  const next = [...arr];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

export interface DragReorder {
  /** ドラッグ中の行 index（なければ null）。表示の薄表示などに使う。 */
  dragIndex: number | null;
  /** ドロップ先としてホバー中の行 index。挿入線ハイライトに使う。 */
  overIndex: number | null;
  /** 各行要素に spread する DnD 用 props。 */
  rowProps: (index: number) => {
    draggable: true;
    onDragStart: (e: DragEvent) => void;
    onDragOver: (e: DragEvent) => void;
    onDrop: (e: DragEvent) => void;
    onDragEnd: () => void;
  };
}

/**
 * ネイティブ HTML5 DnD でリストを並び替えるための汎用フック。
 * ドロップ時に onReorder(from, to) を呼ぶので、呼び出し側で arrayMove して永続化する。
 * （管理画面のピックアップ店舗 / エリア・カテゴリ / 移籍者の声などで共用）
 */
export function useDragReorder(onReorder: (from: number, to: number) => void): DragReorder {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  return {
    dragIndex,
    overIndex,
    rowProps: (index) => ({
      draggable: true,
      onDragStart: (e) => {
        setDragIndex(index);
        e.dataTransfer.effectAllowed = "move";
        // Firefox はデータがないと drag を開始しない。
        e.dataTransfer.setData("text/plain", String(index));
      },
      onDragOver: (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        if (overIndex !== index) setOverIndex(index);
      },
      onDrop: (e) => {
        e.preventDefault();
        const from = dragIndex;
        setDragIndex(null);
        setOverIndex(null);
        if (from !== null && from !== index) onReorder(from, index);
      },
      onDragEnd: () => {
        setDragIndex(null);
        setOverIndex(null);
      },
    }),
  };
}

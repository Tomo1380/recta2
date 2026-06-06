import { useEffect, useRef, useState } from "react";

/**
 * FAB (右下フローティング LINE CTA) を「ユーザーが温まってから」表示するための hook。
 *
 * 背景 (2026-06-06 UX FB #2): LINE 導線が常時多重で押し売り感が強い／逆に無視される
 * (バナー盲) リスク。そこで訪問直後は出さず、興味を示したシグナルが出てから表示する。
 *
 * 「温まった」判定 = 次のどちらか早い方:
 *   - 画面 2 枚分スクロール (読み進めた / ざっと見た)
 *   - 10 秒滞在 (スクロールせず読んでいる人も拾う)
 *
 * 一度温まったら、そのセッション中は出し続ける (sessionStorage で永続)。
 * UserFab は全画面共通の単一コンポーネントなので、どこかで温まれば以後の
 * 画面遷移でも表示が維持される (全画面同じルール)。
 */

const SESSION_KEY = "recta_fab_warmed";

/** 画面何枚分スクロールしたら「温まった」とみなすか。 */
export const WARM_SCROLL_VIEWPORTS = 2;
/** スクロールしなくても何 ms 滞在したら「温まった」とみなすか。 */
export const WARM_DWELL_MS = 10_000;

/**
 * スクロール量が warm 閾値を超えたか判定する純粋関数。
 * viewportH が 0 / 不正なら false (まだ計測できない)。
 */
export function isScrolledEnough(
  scrollY: number,
  viewportH: number,
  viewports: number = WARM_SCROLL_VIEWPORTS,
): boolean {
  return viewportH > 0 && scrollY >= viewportH * viewports;
}

export interface FabWarmUpState {
  /** FAB の LINE ボタンを表示してよいか。 */
  warmed: boolean;
  /** 表示が「今まさに」温まって出たか (= 登場アニメを付ける)。
   *  セッション再訪 (sessionStorage 既設定) で即表示の場合は false。 */
  animate: boolean;
}

export function useFabWarmUp(): FabWarmUpState {
  const [warmed, setWarmed] = useState(false);
  // animate は再描画を起こさず、warmed=true の描画時に読むだけなので ref で持つ。
  const animateRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // 既にこのセッションで温まっていれば即表示 (アニメなし)。
    let already = false;
    try {
      already = window.sessionStorage.getItem(SESSION_KEY) === "1";
    } catch {
      /* sessionStorage 不可 (プライベートモード等) は無視して通常フロー */
    }
    if (already) {
      setWarmed(true);
      return;
    }

    let done = false;
    const warm = () => {
      if (done) return;
      done = true;
      try {
        window.sessionStorage.setItem(SESSION_KEY, "1");
      } catch {
        /* no-op */
      }
      animateRef.current = true; // 生の遷移なので登場アニメを付ける
      setWarmed(true);
      cleanup();
    };

    const onScroll = () => {
      if (isScrolledEnough(window.scrollY, window.innerHeight)) warm();
    };

    const timer = window.setTimeout(warm, WARM_DWELL_MS);
    window.addEventListener("scroll", onScroll, { passive: true });
    // リロードで既に下までスクロール済みのケースを即拾う。
    onScroll();

    function cleanup() {
      window.clearTimeout(timer);
      window.removeEventListener("scroll", onScroll);
    }
    return cleanup;
  }, []);

  return { warmed, animate: animateRef.current };
}

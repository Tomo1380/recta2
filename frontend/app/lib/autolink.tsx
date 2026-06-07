import { Fragment, type ReactNode } from "react";

/** テキスト中の http(s) URL を拾う。キャプチャグループにすることで split 時に URL も配列に残る。 */
const URL_RE = /(https?:\/\/[^\s]+)/g;

/** URL の末尾にくっつきやすい句読点・括弧（日本語文ではスペース無しで続くため）。リンクから除外する。 */
const TRAILING_RE = /[)\]）」』、。,.!?！？]+$/;

/**
 * 管理者が入力したプレーンテキスト中の URL を <a>（別タブ）に変換して React ノードを返す。
 * 改行は変換せず、呼び出し側で `whitespace-pre-wrap` を当てて保持する想定。
 * 生 HTML（dangerouslySetInnerHTML）を使わないので XSS の心配がない。
 */
export function linkify(text: string, linkClassName?: string): ReactNode[] {
  return text.split(URL_RE).map((part, i) => {
    // split + キャプチャグループなので、奇数 index が URL 部分。
    if (i % 2 === 0) return <Fragment key={i}>{part}</Fragment>;

    const trailing = part.match(TRAILING_RE)?.[0] ?? "";
    const url = trailing ? part.slice(0, -trailing.length) : part;
    return (
      <Fragment key={i}>
        <a href={url} target="_blank" rel="noopener noreferrer" className={linkClassName}>
          {url}
        </a>
        {trailing}
      </Fragment>
    );
  });
}

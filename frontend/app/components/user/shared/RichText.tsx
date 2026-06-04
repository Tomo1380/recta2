import { Fragment, type ReactNode } from "react";
import { Link } from "react-router";

/**
 * 店舗の自由記述テキストを「改行保持 + [表示文字](URL) リンク」で描画する。
 *
 * 運営が store-edit のテキストエリアに書いた本文を公開ページに出すときに使う。
 * - 改行 (\n) は <br> として保持する。
 * - `[表示文字](/columns/xxx)` のような Markdown 風リンク記法をアンカーに変換する。
 *   - `/` 始まりは内部リンク (React Router の <Link>、SPA 遷移)。
 *   - `http(s)://` 始まりは外部リンク (新規タブ + rel=noopener)。
 *   - それ以外のスキーム (javascript: 等) はリンク化せず素のテキストにする (XSS 防止)。
 *
 * dangerouslySetInnerHTML は使わず、テキストは React が自動エスケープする。
 */

// [label](url) — label は ] を含まない、url は空白と ) を含まない。
const LINK_RE = /\[([^\]]+)\]\(([^)\s]+)\)/g;

function isSafeUrl(url: string): "internal" | "external" | null {
  if (url.startsWith("/")) return "internal";
  if (/^https?:\/\//i.test(url)) return "external";
  return null;
}

function renderLine(line: string, lineKey: number): ReactNode[] {
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let part = 0;
  LINK_RE.lastIndex = 0;

  while ((match = LINK_RE.exec(line)) !== null) {
    const [full, label, url] = match;
    if (match.index > lastIndex) {
      nodes.push(line.slice(lastIndex, match.index));
    }
    const kind = isSafeUrl(url);
    const key = `${lineKey}-${part++}`;
    if (kind === "internal") {
      nodes.push(
        <Link key={key} to={url} className="text-[#1b6b7d] underline underline-offset-2">
          {label}
        </Link>,
      );
    } else if (kind === "external") {
      nodes.push(
        <a
          key={key}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#1b6b7d] underline underline-offset-2"
        >
          {label}
        </a>,
      );
    } else {
      // 不正/未対応スキームは記法ごと素のテキストとして出す。
      nodes.push(full);
    }
    lastIndex = match.index + full.length;
  }
  if (lastIndex < line.length) {
    nodes.push(line.slice(lastIndex));
  }
  return nodes;
}

export function RichText({
  text,
  className,
}: {
  text?: string | null;
  className?: string;
}) {
  if (text == null || text.trim() === "") return null;
  const lines = text.split(/\r?\n/);
  return (
    <span className={className}>
      {lines.map((line, i) => (
        <Fragment key={i}>
          {i > 0 && <br />}
          {renderLine(line, i)}
        </Fragment>
      ))}
    </span>
  );
}

export default RichText;

/**
 * SEO ヘルパー — meta タグを統一形式で組み立てる。
 *
 * 各 route の `meta()` export から `buildMetaTags()` を呼び出し、
 * title / description / canonical / og:* / twitter:* / robots を
 * 一括で返す。本番ドメインは VITE_SITE_URL (build 時 inline) を優先し、
 * 未設定なら recta.isayama-dev.com にフォールバック。
 *
 * 注意:
 * - React Router v7 の meta() は link タグも返せる
 *   ({ tagName: "link", rel: "canonical", href }) 形式。
 *   name="canonical" の meta は無効なのでこちらを使う。
 * - data が undefined のケース (loader 失敗時) は呼び出し側で fallback を
 *   組み立ててから buildMetaTags() を呼ぶか、関数内 default を使う。
 */

// build 時に Vite が import.meta.env を inline するので SSR/CSR で同じ値になる
const FALLBACK_SITE_URL = "https://recta.isayama-dev.com";

export const SITE_URL: string = (() => {
  const env = (import.meta as { env?: { VITE_SITE_URL?: string } }).env;
  const raw = env?.VITE_SITE_URL?.trim();
  if (!raw) return FALLBACK_SITE_URL;
  return raw.replace(/\/$/, "");
})();

export const SITE_NAME = "Recta";
// default OG 画像: 既存のヒーロー画像を流用 (1200×630 の専用 OG 画像は後日差し替え)。
export const DEFAULT_OG_IMAGE = `${SITE_URL}/hero-top.jpg`;

/**
 * 相対パス (`/stores/1` 等) を絶対 URL に変換する。
 * canonical / og:url 生成に使う。
 *
 * - 既に http(s):// で始まっていればそのまま
 * - 先頭が / でない場合は付与
 * - 末尾 / は削除 (ただし root "/" は維持)
 */
export function absoluteUrl(path: string): string {
  if (!path) return SITE_URL;
  if (/^https?:\/\//.test(path)) return path;
  const prefixed = path.startsWith("/") ? path : `/${path}`;
  if (prefixed === "/") return SITE_URL;
  return `${SITE_URL}${prefixed.replace(/\/$/, "")}`;
}

export interface MetaTagsInput {
  /** ページ title (タブ表示・SERP)。サイト名 " | Recta" は呼び出し側で付与済み想定。 */
  title: string;
  description: string;
  /** 相対パス (`/stores/1` 等)。canonical / og:url に使う。 */
  path: string;
  /** og:image の絶対 URL。未指定なら default OG image。 */
  image?: string | null;
  /** og:type。デフォルト "website"。記事は "article"。 */
  type?: "website" | "article";
  /** og:locale。デフォルト "ja_JP"。 */
  locale?: string;
  /** true なら robots: noindex,nofollow を出す。 */
  noindex?: boolean;
  /** 追加で出したい meta タグ (article:published_time 等)。 */
  extra?: Array<Record<string, string>>;
}

/** React Router v7 の meta export 形式に合わせた tag 配列。 */
export type MetaTag =
  | { title: string }
  | { name: string; content: string }
  | { property: string; content: string }
  | { tagName: "link"; rel: string; href: string };

/**
 * meta タグ配列を組み立てる。React Router v7 の meta() からそのまま return できる。
 *
 * 出力:
 * - title
 * - meta name="description"
 * - link rel="canonical"
 * - og:title / og:description / og:url / og:type / og:image / og:site_name / og:locale
 * - twitter:card / twitter:title / twitter:description / twitter:image
 * - meta name="robots" (noindex 時のみ)
 */
export function buildMetaTags(input: MetaTagsInput): MetaTag[] {
  const {
    title,
    description,
    path,
    image,
    type = "website",
    locale = "ja_JP",
    noindex = false,
    extra = [],
  } = input;

  const canonical = absoluteUrl(path);
  const ogImage = image && image.trim() ? toAbsoluteImage(image) : DEFAULT_OG_IMAGE;

  const tags: MetaTag[] = [
    { title },
    { name: "description", content: description },
    { tagName: "link", rel: "canonical", href: canonical },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:url", content: canonical },
    { property: "og:type", content: type },
    { property: "og:image", content: ogImage },
    { property: "og:site_name", content: SITE_NAME },
    { property: "og:locale", content: locale },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: description },
    { name: "twitter:image", content: ogImage },
  ];

  if (noindex) {
    tags.push({ name: "robots", content: "noindex,nofollow" });
  }

  for (const tag of extra) {
    if ("title" in tag) {
      tags.push({ title: tag.title });
    } else if ("name" in tag && "content" in tag) {
      tags.push({ name: tag.name, content: tag.content });
    } else if ("property" in tag && "content" in tag) {
      tags.push({ property: tag.property, content: tag.content });
    } else if (
      "tagName" in tag &&
      tag.tagName === "link" &&
      "rel" in tag &&
      "href" in tag
    ) {
      tags.push({ tagName: "link", rel: tag.rel, href: tag.href });
    }
  }

  return tags;
}

/**
 * og:image 用に絶対 URL を返す。
 * - http(s):// 始まり → そのまま
 * - /storage/... のような相対パス → SITE_URL を付与
 * - S3 URL (https://...amazonaws.com/...) → そのまま
 */
function toAbsoluteImage(src: string): string {
  if (/^https?:\/\//.test(src)) return src;
  if (src.startsWith("/")) return `${SITE_URL}${src}`;
  return `${SITE_URL}/${src}`;
}

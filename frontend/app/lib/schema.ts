/**
 * JSON-LD 構造化データ生成ヘルパー (schema.org)。
 *
 * 用途:
 * - LocalBusiness / NightClub (店舗詳細)
 * - JobPosting (Google for Jobs)
 * - Article (コラム / 用語集)
 * - FAQPage (Q&A / 用語集)
 * - BreadcrumbList (パンくず)
 * - Organization (全ページ共通、root に出す)
 * - WebSite + SearchAction (トップ)
 *
 * 注入は `<script type="application/ld+json" dangerouslySetInnerHTML={...} />` で
 * React Router の SSR 時に出力させる。`serializeSchema()` は `</script>` を
 * Unicode エスケープして XSS を防ぐ。
 */

import { absoluteUrl, SITE_URL, SITE_NAME, DEFAULT_OG_IMAGE } from "./seo";

// ------------------------------------------------------------
// Utility: XSS 安全な serialization
// ------------------------------------------------------------

/**
 * `<script type="application/ld+json">` の中身として安全な JSON 文字列を返す。
 * `</script>` を `<\/script>` に書き換えることで早期 script 終了攻撃を防ぐ。
 * `<` 全般を Unicode エスケープする方が安全だが、可読性とのトレードオフで
 * `</script>` のみ対象。
 */
export function serializeSchema(schema: unknown): string {
  return JSON.stringify(schema).replace(/<\/script>/gi, "<\\/script>");
}

// ------------------------------------------------------------
// 共通 type aliases
// ------------------------------------------------------------

interface SchemaImage {
  url: string;
  width?: number;
  height?: number;
}

export interface BreadcrumbItem {
  name: string;
  /** 絶対 URL。相対パスは absoluteUrl() で変換しておく。 */
  url?: string;
}

// ------------------------------------------------------------
// Organization (全ページ共通)
// ------------------------------------------------------------

export function buildOrganizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    logo: DEFAULT_OG_IMAGE,
    sameAs: [
      // SNS アカウントを取得したら追加 (Twitter / Instagram 等)
    ],
  };
}

// ------------------------------------------------------------
// WebSite + SearchAction (トップ)
// ------------------------------------------------------------

export function buildWebSiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    potentialAction: {
      "@type": "SearchAction",
      target: `${SITE_URL}/stores?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}

// ------------------------------------------------------------
// BreadcrumbList
// ------------------------------------------------------------

export function buildBreadcrumbSchema(items: BreadcrumbItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      ...(item.url ? { item: item.url } : {}),
    })),
  };
}

// ------------------------------------------------------------
// LocalBusiness / NightClub (店舗詳細)
// ------------------------------------------------------------

export interface LocalBusinessInput {
  name: string;
  /** カテゴリ名 (キャバクラ / ラウンジ / クラブ / ガールズバー / コンカフェ) */
  category?: string | null;
  /** 詳細ページの canonical URL (絶対) */
  url: string;
  /** 住所文字列 (例: "東京都港区六本木3-15-20") */
  address?: string | null;
  area?: string | null;
  lat?: number | null;
  lng?: number | null;
  telephone?: string | null;
  websiteUrl?: string | null;
  /** OG image / 1 枚目の画像 URL (絶対) */
  image?: string | null;
  averageRating?: number | null;
  reviewsCount?: number | null;
  openingHours?: string | null;
}

/**
 * Recta のカテゴリ名 → schema.org タイプ マッピング。
 * NightClub はキャバクラ / クラブ向け、それ以外は EntertainmentBusiness。
 */
function resolveBusinessType(category: string | null | undefined): "NightClub" | "EntertainmentBusiness" {
  if (!category) return "EntertainmentBusiness";
  if (category.includes("キャバクラ") || category.includes("クラブ")) return "NightClub";
  return "EntertainmentBusiness";
}

export function buildLocalBusinessSchema(input: LocalBusinessInput) {
  const type = resolveBusinessType(input.category);
  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": type,
    name: input.name,
    url: input.url,
  };
  if (input.image) schema.image = input.image;
  if (input.telephone) schema.telephone = input.telephone;
  if (input.websiteUrl) schema.sameAs = [input.websiteUrl];
  if (input.address || input.area) {
    schema.address = {
      "@type": "PostalAddress",
      addressCountry: "JP",
      ...(input.area ? { addressRegion: input.area } : {}),
      ...(input.address ? { streetAddress: input.address } : {}),
    };
  }
  if (typeof input.lat === "number" && typeof input.lng === "number") {
    schema.geo = {
      "@type": "GeoCoordinates",
      latitude: input.lat,
      longitude: input.lng,
    };
  }
  // aggregateRating は reviews_count > 0 のときのみ (Google validator 必須)
  if (input.averageRating && input.reviewsCount && input.reviewsCount > 0) {
    schema.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: Number(input.averageRating.toFixed(1)),
      reviewCount: input.reviewsCount,
      bestRating: 5,
      worstRating: 1,
    };
  }
  if (input.openingHours) {
    schema.openingHours = input.openingHours;
  }
  return schema;
}

// ------------------------------------------------------------
// JobPosting (Google for Jobs)
// ------------------------------------------------------------

export interface JobPostingInput {
  storeName: string;
  area?: string | null;
  category?: string | null;
  /** 詳細ページの canonical URL */
  url: string;
  /** ISO date (created_at) */
  datePosted: string;
  /** 必須: 90 日後の validThrough (ISO date) */
  validThrough?: string;
  description: string;
  hourlyMin?: number | null;
  hourlyMax?: number | null;
  address?: string | null;
  image?: string | null;
}

export function buildJobPostingSchema(input: JobPostingInput) {
  const title =
    input.area && input.category
      ? `${input.storeName}（${input.area} / ${input.category}）の求人`
      : input.area
        ? `${input.storeName}（${input.area}）の求人`
        : `${input.storeName}の求人`;
  // 90 日後を validThrough のデフォルト
  const validThrough =
    input.validThrough ??
    new Date(new Date(input.datePosted).getTime() + 90 * 24 * 60 * 60 * 1000).toISOString();

  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title,
    description: input.description,
    datePosted: input.datePosted,
    validThrough,
    employmentType: "PART_TIME",
    industry: "Nightlife / Hospitality",
    hiringOrganization: {
      "@type": "Organization",
      name: input.storeName,
      sameAs: input.url,
    },
    jobLocation: {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        addressCountry: "JP",
        ...(input.area ? { addressRegion: input.area } : {}),
        ...(input.address ? { streetAddress: input.address } : {}),
      },
    },
  };
  if (input.image) schema.image = input.image;
  if (input.hourlyMin || input.hourlyMax) {
    schema.baseSalary = {
      "@type": "MonetaryAmount",
      currency: "JPY",
      value: {
        "@type": "QuantitativeValue",
        ...(input.hourlyMin ? { minValue: input.hourlyMin } : {}),
        ...(input.hourlyMax ? { maxValue: input.hourlyMax } : {}),
        unitText: "HOUR",
      },
    };
  }
  return schema;
}

// ------------------------------------------------------------
// Article (コラム / 用語集)
// ------------------------------------------------------------

export interface ArticleInput {
  headline: string;
  description?: string | null;
  url: string;
  image?: string | null;
  datePublished?: string | null;
  dateModified?: string | null;
  authorName?: string | null;
  category?: string | null;
  tags?: string[] | null;
}

export function buildArticleSchema(input: ArticleInput) {
  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: input.headline,
    url: input.url,
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      logo: {
        "@type": "ImageObject",
        url: DEFAULT_OG_IMAGE,
      },
    },
  };
  if (input.description) schema.description = input.description;
  if (input.image) schema.image = input.image;
  if (input.datePublished) schema.datePublished = input.datePublished;
  if (input.dateModified) schema.dateModified = input.dateModified;
  if (input.authorName) {
    schema.author = { "@type": "Person", name: input.authorName };
  }
  if (input.category) schema.articleSection = input.category;
  if (input.tags && input.tags.length > 0) schema.keywords = input.tags.join(",");
  return schema;
}

// ------------------------------------------------------------
// FAQPage
// ------------------------------------------------------------

export interface FAQEntry {
  question: string;
  answer: string;
}

export function buildFAQSchema(entries: FAQEntry[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: entries.map((e) => ({
      "@type": "Question",
      name: e.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: e.answer,
      },
    })),
  };
}

// ------------------------------------------------------------
// ItemList (LP の店舗一覧用)
// ------------------------------------------------------------

export function buildItemListSchema(items: Array<{ name: string; url: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: item.url,
      name: item.name,
    })),
  };
}

// ------------------------------------------------------------
// 便利関数: ページ単位で複数 schema を Graph で 1 タグにまとめる
// ------------------------------------------------------------

export function buildSchemaGraph(schemas: object[]): object {
  return {
    "@context": "https://schema.org",
    "@graph": schemas.map((s) => {
      // 既に @context を持っているなら剥がす (graph 内部では不要)
      const copy = { ...(s as Record<string, unknown>) };
      delete copy["@context"];
      return copy;
    }),
  };
}

// ------------------------------------------------------------
// 便利: absoluteUrl re-export
// ------------------------------------------------------------

export { absoluteUrl };

import { type RouteConfig, index, route, layout } from "@react-router/dev/routes";

export default [
  // ユーザー向けページ
  layout("routes/user/layout.tsx", [
    index("routes/user/top.tsx"),
    route("stores", "routes/user/stores.tsx"),
    route("stores/:slugOrId", "routes/user/store-detail.tsx"),
    route("login", "routes/user/login.tsx"),
    route("auth/callback", "routes/user/auth-callback.tsx"),
    route("mypage", "routes/user/mypage.tsx"),
    route("stores/:slugOrId/review", "routes/user/review.tsx"),
    route("relocate-support", "routes/user/relocate-support.tsx"),
    // ids はカンマ区切り (2〜4件)。例: /compare/1,5,8
    route("compare/:ids", "routes/user/compare.tsx"),
    route("columns", "routes/user/columns.tsx"),
    route("columns/:slug", "routes/user/column-detail.tsx"),

    // SEO ランディングページ (エリア × 業態 × 交差)
    route("jobs/areas/:areaSlug", "routes/user/landings/area.tsx"),
    route("jobs/categories/:categorySlug", "routes/user/landings/category.tsx"),
    route(
      "jobs/areas/:areaSlug/categories/:categorySlug",
      "routes/user/landings/area-category.tsx",
    ),

    // 業界用語集 (Glossary)
    route("glossary", "routes/user/glossary/index.tsx"),
    route("glossary/:slug", "routes/user/glossary/detail.tsx"),

    // 法務・運営関連 (Footer から導線)
    route("terms", "routes/user/legal/terms.tsx"),
    route("privacy", "routes/user/legal/privacy.tsx"),
    route("company", "routes/user/legal/company.tsx"),
    route("contact", "routes/user/legal/contact.tsx"),
  ]),

  // 管理画面
  route("admin/login", "routes/admin/login.tsx"),
  layout("routes/admin/layout.tsx", [
    route("admin", "routes/admin/dashboard.tsx", { index: true }),
    route("admin/users", "routes/admin/users.tsx"),
    route("admin/users/:id", "routes/admin/user-detail.tsx"),
    route("admin/shops", "routes/admin/shops.tsx"),
    route("admin/shops/new", "routes/admin/shop-new.tsx"),
    route("admin/shops/:id/edit", "routes/admin/shop-edit.tsx"),
    route("admin/reviews", "routes/admin/reviews.tsx"),
    route("admin/ai-chat", "routes/admin/ai-chat.tsx"),
    route("admin/admin-users", "routes/admin/admin-users.tsx"),
    route("admin/area-category", "routes/admin/area-category.tsx"),
    route("admin/relocate-voices", "routes/admin/relocate-voices.tsx"),
    route("admin/content", "routes/admin/content.tsx"),
    route("admin/articles", "routes/admin/articles.tsx"),
    route("admin/articles/new", "routes/admin/article-new.tsx"),
    route("admin/articles/:id/edit", "routes/admin/article-edit.tsx"),
    route("admin/fine-tuning-qa", "routes/admin/fine-tuning-qa.tsx"),
    route("admin/fine-tuning-qa/new", "routes/admin/fine-tuning-qa-new.tsx"),
    route("admin/fine-tuning-qa/:id/edit", "routes/admin/fine-tuning-qa-edit.tsx"),
    route("admin/users/broadcast", "routes/admin/line-broadcast.tsx"),
    route("admin/users/:userId/messages", "routes/admin/line-messages.tsx"),
  ]),
] satisfies RouteConfig;

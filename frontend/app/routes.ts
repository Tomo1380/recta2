import { type RouteConfig, index, route, layout } from "@react-router/dev/routes";

export default [
  // ユーザー向けページ
  layout("routes/user/layout.tsx", [
    index("routes/user/top.tsx"),
    route("stores", "routes/user/stores.tsx"),
    route("stores/:id", "routes/user/store-detail.tsx"),
    route("login", "routes/user/login.tsx"),
    route("auth/callback", "routes/user/auth-callback.tsx"),
    route("mypage", "routes/user/mypage.tsx"),
    route("stores/:id/review", "routes/user/review.tsx"),
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
    route("admin/content", "routes/admin/content.tsx"),
    route("admin/users/broadcast", "routes/admin/line-broadcast.tsx"),
    route("admin/users/:userId/messages", "routes/admin/line-messages.tsx"),
  ]),
] satisfies RouteConfig;

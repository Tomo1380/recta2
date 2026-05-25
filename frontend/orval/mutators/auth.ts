// orval/mutators/auth.ts
//
// Axios mutator for the orval-generated client. Handles:
// - Same-origin /api base (nginx routes /api/* to Laravel)
// - Bearer token from localStorage (admin uses `admin_token`,
//   user side uses `user_token`)
// - 401 → bounce to the matching login page
//
// Keep this small — Recta has a single auth scheme (Bearer in
// localStorage), no cookies, no idempotency keys.

import axios, { AxiosError, type AxiosRequestConfig } from "axios";

const AXIOS = axios.create({
  baseURL: "/api",
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

// Attach whichever token applies. Admin token wins if both exist
// (admin pages don't have user_token, and vice versa).
AXIOS.interceptors.request.use((config) => {
  if (typeof window === "undefined") return config;
  const adminToken = localStorage.getItem("admin_token");
  const userToken = localStorage.getItem("user_token");
  const token = adminToken ?? userToken;
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 401 → match-up redirect. Stay quiet on SSR (no window).
AXIOS.interceptors.response.use(
  (res) => res,
  (err: AxiosError) => {
    if (typeof window !== "undefined" && err.response?.status === 401) {
      const onAdmin = window.location.pathname.startsWith("/admin");
      if (onAdmin) {
        localStorage.removeItem("admin_token");
        localStorage.removeItem("admin_user");
        if (!window.location.pathname.endsWith("/login")) {
          window.location.href = "/admin/login";
        }
      } else {
        localStorage.removeItem("user_token");
        // ユーザー側は LINE ログインフロー (sessionStorage に return-to を残す
        // ロジックは個別ページで持っているので、ここでは触らない)。
      }
    }
    return Promise.reject(err);
  },
);

/**
 * orval が生成した各 endpoint 関数から呼ばれる mutator 本体。
 * orval が組み立てた AxiosRequestConfig をそのまま投げて、結果の
 * `.data` を返すだけのシンプル実装。
 */
export const rectaMutator = async <T>(config: AxiosRequestConfig): Promise<T> => {
  const res = await AXIOS.request<T>(config);
  return res.data;
};

export default rectaMutator;

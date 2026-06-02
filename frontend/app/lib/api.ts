const API_BASE = "/api";

export class ApiError extends Error {
  constructor(
    public status: number,
    public data: Record<string, unknown>,
  ) {
    super(data.message as string || `API Error: ${status}`);
  }
}

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("admin_token") : null;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (res.status === 401) {
    // ログイン/ログアウト endpoint からの 401 はリダイレクトしない。
    // login 画面で「資格情報違い → 401」が返るとき、リダイレクトすると
    // window.location.href でページ全リロードが走り、setError したエラー
    // メッセージが一瞬で消えてしまう (ログインできない症状の原因)。
    // それ以外 (期限切れトークンで /admin/me 等が叩かれたケース) は従来通り
    // localStorage を掃除してログイン画面へ。
    const isAuthEndpoint = path === "/admin/login" || path === "/admin/logout";
    if (!isAuthEndpoint && typeof window !== "undefined") {
      localStorage.removeItem("admin_token");
      localStorage.removeItem("admin_user");
      window.location.href = "/admin/login";
    }
    // body をパースしてエラー詳細を渡す (resp の message を活かす)
    const data = await res.json().catch(() => ({ message: "Unauthorized" }));
    throw new ApiError(401, data);
  }

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new ApiError(res.status, data);
  }

  if (res.status === 204) return undefined as T;

  return res.json();
}

// Upload helper - sends FormData without Content-Type header (browser sets boundary)
export async function apiUpload<T = unknown>(
  path: string,
  formData: FormData,
): Promise<T> {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("admin_token") : null;

  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers,
    body: formData,
  });

  if (res.status === 401) {
    // upload は admin 認証下でしか叩かないので、401 はトークン失効と判断
    // してログイン画面へ。
    if (typeof window !== "undefined") {
      localStorage.removeItem("admin_token");
      localStorage.removeItem("admin_user");
      window.location.href = "/admin/login";
    }
    throw new ApiError(401, { message: "Unauthorized" });
  }

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new ApiError(res.status, data);
  }

  return res.json();
}

/**
 * 同一ミューテーション (method + path + body) の多重送信ガード。
 *
 * 保存/更新ボタンの連打や、state 反映前の同期的ダブルクリックで二重 POST/PUT/DELETE
 * が飛ぶのを防ぐ。実行中の同一リクエストがあれば、その Promise を使い回す
 * (新たにネットワークへは投げない)。完了 (成功/失敗どちらも) でキーを解放するので、
 * 失敗後の再送信や、内容を変えた次の保存は正常に通る。
 *
 * upload (multipart) は対象外 — 同一エンドポイントへ別ファイルを連続アップロード
 * する正当なケースがあり、body をキー化できないため。
 */
const inFlightMutations = new Map<string, Promise<unknown>>();

function dedupeMutation<T>(key: string, run: () => Promise<T>): Promise<T> {
  const existing = inFlightMutations.get(key) as Promise<T> | undefined;
  if (existing) return existing;
  const p = run().finally(() => inFlightMutations.delete(key));
  inFlightMutations.set(key, p);
  return p;
}

// Convenience methods (admin)
export const api = {
  get: <T = unknown>(path: string) => apiFetch<T>(path),
  post: <T = unknown>(path: string, body?: unknown) =>
    dedupeMutation(`a:POST:${path}:${JSON.stringify(body)}`, () =>
      apiFetch<T>(path, { method: "POST", body: JSON.stringify(body) })),
  put: <T = unknown>(path: string, body?: unknown) =>
    dedupeMutation(`a:PUT:${path}:${JSON.stringify(body)}`, () =>
      apiFetch<T>(path, { method: "PUT", body: JSON.stringify(body) })),
  delete: <T = unknown>(path: string) =>
    dedupeMutation(`a:DELETE:${path}`, () =>
      apiFetch<T>(path, { method: "DELETE" })),
  upload: <T = unknown>(path: string, formData: FormData) =>
    apiUpload<T>(path, formData),
};

// User-facing API fetch (uses user_token instead of admin_token)
export async function userApiFetch<T = unknown>(
  path: string,
  options: RequestInit = {},
  tokenOverride?: string,
): Promise<T> {
  const token =
    tokenOverride ??
    (typeof window !== "undefined"
      ? localStorage.getItem("user_token")
      : null);

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (res.status === 401) {
    // line-login endpoint からの 401 はリダイレクトしない (login 画面で
    // エラー表示できなくなるため)。それ以外は localStorage を掃除して
    // top または login 画面へ。
    const isAuthEndpoint = path.startsWith("/auth/line") || path === "/auth/logout";
    if (!isAuthEndpoint && typeof window !== "undefined") {
      localStorage.removeItem("user_token");
      localStorage.removeItem("user_data");
      window.location.href = "/login";
    }
    const data = await res.json().catch(() => ({ message: "Unauthorized" }));
    throw new ApiError(401, data);
  }

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new ApiError(res.status, data);
  }

  if (res.status === 204) return undefined as T;

  return res.json();
}

// Convenience methods (user-facing)
export const userApi = {
  get: <T = unknown>(path: string, token?: string) =>
    userApiFetch<T>(path, {}, token),
  post: <T = unknown>(path: string, body?: unknown, token?: string) =>
    dedupeMutation(`u:POST:${path}:${JSON.stringify(body)}`, () =>
      userApiFetch<T>(path, { method: "POST", body: JSON.stringify(body) }, token)),
  put: <T = unknown>(path: string, body?: unknown, token?: string) =>
    dedupeMutation(`u:PUT:${path}:${JSON.stringify(body)}`, () =>
      userApiFetch<T>(path, { method: "PUT", body: JSON.stringify(body) }, token)),
  delete: <T = unknown>(path: string, token?: string) =>
    dedupeMutation(`u:DELETE:${path}`, () =>
      userApiFetch<T>(path, { method: "DELETE" }, token)),
};

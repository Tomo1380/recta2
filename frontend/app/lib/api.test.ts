import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ApiError, apiFetch, api, userApiFetch } from "./api";

/**
 * Phase 0-3 smoke: api クライアントの最低限の挙動を固定。
 * Phase 3-5 で orval 生成 client + mutator 化する際の安全網。
 *
 * 検証する不変条件:
 *   - 200 で json をそのまま返す / 204 は undefined
 *   - 4xx/5xx は ApiError を throw (status と data を保持)
 *   - admin と user で localStorage キーを使い分ける
 *   - Authorization ヘッダにトークンを差し込む
 */
describe("api client", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    fetchMock.mockReset();
    localStorage.clear();
    // window.location 書き換えは jsdom 制約があるので 401 経路はそれ込みで検証しない
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("apiFetch returns parsed json on 200", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ id: 1, name: "x" }), { status: 200 }),
    );

    const result = await apiFetch<{ id: number; name: string }>("/stores/1");

    expect(result).toEqual({ id: 1, name: "x" });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/stores/1",
      expect.objectContaining({
        headers: expect.objectContaining({
          "Content-Type": "application/json",
          Accept: "application/json",
        }),
      }),
    );
  });

  it("apiFetch returns undefined on 204", async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));

    const result = await apiFetch("/admin/articles/1");
    expect(result).toBeUndefined();
  });

  it("apiFetch throws ApiError with status and data on 4xx", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ message: "Not found" }), { status: 404 }),
    );

    await expect(apiFetch("/missing")).rejects.toMatchObject({
      status: 404,
      data: { message: "Not found" },
    });
  });

  it("apiFetch throws ApiError on 5xx with empty body", async () => {
    fetchMock.mockResolvedValueOnce(new Response("", { status: 500 }));

    await expect(apiFetch("/oops")).rejects.toBeInstanceOf(ApiError);
  });

  it("apiFetch attaches admin_token from localStorage as Bearer", async () => {
    localStorage.setItem("admin_token", "admin-abc");
    fetchMock.mockResolvedValueOnce(new Response("{}", { status: 200 }));

    await apiFetch("/admin/me");

    const call = fetchMock.mock.calls[0];
    expect((call[1] as RequestInit).headers).toMatchObject({
      Authorization: "Bearer admin-abc",
    });
  });

  it("api.post sends JSON body and method", async () => {
    fetchMock.mockResolvedValueOnce(new Response("{}", { status: 200 }));

    await api.post("/admin/articles", { title: "x" });

    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/admin/articles");
    expect(opts.method).toBe("POST");
    expect(opts.body).toBe(JSON.stringify({ title: "x" }));
  });

  it("userApiFetch uses user_token, not admin_token", async () => {
    localStorage.setItem("admin_token", "admin-token");
    localStorage.setItem("user_token", "user-token");
    fetchMock.mockResolvedValueOnce(new Response("{}", { status: 200 }));

    await userApiFetch("/user/me");

    const call = fetchMock.mock.calls[0];
    expect((call[1] as RequestInit).headers).toMatchObject({
      Authorization: "Bearer user-token",
    });
  });

  it("userApiFetch accepts token override (used during LINE auth callback)", async () => {
    fetchMock.mockResolvedValueOnce(new Response("{}", { status: 200 }));

    await userApiFetch("/user/me", {}, "override-token");

    const call = fetchMock.mock.calls[0];
    expect((call[1] as RequestInit).headers).toMatchObject({
      Authorization: "Bearer override-token",
    });
  });

  it("ApiError.message falls back to status when no message in data", async () => {
    const err = new ApiError(503, {});
    expect(err.status).toBe(503);
    expect(err.message).toBe("API Error: 503");
  });

  it("ApiError.message prefers data.message when present", () => {
    const err = new ApiError(422, { message: "Validation failed" });
    expect(err.message).toBe("Validation failed");
  });
});

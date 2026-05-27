import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act, waitFor } from "@testing-library/react";
import { AuthProvider, useAuth, type AdminUser } from "./auth";

/**
 * Phase 0-3 smoke: AuthProvider の token/user 永続化と
 * login/logout の最低限の挙動を固定。Phase 3-5 の orval 移行で
 * トークン管理ロジックを mutator に移す際の安全網。
 */

const fakeAdmin: AdminUser = {
  id: 1,
  name: "Admin",
  email: "a@test.com",
  role: "super_admin",
  status: "active",
  last_login_at: null,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

function TokenProbe() {
  const { user, token } = useAuth();
  return (
    <div>
      <span data-testid="token">{token ?? "no-token"}</span>
      <span data-testid="user">{user?.email ?? "no-user"}</span>
    </div>
  );
}

describe("AuthProvider", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    fetchMock.mockReset();
    localStorage.clear();
  });

  it("starts with no user/token when localStorage is empty", () => {
    // No token => no /admin/me call should be made
    render(
      <AuthProvider>
        <TokenProbe />
      </AuthProvider>,
    );

    expect(screen.getByTestId("token").textContent).toBe("no-token");
    expect(screen.getByTestId("user").textContent).toBe("no-user");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("hydrates user/token from localStorage on mount", async () => {
    localStorage.setItem("admin_token", "abc");
    localStorage.setItem("admin_user", JSON.stringify(fakeAdmin));
    // /admin/me verify call
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(fakeAdmin), { status: 200 }),
    );

    render(
      <AuthProvider>
        <TokenProbe />
      </AuthProvider>,
    );

    expect(screen.getByTestId("token").textContent).toBe("abc");

    await waitFor(() => {
      expect(screen.getByTestId("user").textContent).toBe("a@test.com");
    });
  });

  it("clears credentials when /admin/me verify fails", async () => {
    localStorage.setItem("admin_token", "stale");
    localStorage.setItem("admin_user", JSON.stringify(fakeAdmin));
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ message: "Unauthenticated." }), {
        status: 401,
      }),
    );

    render(
      <AuthProvider>
        <TokenProbe />
      </AuthProvider>,
    );

    // 401 経路は window.location.href 書き換えがあるが jsdom では navigation
    // しないので localStorage の cleanup と state リセットのみ確認できる
    await waitFor(() => {
      expect(localStorage.getItem("admin_token")).toBeNull();
    });
  });
});

describe("useAuth", () => {
  it("throws when used outside AuthProvider", () => {
    function Crash() {
      useAuth();
      return null;
    }
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<Crash />)).toThrow(/AuthProvider/);
    err.mockRestore();
  });
});

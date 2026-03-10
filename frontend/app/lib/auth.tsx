import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { api, ApiError } from "./api";

export interface AdminUser {
  id: number;
  name: string;
  email: string;
  role: "super_admin" | "admin";
  status: "active" | "inactive";
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

interface AuthContextValue {
  user: AdminUser | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(() => {
    if (typeof window === "undefined") return null;
    const stored = localStorage.getItem("admin_user");
    return stored ? JSON.parse(stored) : null;
  });
  const [token, setToken] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("admin_token");
  });
  const [loading, setLoading] = useState(false);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.post<{ token: string; admin: AdminUser }>(
      "/admin/login",
      { email, password },
    );
    localStorage.setItem("admin_token", res.token);
    localStorage.setItem("admin_user", JSON.stringify(res.admin));
    setToken(res.token);
    setUser(res.admin);
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post("/admin/logout");
    } catch {
      // ignore errors on logout
    }
    localStorage.removeItem("admin_token");
    localStorage.removeItem("admin_user");
    setToken(null);
    setUser(null);
  }, []);

  // Verify token on mount
  useEffect(() => {
    if (!token) return;
    setLoading(true);
    api
      .get<AdminUser>("/admin/me")
      .then((u) => {
        setUser(u);
        localStorage.setItem("admin_user", JSON.stringify(u));
      })
      .catch(() => {
        localStorage.removeItem("admin_token");
        localStorage.removeItem("admin_user");
        setToken(null);
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

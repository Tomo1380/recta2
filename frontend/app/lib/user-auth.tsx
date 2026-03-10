import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { userApi } from "./api";
import type { User } from "./types";

interface UserAuthContextValue {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (token: string) => Promise<void>;
  logout: () => Promise<void>;
}

const UserAuthContext = createContext<UserAuthContextValue | null>(null);

export function UserAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    if (typeof window === "undefined") return null;
    const stored = localStorage.getItem("user_data");
    return stored ? JSON.parse(stored) : null;
  });
  const [token, setToken] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("user_token");
  });
  const [loading, setLoading] = useState(false);

  const fetchUser = useCallback(async (t: string) => {
    setLoading(true);
    try {
      const u = await userApi.get<User>("/user/me", t);
      setUser(u);
      localStorage.setItem("user_data", JSON.stringify(u));
    } catch {
      localStorage.removeItem("user_token");
      localStorage.removeItem("user_data");
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const login = useCallback(
    async (newToken: string) => {
      localStorage.setItem("user_token", newToken);
      setToken(newToken);
      await fetchUser(newToken);
    },
    [fetchUser],
  );

  const logout = useCallback(async () => {
    try {
      const t =
        typeof window !== "undefined"
          ? localStorage.getItem("user_token")
          : null;
      if (t) {
        await userApi.post("/user/logout", undefined, t);
      }
    } catch {
      // ignore errors on logout
    }
    localStorage.removeItem("user_token");
    localStorage.removeItem("user_data");
    setToken(null);
    setUser(null);
  }, []);

  // Verify token on mount
  useEffect(() => {
    if (!token) return;
    fetchUser(token);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <UserAuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user && !!token,
        loading,
        login,
        logout,
      }}
    >
      {children}
    </UserAuthContext.Provider>
  );
}

export function useUserAuth() {
  const ctx = useContext(UserAuthContext);
  if (!ctx)
    throw new Error("useUserAuth must be used within UserAuthProvider");
  return ctx;
}

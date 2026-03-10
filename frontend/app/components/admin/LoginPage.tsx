import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Eye, EyeOff, ArrowRight, Loader2 } from "lucide-react";
import { useAuth } from "~/lib/auth";
import { ApiError } from "~/lib/api";

export function LoginPage() {
  const navigate = useNavigate();
  const { login, user } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Already logged in - redirect
  useEffect(() => {
    if (user) {
      navigate("/admin", { replace: true });
    }
  }, [user, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      navigate("/admin", { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 422) {
          const errors = err.data.errors as Record<string, string[]> | undefined;
          setError(errors ? Object.values(errors).flat().join("\n") : "入力内容を確認してください");
        } else if (err.status === 401) {
          setError("メールアドレスまたはパスワードが正しくありません");
        } else {
          setError("ログインに失敗しました");
        }
      } else {
        setError("サーバーに接続できません");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-[#1e1b4b] to-violet-950 flex relative overflow-hidden">
      {/* Left panel - branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative">
        <div className="relative z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-indigo-500 rounded-lg flex items-center justify-center">
              <span className="text-white text-base" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800 }}>R</span>
            </div>
            <span className="text-white text-lg" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700 }}>Recta</span>
          </div>
        </div>

        <div className="relative z-10 max-w-md">
          <h2 className="text-white text-4xl tracking-tight" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, lineHeight: 1.2 }}>
            Manage everything<br />in one place.
          </h2>
          <p className="text-indigo-300 mt-4 text-[15px] leading-relaxed">
            店舗管理、ユーザー分析、口コミ管理など、すべてを一つのプラットフォームで。
          </p>
        </div>

        <p className="text-indigo-700 text-[13px] relative z-10">
          &copy; 2026 Recta Inc.
        </p>

        {/* Decorative elements */}
        <div className="absolute inset-0">
          <div className="absolute top-1/4 right-0 w-[400px] h-[400px] rounded-full border border-indigo-800/50" />
          <div className="absolute top-1/4 right-0 w-[500px] h-[500px] rounded-full border border-violet-800/30" />
          <div className="absolute bottom-1/4 left-1/4 w-[300px] h-[300px] rounded-full border border-indigo-700/40" />
          <div className="absolute top-1/2 left-1/3 w-48 h-48 bg-violet-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/3 right-1/4 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl" />
        </div>
      </div>

      {/* Right panel - form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-white lg:rounded-l-[2rem]">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2.5 mb-10">
            <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center">
              <span className="text-white text-sm" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800 }}>R</span>
            </div>
            <span className="text-foreground text-lg" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700 }}>Recta</span>
          </div>

          <div className="mb-8">
            <h1 className="text-foreground text-2xl" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700 }}>
              ログイン
            </h1>
            <p className="text-sm text-muted-foreground mt-2">管理画面にアクセスするには認証が必要です</p>
          </div>

          {error && (
            <div className="mb-5 p-3 rounded-lg bg-red-50 border border-red-200 text-[13px] text-red-700 whitespace-pre-wrap">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-[13px] mb-1.5 text-foreground">メールアドレス</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@recta.jp"
                required
                className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-white focus:outline-none focus:ring-2 focus:ring-foreground/10 focus:border-foreground/30 transition-all text-sm"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[13px] text-foreground">パスワード</label>
                <button type="button" className="text-[12px] text-muted-foreground hover:text-foreground transition">
                  忘れた方
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all pr-11 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 text-white py-2.5 rounded-lg hover:bg-indigo-700 transition-all text-sm flex items-center justify-center gap-2 group disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  ログイン中...
                </>
              ) : (
                <>
                  ログイン
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </>
              )}
            </button>
          </form>

          <p className="text-center text-muted-foreground text-[12px] mt-8">
            &copy; 2026 Recta Inc. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
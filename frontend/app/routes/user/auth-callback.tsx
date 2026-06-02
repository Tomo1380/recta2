import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router";
import { useUserAuth } from "~/lib/user-auth";
import { buildMetaTags } from "~/lib/seo";

export function meta() {
  return buildMetaTags({
    title: "認証中... - Recta",
    description: "LINE 認証を処理しています。",
    path: "/auth/callback",
    noindex: true,
  });
}

export default function AuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useUserAuth();
  const [error, setError] = useState(false);

  useEffect(() => {
    // バックエンドはトークンを URL に直接載せず、単回使用の交換コードを渡す。
    // ここで /api/auth/line/exchange に投げて実トークンを受け取る。
    const code = searchParams.get("code");
    if (!code) {
      setError(true);
      setTimeout(() => navigate("/login"), 2000);
      return;
    }

    // バックエンドから return_to が付与されていればそこへ。なければ
    // sessionStorage の保存値、それも無ければ /mypage。
    const returnFromQuery = searchParams.get("return_to");
    const returnFromStorage = typeof window !== "undefined"
      ? sessionStorage.getItem("recta:login-return-to")
      : null;
    if (typeof window !== "undefined") sessionStorage.removeItem("recta:login-return-to");

    const candidate = returnFromQuery || returnFromStorage || "/mypage";
    const target = candidate.startsWith("/") && !candidate.startsWith("//") ? candidate : "/mypage";

    const fail = () => {
      setError(true);
      setTimeout(() => navigate("/login"), 2000);
    };

    fetch("/api/auth/line/exchange", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ code }),
    })
      .then(async (res) => {
        if (!res.ok) throw new Error("exchange failed");
        const data = (await res.json()) as { token?: string };
        if (!data.token) throw new Error("no token");
        await login(data.token);
        navigate(target);
      })
      .catch(fail);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      className="flex flex-1 items-center justify-center"
      style={{ backgroundColor: "#f7f6f3" }}
    >
      <div className="flex flex-col items-center gap-4">
        {error ? (
          <>
            <div className="text-destructive text-lg font-bold">
              認証に失敗しました
            </div>
            <p className="text-sm text-muted-foreground">
              ログインページに戻ります...
            </p>
          </>
        ) : (
          <>
            <div
              className="size-10 animate-spin rounded-full border-4"
              style={{
                borderColor: "rgba(6,199,85,0.2)",
                borderTopColor: "#06C755",
              }}
            />
            <p className="text-sm text-muted-foreground">認証処理中...</p>
          </>
        )}
      </div>
    </div>
  );
}

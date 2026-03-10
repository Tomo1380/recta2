import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router";
import { useUserAuth } from "~/lib/user-auth";

export function meta() {
  return [{ title: "認証中... - Recta" }];
}

export default function AuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useUserAuth();
  const [error, setError] = useState(false);

  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) {
      setError(true);
      setTimeout(() => navigate("/login"), 2000);
      return;
    }

    login(token)
      .then(() => {
        navigate("/mypage");
      })
      .catch(() => {
        setError(true);
        setTimeout(() => navigate("/login"), 2000);
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      className="flex min-h-screen items-center justify-center"
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

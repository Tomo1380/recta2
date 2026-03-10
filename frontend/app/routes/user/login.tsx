import { Link } from "react-router";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { useUserAuth } from "~/lib/user-auth";
import { useEffect } from "react";
import { useNavigate } from "react-router";

export function meta() {
  return [{ title: "ログイン - Recta" }];
}

function LineIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386a.63.63 0 0 1-.63-.629V8.108a.63.63 0 0 1 .63-.63h2.386c.349 0 .63.282.63.63 0 .346-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016a.63.63 0 0 1-.63.63.625.625 0 0 1-.51-.262l-2.397-3.274v2.906a.63.63 0 0 1-.63.63.627.627 0 0 1-.63-.63V8.108a.627.627 0 0 1 .63-.63c.2 0 .388.096.509.263l2.397 3.272V8.108a.63.63 0 0 1 .63-.63.63.63 0 0 1 .631.63v4.771zm-5.741 0a.63.63 0 0 1-1.261 0V8.108a.631.631 0 0 1 1.261 0v4.771zm-2.451.63H4.932a.63.63 0 0 1-.63-.63V8.108a.63.63 0 0 1 .63-.63.63.63 0 0 1 .63.63v4.141h1.756c.348 0 .629.283.629.63a.629.629 0 0 1-.629.63M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
    </svg>
  );
}

export default function LoginPage() {
  const { isAuthenticated } = useUserAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/mypage");
    }
  }, [isAuthenticated, navigate]);

  const handleLineLogin = () => {
    window.location.href = "/api/auth/line";
  };

  return (
    <div
      className="flex min-h-screen items-center justify-center px-4"
      style={{ backgroundColor: "#f7f6f3" }}
    >
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">ログイン</CardTitle>
          <CardDescription className="mt-2 text-sm leading-relaxed">
            LINEアカウントでログインすると、口コミの投稿やマイページが利用できます
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <Button
            onClick={handleLineLogin}
            className="w-full gap-3 py-6 text-base font-bold text-white"
            style={{ backgroundColor: "#06C755" }}
            onMouseOver={(e) =>
              (e.currentTarget.style.backgroundColor = "#05b34c")
            }
            onMouseOut={(e) =>
              (e.currentTarget.style.backgroundColor = "#06C755")
            }
          >
            <LineIcon className="size-6" />
            LINEでログイン
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            ログインすることで、
            <Link to="#" className="underline">
              利用規約
            </Link>
            および
            <Link to="#" className="underline">
              プライバシーポリシー
            </Link>
            に同意したものとみなされます。
          </p>

          <div className="text-center">
            <Link
              to="/"
              className="text-sm text-muted-foreground underline hover:text-foreground"
            >
              トップページに戻る
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

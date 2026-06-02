import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";

import type { Route } from "./+types/root";
import { AuthProvider } from "~/lib/auth";
import "./app.css";

export const links: Route.LinksFunction = () => [
  // SVG faviconは現代ブラウザ全部対応。ベクターなのでどの解像度でも綺麗。
  // 非対応ブラウザ (古い Edge / Safari の一部) は .ico に fallback。
  { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
  { rel: "icon", href: "/favicon.ico", sizes: "32x32" },
  { rel: "icon", href: "/icon-192.png", type: "image/png", sizes: "192x192" },
  { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
  },
  // Great Vibes — script font used for editorial accents (e.g. the シャンパン
  // メニューの英字銘柄). Latin only, very small (~5KB woff2).
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Great+Vibes&display=swap",
  },
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        {/* PWA / モバイル UI のテーマ色。Recta luxe (黒+ゴールド) のダーク。 */}
        <meta name="theme-color" content="#1b2528" />
        <meta name="format-detection" content="telephone=no" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Outlet />
    </AuthProvider>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  const isNotFound = isRouteErrorResponse(error) && error.status === 404;

  let heading = "エラーが発生しました";
  let description =
    "申し訳ございません。予期しないエラーが発生しました。時間をおいて再度お試しください。";
  let code = "";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    code = String(error.status);
    if (isNotFound) {
      heading = "ページが見つかりません";
      description =
        "お探しのページは移動または削除された可能性があります。URL をご確認ください。";
    } else {
      heading = "エラーが発生しました";
      description =
        error.statusText ||
        "申し訳ございません。時間をおいて再度お試しください。";
    }
  } else if (import.meta.env.DEV && error instanceof Error) {
    description = error.message;
    stack = error.stack;
  }

  return (
    <main
      className="flex min-h-[60vh] flex-1 items-center justify-center px-6 py-16"
      style={{ backgroundColor: "#f7f6f3" }}
    >
      <div className="flex max-w-md flex-col items-center gap-4 text-center">
        {code && (
          <span
            className="text-sm font-bold tracking-widest"
            style={{ color: "#c8960c" }}
          >
            {code}
          </span>
        )}
        <h1 className="text-xl font-bold" style={{ color: "#1b2528" }}>
          {heading}
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
        <a
          href="/"
          className="mt-2 inline-flex items-center justify-center rounded-full px-6 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90"
          style={{ background: "linear-gradient(180deg, #D4AF37 0%, #c8960c 100%)" }}
        >
          トップページに戻る
        </a>
        {stack && (
          <pre className="mt-4 w-full overflow-x-auto rounded-lg bg-black/80 p-4 text-left text-xs text-white">
            <code>{stack}</code>
          </pre>
        )}
      </div>
    </main>
  );
}

import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router";
import { Star, ChevronLeft, Loader2, Lock } from "lucide-react";
import XPostEmbed from "~/components/user/shared/XPostEmbed";
import { Breadcrumb } from "~/components/user/shared/Breadcrumb";
import { useUserAuth } from "~/lib/user-auth";
import { userApi } from "~/lib/api";
import { buildMetaTags } from "~/lib/seo";
import type { Store } from "~/lib/types";

const XLogo = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const GOLD = "#d4af37";
const DARK = "#1b2528";
const J = "'Noto Sans JP',sans-serif";

export function meta({ params }: { params: { slugOrId?: string } }) {
  return buildMetaTags({
    title: "口コミを投稿 - Recta",
    description: "Recta に登録されたお店の口コミを投稿できます。",
    path: `/stores/${params.slugOrId ?? ""}/review`,
    noindex: true,
  });
}

const MIN_BODY_LENGTH = 10;

export default function ReviewPage() {
  const { slugOrId } = useParams();
  // ReviewPage 内は店舗 ID で操作する。store fetch 後に id を取得して書き換える。
  const [resolvedStoreId, setResolvedStoreId] = useState<number | null>(
    slugOrId && /^\d+$/.test(slugOrId) ? Number(slugOrId) : null,
  );
  const storeId = resolvedStoreId ?? 0;
  const navigate = useNavigate();
  const { isAuthenticated, loading: authLoading, user } = useUserAuth();

  const [store, setStore] = useState<Store | null>(null);
  const [storeLoading, setStoreLoading] = useState(true);
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [body, setBody] = useState("");
  const [tweetUrl, setTweetUrl] = useState("");
  const [nickname, setNickname] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => { setHydrated(true); }, []);
  useEffect(() => {
    if (user?.nickname) setNickname(user.nickname);
  }, [user?.nickname]);

  const tweetIdMatch = tweetUrl.match(/https?:\/\/(?:x|twitter|mobile\.twitter)\.com\/([^/]+)\/status\/(\d+)/);
  const tweetId = tweetIdMatch?.[2];
  const tweetAuthor = tweetIdMatch?.[1];

  const requireLogin = hydrated && !authLoading && !isAuthenticated;

  const handleGoToLogin = () => {
    sessionStorage.setItem("recta:login-return-to", `/stores/${storeId}/review`);
    navigate(`/login`);
  };

  useEffect(() => {
    if (!slugOrId) return;
    fetch(`/api/stores/${slugOrId}`)
      .then((res) => res.json())
      .then((data: Store | { data: Store } | { store: Store }) => {
        const s =
          "store" in data ? (data as { store: Store }).store
          : "data" in data ? (data as { data: Store }).data
          : (data as Store);
        setStore(s);
        if (s && typeof (s as { id?: number }).id === "number") {
          setResolvedStoreId((s as { id: number }).id);
        }
      })
      .catch(() => {})
      .finally(() => setStoreLoading(false));
  }, [slugOrId]);

  const handleSubmit = async () => {
    setError("");
    const trimmedNickname = nickname.trim();
    if (!trimmedNickname) return setError("ニックネームを入力してください");
    if (trimmedNickname.length > 20) return setError("ニックネームは20文字以内で入力してください");
    if (rating === 0) return setError("評価を選択してください");
    if (body.length < MIN_BODY_LENGTH) return setError(`口コミは${MIN_BODY_LENGTH}文字以上で入力してください`);
    if (tweetUrl && !tweetIdMatch) return setError("XのポストURLを正しく貼り付けてください");

    setSubmitting(true);
    try {
      if (trimmedNickname !== (user?.nickname ?? "")) {
        try {
          await userApi.put("/user/profile", { nickname: trimmedNickname });
        } catch {
          // プロフィール保存失敗でも口コミ投稿は続行
        }
      }
      await userApi.post(`/stores/${storeId}/reviews`, {
        rating,
        body,
        tweet_url: tweetUrl || undefined,
      });
      // 店舗詳細の canonical は slug 版。ID で戻ると 301 で二重遷移するので
      // slug があれば slug へ戻す。
      navigate(`/stores/${store?.slug ?? storeId}`);
    } catch {
      setError("投稿に失敗しました。もう一度お試しください。");
    } finally {
      setSubmitting(false);
    }
  };

  if (storeLoading || authLoading || !hydrated) {
    return (
      <div className="flex flex-1 items-center justify-center" style={{ backgroundColor: "#f5f5f5" }}>
        <div
          className="size-10 animate-spin rounded-full border-4"
          style={{
            borderColor: "rgba(212,175,55,0.2)",
            borderTopColor: GOLD,
          }}
        />
      </div>
    );
  }

  // 共通ヘッダー(luxe トーン: 黒+ゴールド) + パンくず
  const Header = () => (
    <>
      <div
        className="relative overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${DARK} 0%, #243034 60%, ${DARK} 100%)`,
        }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute"
          style={{
            top: "-30%",
            right: "-10%",
            width: "60%",
            height: "160%",
            background:
              "radial-gradient(ellipse at center, rgba(212,175,55,0.22) 0%, transparent 60%)",
          }}
        />
        <div className="relative px-5 py-5">
          <Link
            to={`/stores/${storeId}`}
            className="inline-flex items-center gap-1 text-[12px] text-white/60 transition-colors hover:text-white"
            style={{ fontFamily: J }}
          >
            <ChevronLeft className="size-4" />
            店舗詳細に戻る
          </Link>
          <div className="mt-3">
            <p
              className="text-[10px] font-bold uppercase"
              style={{
                color: "rgba(212,175,55,0.85)",
                fontFamily: "'Outfit', sans-serif",
                letterSpacing: "0.22em",
              }}
            >
              Write a review
            </p>
            <h1
              className="mt-1 text-[22px] font-bold leading-tight text-white"
              style={{ fontFamily: J }}
            >
              口コミを投稿
            </h1>
            {store && (
              <p
                className="mt-1.5 text-[13px]"
                style={{ color: "rgba(255,255,255,0.7)", fontFamily: J }}
              >
                {store.name}
                {store.area && (
                  <span className="ml-1.5" style={{ color: "rgba(212,175,55,0.7)" }}>
                    （{store.area}）
                  </span>
                )}
              </p>
            )}
          </div>
        </div>
      </div>
      <Breadcrumb
        items={[
          { label: "ホーム", to: "/" },
          { label: "店舗一覧", to: "/stores" },
          ...(store ? [{ label: store.name, to: `/stores/${storeId}` }] : []),
          { label: "口コミを書く" },
        ]}
      />
    </>
  );

  // 未認証: luxe トーンのログイン誘導カード
  if (requireLogin) {
    return (
      <div style={{ backgroundColor: "#f5f5f5", minHeight: "100%" }}>
        <Header />
        <div className="px-4 pb-8 pt-4">
          <div
            className="mx-auto max-w-lg rounded-2xl bg-white p-6 text-center"
            style={{
              boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
              border: "1px solid rgba(212,175,55,0.22)",
            }}
          >
            <div
              className="mx-auto mb-3 inline-flex size-12 items-center justify-center rounded-full"
              style={{
                background: "linear-gradient(135deg, rgba(212,175,55,0.2), rgba(212,175,55,0.06))",
                border: "1px solid rgba(212,175,55,0.32)",
              }}
            >
              <Lock className="size-5" style={{ color: GOLD }} />
            </div>
            <h2 className="text-[16px] font-bold" style={{ color: DARK, fontFamily: J }}>
              口コミ投稿にはログインが必要です
            </h2>
            <p
              className="mt-1.5 text-[13px]"
              style={{ color: "rgba(27,37,40,0.6)", fontFamily: J }}
            >
              {store?.name
                ? `「${store.name}」への投稿はLINEログイン後に進めます。`
                : "LINE でログインすると口コミを投稿できます。"}
            </p>
            <button
              type="button"
              onClick={handleGoToLogin}
              className="mt-5 inline-flex h-12 w-full items-center justify-center rounded-xl text-[15px] font-bold text-white transition-opacity hover:opacity-90"
              style={{
                backgroundColor: "#06C755",
                boxShadow: "0 6px 18px rgba(6,199,85,0.35)",
              }}
            >
              LINE でログインして続ける
            </button>
            <p className="mt-3 text-[11px]" style={{ color: "rgba(27,37,40,0.5)" }}>
              ログイン後、自動でこの画面に戻ります。
            </p>
          </div>
        </div>
      </div>
    );
  }

  // 認証済み: 投稿フォーム (luxe トーン)
  return (
    <div style={{ backgroundColor: "#f5f5f5", minHeight: "100%" }}>
      <Header />
      <div className="px-4 pb-12 pt-4">
        <div
          className="mx-auto max-w-lg rounded-2xl bg-white p-5"
          style={{
            boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
            border: "1px solid rgba(27,37,40,0.06)",
          }}
        >
          <div className="space-y-6">
            {/* Star Rating */}
            <div>
              <FieldLabel required>評価</FieldLabel>
              <div className="mt-2 flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, i) => {
                  const starValue = i + 1;
                  const active = starValue <= (hoveredRating || rating);
                  return (
                    <button
                      key={i}
                      type="button"
                      className="rounded p-0.5 transition-transform hover:scale-110"
                      onMouseEnter={() => setHoveredRating(starValue)}
                      onMouseLeave={() => setHoveredRating(0)}
                      onClick={() => setRating(starValue)}
                      aria-label={`${starValue}星`}
                    >
                      <Star
                        className="size-8"
                        style={{
                          color: active ? GOLD : "rgba(27,37,40,0.18)",
                          fill: active ? GOLD : "none",
                        }}
                      />
                    </button>
                  );
                })}
                {rating > 0 && (
                  <span
                    className="ml-2 text-[12px] tabular-nums"
                    style={{ color: "rgba(27,37,40,0.5)" }}
                  >
                    {rating}/5
                  </span>
                )}
              </div>
            </div>

            {/* Nickname */}
            <div>
              <FieldLabel required hint="1〜20 文字。投稿後は次回から自動入力されます">
                ニックネーム
              </FieldLabel>
              <input
                id="review-nickname"
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="例: ゆきな"
                maxLength={20}
                className="mt-2 w-full rounded-xl border bg-white px-3.5 py-2.5 text-[14px] outline-none transition-colors focus:border-[rgba(212,175,55,0.55)] focus:ring-2 focus:ring-[rgba(212,175,55,0.18)]"
                style={{ borderColor: "rgba(27,37,40,0.12)", fontFamily: J }}
              />
            </div>

            {/* Body */}
            <div>
              <FieldLabel required>口コミ内容</FieldLabel>
              <textarea
                id="review-body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="お店の雰囲気や働きやすさについて教えてください"
                rows={6}
                className="mt-2 w-full resize-none rounded-xl border bg-white px-3.5 py-2.5 text-[14px] leading-relaxed outline-none transition-colors focus:border-[rgba(212,175,55,0.55)] focus:ring-2 focus:ring-[rgba(212,175,55,0.18)]"
                style={{ borderColor: "rgba(27,37,40,0.12)", fontFamily: J }}
              />
              <div className="mt-1.5 flex items-center justify-between text-[11px]">
                <span
                  style={{
                    color:
                      body.length > 0 && body.length < MIN_BODY_LENGTH
                        ? "#c0392b"
                        : "rgba(27,37,40,0.5)",
                  }}
                >
                  {body.length > 0 && body.length < MIN_BODY_LENGTH
                    ? `あと${MIN_BODY_LENGTH - body.length}文字`
                    : `${MIN_BODY_LENGTH}文字以上`}
                </span>
                <span className="tabular-nums" style={{ color: "rgba(27,37,40,0.5)" }}>
                  {body.length}文字
                </span>
              </div>
            </div>

            {/* X post quote (optional) */}
            <div>
              <FieldLabel
                hint="XのポストURL（個別ページ）を貼り付けると、口コミに引用できます"
              >
                <span className="inline-flex items-center gap-1.5">
                  <XLogo size={13} />
                  Xのポストを引用
                </span>
              </FieldLabel>
              <input
                id="tweet-url"
                type="url"
                value={tweetUrl}
                onChange={(e) => setTweetUrl(e.target.value)}
                placeholder="https://x.com/username/status/1234567890..."
                className="mt-2 w-full rounded-xl border bg-white px-3.5 py-2.5 text-[13px] outline-none transition-colors focus:border-[rgba(212,175,55,0.55)] focus:ring-2 focus:ring-[rgba(212,175,55,0.18)]"
                style={{ borderColor: "rgba(27,37,40,0.12)", fontFamily: J }}
              />
              {tweetId && tweetAuthor ? (
                <div
                  className="mt-2 rounded-xl border bg-white p-3"
                  style={{ borderColor: "rgba(27,37,40,0.08)" }}
                >
                  <XPostEmbed postId={tweetId} authorHandle={tweetAuthor} />
                </div>
              ) : tweetUrl ? (
                <p className="mt-1.5 text-[11px]" style={{ color: "#c0392b" }}>
                  URLの形式が正しくありません
                </p>
              ) : null}
            </div>

            {/* Error */}
            {error && (
              <p
                className="rounded-xl px-3 py-2 text-[13px]"
                style={{
                  background: "rgba(192,57,43,0.08)",
                  color: "#a93023",
                  border: "1px solid rgba(192,57,43,0.2)",
                }}
              >
                {error}
              </p>
            )}

            {/* Submit */}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl text-[15px] font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
              style={{
                background: `linear-gradient(135deg, ${GOLD} 0%, #9a7a20 100%)`,
                boxShadow: "0 6px 18px rgba(212,175,55,0.32)",
              }}
            >
              {submitting && <Loader2 className="size-4 animate-spin" />}
              口コミを投稿する
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function FieldLabel({
  children,
  required,
  hint,
}: {
  children: React.ReactNode;
  required?: boolean;
  hint?: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5">
        <span className="text-[13px] font-semibold" style={{ color: DARK, fontFamily: J }}>
          {children}
        </span>
        {required && (
          <span
            className="rounded-sm px-1 py-px text-[9px] font-bold text-white"
            style={{ backgroundColor: GOLD }}
          >
            必須
          </span>
        )}
      </div>
      {hint && (
        <p className="mt-1 text-[11px]" style={{ color: "rgba(27,37,40,0.5)" }}>
          {hint}
        </p>
      )}
    </div>
  );
}

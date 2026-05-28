import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router";
import { Star, ArrowLeft, Loader2, Lock } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { Label } from "~/components/ui/label";
import XPostEmbed from "~/components/user/shared/XPostEmbed";

const XLogo = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { useUserAuth } from "~/lib/user-auth";
import { userApi } from "~/lib/api";
import type { Store } from "~/lib/types";

export function meta() {
  return [
    { title: "口コミを投稿 - Recta" },
    { name: "robots", content: "noindex,nofollow" },
  ];
}

const MIN_BODY_LENGTH = 10;

export default function ReviewPage() {
  const { id } = useParams();
  const storeId = Number(id);
  const navigate = useNavigate();
  const { isAuthenticated, loading: authLoading, user } = useUserAuth();

  const [store, setStore] = useState<Store | null>(null);
  const [storeLoading, setStoreLoading] = useState(true);
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [body, setBody] = useState("");
  const [tweetUrl, setTweetUrl] = useState("");
  // ニックネーム: ログイン user に保存済みなら初期表示、未保存なら空。
  // 投稿時に変更/設定して送信 → 成功時に user.nickname に保存される。
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

  // 未認証時は「ログインが必要です」カードを描画する（下の方の return 参照）。
  // 自動 redirect は廃止 — フォームをチラ見せしない+「なぜ画面が切り替わったか」が
  // ユーザーに伝わるよう、明示的に CTA を出す方針。
  const requireLogin = hydrated && !authLoading && !isAuthenticated;

  const handleGoToLogin = () => {
    // ログイン後にこの口コミ投稿フォームへ自動で戻れるよう、return-to を保存。
    sessionStorage.setItem("recta:login-return-to", `/stores/${storeId}/review`);
    navigate(`/login`);
  };

  // Fetch store info
  useEffect(() => {
    fetch(`/api/stores/${storeId}`)
      .then((res) => res.json())
      .then((data: Store | { data: Store }) => {
        const s = "data" in data ? data.data : data;
        setStore(s);
      })
      .catch(() => {
        // ignore
      })
      .finally(() => setStoreLoading(false));
  }, [storeId]);

  const handleSubmit = async () => {
    setError("");

    const trimmedNickname = nickname.trim();
    if (!trimmedNickname) {
      setError("ニックネームを入力してください");
      return;
    }
    if (trimmedNickname.length > 20) {
      setError("ニックネームは20文字以内で入力してください");
      return;
    }
    if (rating === 0) {
      setError("評価を選択してください");
      return;
    }
    if (body.length < MIN_BODY_LENGTH) {
      setError(`口コミは${MIN_BODY_LENGTH}文字以上で入力してください`);
      return;
    }
    if (tweetUrl && !tweetIdMatch) {
      setError("XのポストURLを正しく貼り付けてください");
      return;
    }

    setSubmitting(true);
    try {
      // 口コミ投稿前にニックネームを保存。次回フォームを開いたとき
      // user.nickname として戻ってきてプリフィルされる。
      if (trimmedNickname !== (user?.nickname ?? "")) {
        try {
          await userApi.put("/user/profile", { nickname: trimmedNickname });
        } catch {
          // プロフィール保存に失敗しても口コミ投稿は続ける。
          // 表示名は API レスポンス側で nickname || line_display_name の
          // フォールバックなので最悪 LINE 名で表示される。
        }
      }
      await userApi.post(`/stores/${storeId}/reviews`, {
        rating,
        body,
        tweet_url: tweetUrl || undefined,
      });
      navigate(`/stores/${storeId}`);
    } catch (err) {
      setError("投稿に失敗しました。もう一度お試しください。");
    } finally {
      setSubmitting(false);
    }
  };

  if (storeLoading || authLoading || !hydrated) {
    return (
      <div
        className="flex flex-1 items-center justify-center"
        style={{ backgroundColor: "#f7f6f3" }}
      >
        <div
          className="size-10 animate-spin rounded-full border-4"
          style={{
            borderColor: "rgba(212,175,55,0.2)",
            borderTopColor: "#d4af37",
          }}
        />
      </div>
    );
  }

  // 未認証: フォーム自体は描画せず、ログイン誘導カードに差し替える。
  if (requireLogin) {
    return (
      <div
        className="px-4 py-8"
        style={{ backgroundColor: "#f7f6f3", minHeight: "100%" }}
      >
        <div className="mx-auto max-w-lg">
          <Link
            to={`/stores/${storeId}`}
            className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            店舗詳細に戻る
          </Link>

          <Card>
            <CardHeader className="items-center text-center">
              <div
                className="mb-3 inline-flex size-12 items-center justify-center rounded-full"
                style={{ background: "rgba(212,175,55,0.12)", color: "#b8941f" }}
              >
                <Lock className="size-5" />
              </div>
              <CardTitle className="text-lg">口コミ投稿にはログインが必要です</CardTitle>
              <CardDescription className="text-sm">
                {store?.name ? `「${store.name}」への口コミ投稿に進むには、LINE でログインしてください。` : "LINE でログインすると口コミを投稿できます。"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={handleGoToLogin}
                className="h-12 w-full text-base font-semibold"
                style={{ background: "#06C755", color: "white" }}
              >
                LINE でログインして続ける
              </Button>
              <p className="mt-4 text-center text-xs text-muted-foreground">
                ログイン後、自動でこの画面に戻ります。
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div
      className="px-4 py-8"
      style={{ backgroundColor: "#f7f6f3", minHeight: "100%" }}
    >
      <div className="mx-auto max-w-lg">
        <Link
          to={`/stores/${storeId}`}
          className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          店舗詳細に戻る
        </Link>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">口コミを投稿</CardTitle>
            {store && (
              <CardDescription className="text-base font-medium">
                {store.name}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Star Rating */}
            <div className="space-y-2">
              <Label>評価</Label>
              <div className="flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, i) => {
                  const starValue = i + 1;
                  const active =
                    starValue <= (hoveredRating || rating);
                  return (
                    <button
                      key={i}
                      type="button"
                      className="rounded p-0.5 transition-transform hover:scale-110"
                      onMouseEnter={() => setHoveredRating(starValue)}
                      onMouseLeave={() => setHoveredRating(0)}
                      onClick={() => setRating(starValue)}
                    >
                      <Star
                        className={`size-8 ${
                          active
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-gray-300"
                        }`}
                      />
                    </button>
                  );
                })}
                {rating > 0 && (
                  <span className="ml-2 text-sm text-muted-foreground">
                    {rating}/5
                  </span>
                )}
              </div>
            </div>

            {/* Nickname */}
            <div className="space-y-2">
              <Label htmlFor="review-nickname">
                ニックネーム
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  必須・口コミに表示されます (1〜20文字)
                </span>
              </Label>
              <Input
                id="review-nickname"
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="例: ゆきな"
                maxLength={20}
              />
              <p className="text-xs text-muted-foreground">
                LINE の表示名は使われません。投稿後に保存され、次回からは自動で入力欄に表示されます。
              </p>
            </div>

            {/* Body */}
            <div className="space-y-2">
              <Label htmlFor="review-body">口コミ内容</Label>
              <Textarea
                id="review-body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="お店の雰囲気や働きやすさについて教えてください"
                rows={6}
                className="resize-none"
              />
              <div className="flex items-center justify-between">
                <span
                  className={`text-xs ${
                    body.length > 0 && body.length < MIN_BODY_LENGTH
                      ? "text-destructive"
                      : "text-muted-foreground"
                  }`}
                >
                  {body.length > 0 && body.length < MIN_BODY_LENGTH
                    ? `あと${MIN_BODY_LENGTH - body.length}文字`
                    : `${MIN_BODY_LENGTH}文字以上`}
                </span>
                <span className="text-xs text-muted-foreground">
                  {body.length}文字
                </span>
              </div>
            </div>

            {/* X post quote (optional) */}
            <div className="space-y-2">
              <Label htmlFor="tweet-url" className="flex items-center gap-1.5">
                <XLogo size={14} />
                Xのポストを引用
                <span className="text-xs font-normal text-muted-foreground">（任意）</span>
              </Label>
              <Input
                id="tweet-url"
                type="url"
                value={tweetUrl}
                onChange={(e) => setTweetUrl(e.target.value)}
                placeholder="https://x.com/username/status/1234567890..."
              />
              {tweetId && tweetAuthor ? (
                <div className="rounded-lg border bg-white p-3">
                  <XPostEmbed postId={tweetId} authorHandle={tweetAuthor} />
                </div>
              ) : tweetUrl ? (
                <p className="text-xs text-destructive">URLの形式が正しくありません</p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  XのポストURL（個別ページ）を貼り付けると、口コミに埋め込み表示できます。
                </p>
              )}
            </div>

            {/* Error */}
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            {/* Submit */}
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full"
            >
              {submitting ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : null}
              投稿する
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

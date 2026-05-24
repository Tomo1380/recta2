import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router";
import { Star, ArrowLeft, Loader2 } from "lucide-react";
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
  return [{ title: "口コミを投稿 - Recta" }];
}

const MIN_BODY_LENGTH = 10;

export default function ReviewPage() {
  const { id } = useParams();
  const storeId = Number(id);
  const navigate = useNavigate();
  const { isAuthenticated, loading: authLoading } = useUserAuth();

  const [store, setStore] = useState<Store | null>(null);
  const [storeLoading, setStoreLoading] = useState(true);
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [body, setBody] = useState("");
  const [tweetUrl, setTweetUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => { setHydrated(true); }, []);

  const tweetIdMatch = tweetUrl.match(/https?:\/\/(?:x|twitter|mobile\.twitter)\.com\/([^/]+)\/status\/(\d+)/);
  const tweetId = tweetIdMatch?.[2];
  const tweetAuthor = tweetIdMatch?.[1];

  // Redirect if not authenticated
  useEffect(() => {
    if (hydrated && !authLoading && !isAuthenticated) {
      // ログイン後にこの口コミ投稿フォームへ自動で戻れるよう、return-to を保存。
      sessionStorage.setItem("recta:login-return-to", `/stores/${storeId}/review`);
      navigate(`/login`);
    }
  }, [hydrated, authLoading, isAuthenticated, navigate, storeId]);

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

  if (storeLoading || authLoading) {
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

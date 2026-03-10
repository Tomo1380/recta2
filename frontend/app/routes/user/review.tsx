import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router";
import { Star, ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Textarea } from "~/components/ui/textarea";
import { Label } from "~/components/ui/label";
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
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate(`/login`);
    }
  }, [authLoading, isAuthenticated, navigate]);

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

    setSubmitting(true);
    try {
      await userApi.post(`/stores/${storeId}/reviews`, {
        rating,
        body,
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
        className="flex min-h-screen items-center justify-center"
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
      className="min-h-screen px-4 py-8"
      style={{ backgroundColor: "#f7f6f3" }}
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

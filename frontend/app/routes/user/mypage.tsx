import { useState, useEffect, useCallback } from "react";
import { useNavigate, Link } from "react-router";
import { Star, Trash2, Save, Loader2, ArrowLeft } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "~/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Separator } from "~/components/ui/separator";
import { Badge } from "~/components/ui/badge";
import { useUserAuth } from "~/lib/user-auth";
import { userApi } from "~/lib/api";
import type { User, Review } from "~/lib/types";

export function meta() {
  return [{ title: "マイページ - Recta" }];
}

const AREA_OPTIONS = [
  "渋谷",
  "新宿",
  "六本木",
  "銀座",
  "池袋",
  "恵比寿",
  "麻布十番",
  "表参道",
  "その他",
];

const CATEGORY_OPTIONS = [
  "キャバクラ",
  "ラウンジ",
  "クラブ",
  "ガールズバー",
  "コンカフェ",
];

const EXPERIENCE_OPTIONS = [
  { value: "none", label: "未経験" },
  { value: "beginner", label: "半年未満" },
  { value: "intermediate", label: "半年〜1年" },
  { value: "experienced", label: "1年〜3年" },
  { value: "veteran", label: "3年以上" },
];

export default function MyPage() {
  const { user, isAuthenticated, loading: authLoading, logout } = useUserAuth();
  const navigate = useNavigate();

  const [nickname, setNickname] = useState("");
  const [age, setAge] = useState("");
  const [preferredArea, setPreferredArea] = useState("");
  const [preferredCategory, setPreferredCategory] = useState("");
  const [experience, setExperience] = useState("");
  const [bio, setBio] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate("/login");
    }
  }, [authLoading, isAuthenticated, navigate]);

  // Populate form when user data loads
  useEffect(() => {
    if (user) {
      setNickname(user.nickname ?? "");
      setAge(user.age?.toString() ?? "");
      setPreferredArea(user.preferred_area ?? "");
      setPreferredCategory(user.preferred_category ?? "");
      setExperience(user.experience ?? "");
      setBio((user as User & { bio?: string }).bio ?? "");
    }
  }, [user]);

  // Fetch user reviews
  const fetchReviews = useCallback(async () => {
    try {
      setReviewsLoading(true);
      const data = await userApi.get<{ data: Review[] }>("/user/reviews");
      setReviews(data.data ?? data as unknown as Review[]);
    } catch {
      // ignore
    } finally {
      setReviewsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchReviews();
    }
  }, [isAuthenticated, fetchReviews]);

  const handleSave = async () => {
    setSaving(true);
    setSaveMessage("");
    try {
      await userApi.put("/user/profile", {
        nickname: nickname || null,
        age: age ? Number(age) : null,
        preferred_area: preferredArea || null,
        preferred_category: preferredCategory || null,
        experience: experience || null,
        bio: bio || null,
      });
      setSaveMessage("保存しました");
      setTimeout(() => setSaveMessage(""), 3000);
    } catch {
      setSaveMessage("保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteReview = async (reviewId: number) => {
    try {
      await userApi.delete(`/user/reviews/${reviewId}`);
      setReviews((prev) => prev.filter((r) => r.id !== reviewId));
    } catch {
      // ignore
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  if (authLoading || !user) {
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
    <div className="min-h-screen pb-12" style={{ backgroundColor: "#f7f6f3" }}>
      {/* Header */}
      <div
        className="px-4 py-6"
        style={{
          background:
            "linear-gradient(180deg, #1b2528 0%, #243034 100%)",
        }}
      >
        <div className="mx-auto max-w-2xl">
          <Link
            to="/"
            className="mb-4 inline-flex items-center gap-1 text-sm text-white/60 hover:text-white/80"
          >
            <ArrowLeft className="size-4" />
            トップへ戻る
          </Link>
          <div className="flex items-center gap-4">
            <Avatar className="size-16 border-2 border-white/20">
              <AvatarImage
                src={user.line_picture_url ?? undefined}
                alt={user.line_display_name ?? "User"}
              />
              <AvatarFallback className="text-lg">
                {(user.nickname ?? user.line_display_name ?? "U").charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-xl font-bold text-white">
                {user.nickname ?? user.line_display_name ?? "ユーザー"}
              </h1>
              <p className="text-sm text-white/60">
                {user.line_display_name
                  ? `LINE: ${user.line_display_name}`
                  : ""}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-2xl space-y-6 px-4 pt-6">
        {/* Profile Edit */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">プロフィール編集</CardTitle>
            <CardDescription>
              あなたの情報を登録すると、より適したお店をおすすめできます
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nickname">ニックネーム</Label>
              <Input
                id="nickname"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="表示名を入力"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="age">年齢</Label>
              <Input
                id="age"
                type="number"
                min={18}
                max={99}
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="年齢を入力"
              />
            </div>

            <div className="space-y-2">
              <Label>希望エリア</Label>
              <Select value={preferredArea} onValueChange={setPreferredArea}>
                <SelectTrigger>
                  <SelectValue placeholder="エリアを選択" />
                </SelectTrigger>
                <SelectContent>
                  {AREA_OPTIONS.map((a) => (
                    <SelectItem key={a} value={a}>
                      {a}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>希望業種</Label>
              <Select
                value={preferredCategory}
                onValueChange={setPreferredCategory}
              >
                <SelectTrigger>
                  <SelectValue placeholder="業種を選択" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_OPTIONS.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>経験</Label>
              <Select value={experience} onValueChange={setExperience}>
                <SelectTrigger>
                  <SelectValue placeholder="経験を選択" />
                </SelectTrigger>
                <SelectContent>
                  {EXPERIENCE_OPTIONS.map((e) => (
                    <SelectItem key={e.value} value={e.value}>
                      {e.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">自己紹介</Label>
              <Textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="簡単な自己紹介を書いてください"
                rows={3}
              />
            </div>

            <div className="flex items-center gap-3">
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <Save className="mr-2 size-4" />
                )}
                保存する
              </Button>
              {saveMessage && (
                <span
                  className={`text-sm ${saveMessage.includes("失敗") ? "text-destructive" : "text-green-600"}`}
                >
                  {saveMessage}
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Reviews */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">投稿した口コミ</CardTitle>
            <CardDescription>
              {reviews.length > 0
                ? `${reviews.length}件の口コミ`
                : "まだ口コミを投稿していません"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {reviewsLoading ? (
              <div className="flex justify-center py-8">
                <div
                  className="size-8 animate-spin rounded-full border-4"
                  style={{
                    borderColor: "rgba(212,175,55,0.2)",
                    borderTopColor: "#d4af37",
                  }}
                />
              </div>
            ) : reviews.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                <p>口コミを投稿すると、ここに表示されます</p>
                <Link
                  to="/stores"
                  className="mt-2 inline-block text-primary underline"
                >
                  お店を探す
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {reviews.map((review) => (
                  <div key={review.id}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          {review.store && (
                            <Link
                              to={`/stores/${review.store_id}`}
                              className="font-medium hover:underline"
                            >
                              {review.store.name}
                            </Link>
                          )}
                          <Badge variant="outline" className="text-xs">
                            {review.status === "published"
                              ? "公開中"
                              : review.status === "unpublished"
                                ? "非公開"
                                : "削除済み"}
                          </Badge>
                        </div>
                        <div className="mt-1 flex items-center gap-1">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={`size-3.5 ${
                                i < review.rating
                                  ? "fill-yellow-400 text-yellow-400"
                                  : "text-gray-300"
                              }`}
                            />
                          ))}
                          <span className="ml-2 text-xs text-muted-foreground">
                            {new Date(review.created_at).toLocaleDateString(
                              "ja-JP",
                            )}
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground">
                          {review.body}
                        </p>
                      </div>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="shrink-0 text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              口コミを削除しますか？
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              この操作は取り消せません。口コミは完全に削除されます。
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>キャンセル</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteReview(review.id)}
                            >
                              削除する
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                    <Separator className="mt-4" />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Logout */}
        <div className="text-center">
          <Button variant="outline" onClick={handleLogout}>
            ログアウト
          </Button>
        </div>
      </div>
    </div>
  );
}

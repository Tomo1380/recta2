<?php

namespace App\Http\Controllers;

use App\Http\Requests\User\StoreReviewRequest;
use App\Http\Resources\ReviewResource;
use App\Models\Review;
use App\Models\Store;
use App\Support\PaginatorWithResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PublicReviewController extends Controller
{
    /**
     * 口コミ投稿
     */
    public function store(StoreReviewRequest $request, Store $store): JsonResponse|ReviewResource
    {
        $validated = $request->validated();

        $tweetId = null;
        $tweetAuthor = null;
        if (! empty($validated['tweet_url'])) {
            if (preg_match('#https?://(?:x|twitter|mobile\.twitter)\.com/([^/]+)/status/(\d+)#', $validated['tweet_url'], $m)) {
                $tweetAuthor = $m[1];
                $tweetId = $m[2];
            } else {
                return response()->json([
                    'message' => 'XのポストURLを正しく貼り付けてください',
                ], 422);
            }
        }

        $exists = Review::where('user_id', $request->user()->id)
            ->where('store_id', $store->id)
            ->where('status', '!=', 'deleted')
            ->exists();

        if ($exists) {
            return response()->json([
                'message' => 'この店舗には既に口コミを投稿済みです',
            ], 422);
        }

        try {
            $review = Review::create([
                'user_id' => $request->user()->id,
                'store_id' => $store->id,
                'rating' => $validated['rating'],
                'body' => $validated['body'],
                'tweet_id' => $tweetId,
                'tweet_author_screen_name' => $tweetAuthor,
                'status' => 'published',
            ]);
        } catch (\Illuminate\Database\UniqueConstraintViolationException $e) {
            // 並行リクエストで exists() チェックをすり抜けた二重投稿は
            // 部分ユニークインデックス (reviews_user_store_active_unique) が弾く。
            return response()->json([
                'message' => 'この店舗には既に口コミを投稿済みです',
            ], 422);
        }

        $review->load('store:id,name');
        return new ReviewResource($review);
    }

    /**
     * 自分の口コミ一覧
     *
     * @response array{
     *   data: ReviewResource[],
     *   current_page: int,
     *   last_page: int,
     *   per_page: int,
     *   total: int
     * }
     */
    public function userReviews(Request $request): JsonResponse
    {
        $reviews = Review::with('store:id,name,area,category')
            ->where('user_id', $request->user()->id)
            ->where('status', '!=', 'deleted')
            ->orderByDesc('created_at')
            ->paginate(20);

        return response()->json(PaginatorWithResource::map($reviews, ReviewResource::class));
    }

    /**
     * 自分の口コミを削除（ソフトデリート）
     */
    public function destroy(Request $request, Review $review): JsonResponse
    {
        if ($review->user_id !== $request->user()->id) {
            return response()->json([
                'message' => '他のユーザーの口コミは削除できません',
            ], 403);
        }

        $review->update(['status' => 'deleted']);

        return response()->json(['message' => '口コミを削除しました']);
    }
}

<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Admin\Concerns\SortsListByDate;
use App\Http\Requests\Admin\StoreReviewRequest;
use App\Http\Requests\Admin\UpdateReviewRequest;
use App\Http\Requests\Admin\UpdateReviewStatusRequest;
use App\Http\Resources\ReviewResource;
use App\Models\Review;
use App\Support\PaginatorWithResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReviewController extends Controller
{
    use SortsListByDate;

    /**
     * @response array{
     *   data: ReviewResource[],
     *   current_page: int,
     *   last_page: int,
     *   per_page: int,
     *   total: int
     * }
     */
    public function index(Request $request): JsonResponse
    {
        $query = Review::with([
            'user:id,line_display_name,nickname,line_picture_url,use_line_avatar',
            'store:id,name',
        ]);

        if ($storeId = $request->input('store_id')) {
            $query->where('store_id', $storeId);
        }
        if ($rating = $request->input('rating')) {
            $query->where('rating', $rating);
        }
        if ($status = $request->input('status')) {
            $query->where('status', $status);
        }
        // 投稿者で絞り込み (B1: 投稿者タップ → 過去の口コミ一覧)。
        if ($userId = $request->input('user_id')) {
            $query->where('user_id', $userId);
        }
        // フリーワード検索: ユーザー名 (LINE表示名 / ニックネーム) / 表示名 / 店舗名。
        if ($search = trim((string) $request->input('search'))) {
            $query->where(function ($q) use ($search) {
                $q->whereHas('user', function ($u) use ($search) {
                    $u->where('line_display_name', 'ilike', "%{$search}%")
                      ->orWhere('nickname', 'ilike', "%{$search}%");
                })->orWhere('author_name', 'ilike', "%{$search}%")
                  ->orWhereHas('store', function ($s) use ($search) {
                    $s->where('name', 'ilike', "%{$search}%");
                });
            });
        }

        $reviews = $this->applyListSort($query, $request)
            ->paginate($request->input('per_page', 20));

        return response()->json(PaginatorWithResource::map($reviews, ReviewResource::class));
    }

    public function show(Review $review): ReviewResource
    {
        $review->load([
            'user:id,line_display_name,nickname,line_picture_url,use_line_avatar',
            'store:id,name',
        ]);
        return new ReviewResource($review);
    }

    public function updateStatus(UpdateReviewStatusRequest $request, Review $review): ReviewResource
    {
        $review->update(['status' => $request->validated()['status']]);
        return new ReviewResource($review);
    }

    /**
     * 管理者による口コミ作成（桜口コミ B2 / 有名キャバ嬢口コミ B3）。
     * 実ユーザーに紐付かないため user_id は null。
     */
    public function store(StoreReviewRequest $request): ReviewResource
    {
        $data = $request->validated();
        $data['status'] = $data['status'] ?? 'published';
        $data['user_id'] = null;
        if (!empty($data['store_reply'])) {
            $data['store_reply_at'] = now();
        }

        $review = Review::create($data);
        $review->load(['store:id,name']);

        return new ReviewResource($review);
    }

    /**
     * 管理者による口コミ更新（本文/評価/表示名/フィーチャー/店側返答 B4/ステータス）。
     */
    public function update(UpdateReviewRequest $request, Review $review): ReviewResource
    {
        $data = $request->validated();

        // 店側返答 (B4) の入力/クリア時刻を記録。
        if (array_key_exists('store_reply', $data)) {
            $data['store_reply_at'] = trim((string) ($data['store_reply'] ?? '')) !== '' ? now() : null;
        }

        $review->update($data);
        $review->load([
            'user:id,line_display_name,nickname,line_picture_url,use_line_avatar',
            'store:id,name',
        ]);

        return new ReviewResource($review);
    }
}

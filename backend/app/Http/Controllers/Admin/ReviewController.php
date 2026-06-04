<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Admin\Concerns\SortsListByDate;
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
        // フリーワード検索: ユーザー名 (LINE表示名 / ニックネーム) または店舗名。
        if ($search = trim((string) $request->input('search'))) {
            $query->where(function ($q) use ($search) {
                $q->whereHas('user', function ($u) use ($search) {
                    $u->where('line_display_name', 'ilike', "%{$search}%")
                      ->orWhere('nickname', 'ilike', "%{$search}%");
                })->orWhereHas('store', function ($s) use ($search) {
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
}

<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\UpdateReviewStatusRequest;
use App\Http\Resources\ReviewResource;
use App\Models\Review;
use App\Support\PaginatorWithResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReviewController extends Controller
{
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

        $reviews = $query->orderBy('created_at', 'desc')
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

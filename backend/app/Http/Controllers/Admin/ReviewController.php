<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Review;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReviewController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Review::with(['user:id,line_display_name', 'store:id,name']);

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

        return response()->json($reviews);
    }

    public function show(Review $review): JsonResponse
    {
        $review->load(['user:id,line_display_name,line_picture_url', 'store:id,name']);

        return response()->json($review);
    }

    public function updateStatus(Request $request, Review $review): JsonResponse
    {
        $request->validate([
            'status' => 'required|in:published,unpublished,deleted',
        ]);

        $review->update(['status' => $request->status]);

        return response()->json($review);
    }
}

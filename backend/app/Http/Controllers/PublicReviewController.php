<?php

namespace App\Http\Controllers;

use App\Models\Review;
use App\Models\Store;
use Illuminate\Http\Request;

class PublicReviewController extends Controller
{
    /**
     * 口コミ投稿
     */
    public function store(Request $request, Store $store)
    {
        $validated = $request->validate([
            'rating' => 'required|integer|min:1|max:5',
            'body' => 'required|string|min:10',
            'tweet_url' => 'nullable|string|max:500',
        ]);

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

        $review = Review::create([
            'user_id' => $request->user()->id,
            'store_id' => $store->id,
            'rating' => $validated['rating'],
            'body' => $validated['body'],
            'tweet_id' => $tweetId,
            'tweet_author_screen_name' => $tweetAuthor,
            'status' => 'published',
        ]);

        return response()->json($review->load('store'), 201);
    }

    /**
     * 自分の口コミ一覧
     */
    public function userReviews(Request $request)
    {
        $reviews = Review::with('store:id,name,area,category')
            ->where('user_id', $request->user()->id)
            ->where('status', '!=', 'deleted')
            ->orderByDesc('created_at')
            ->paginate(20);

        return response()->json($reviews);
    }

    /**
     * 自分の口コミを削除（ソフトデリート）
     */
    public function destroy(Request $request, Review $review)
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

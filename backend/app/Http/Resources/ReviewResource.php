<?php

namespace App\Http\Resources;

use App\Models\Review;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Review
 */
class ReviewResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'user_id' => $this->user_id,
            'store_id' => $this->store_id,
            'rating' => (int) $this->rating,
            'body' => $this->body,
            'tweet_id' => $this->tweet_id,
            'tweet_author_screen_name' => $this->tweet_author_screen_name,
            'status' => $this->status,
            // 管理者運用フィールド (FB B)
            'author_name' => $this->author_name,
            'is_featured' => (bool) $this->is_featured,
            'store_reply' => $this->store_reply,
            'store_reply_at' => $this->store_reply_at?->toIso8601String(),
            'display_author_name' => $this->displayAuthorName(),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),

            // Lightweight relationships — only included when eager-loaded.
            'user' => $this->whenLoaded('user', function () {
                return [
                    'id' => $this->user->id,
                    'line_display_name' => $this->user->line_display_name,
                    'nickname' => $this->user->nickname,
                    'line_picture_url' => $this->user->line_picture_url,
                    'use_line_avatar' => (bool) ($this->user->use_line_avatar ?? false),
                ];
            }),
            'store' => $this->whenLoaded('store', function () {
                return [
                    'id' => $this->store->id,
                    'name' => $this->store->name,
                    'area' => $this->store->area ?? null,
                    'category' => $this->store->category ?? null,
                ];
            }),
        ];
    }
}

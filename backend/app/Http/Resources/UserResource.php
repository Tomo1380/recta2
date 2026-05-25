<?php

namespace App\Http\Resources;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin User
 */
class UserResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'line_user_id' => $this->line_user_id,
            'line_display_name' => $this->line_display_name,
            'line_picture_url' => $this->line_picture_url,
            'use_line_avatar' => (bool) $this->use_line_avatar,

            // プロフィール
            'nickname' => $this->nickname,
            'age' => $this->age !== null ? (int) $this->age : null,
            'preferred_area' => $this->preferred_area,
            'preferred_category' => $this->preferred_category,
            'experience' => $this->experience,
            'bio' => $this->bio,

            // 運用
            'admin_notes' => $this->admin_notes,
            'status' => $this->status,
            'last_login_at' => $this->last_login_at?->toIso8601String(),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),

            // 関連
            'reviews_count' => isset($this->reviews_count) ? (int) $this->reviews_count : null,
            'reviews' => $this->whenLoaded('reviews', function () {
                return $this->reviews->map(function ($r) {
                    return [
                        'id' => $r->id,
                        'store_id' => $r->store_id,
                        'rating' => (int) $r->rating,
                        'body' => $r->body,
                        'status' => $r->status,
                        'created_at' => $r->created_at?->toIso8601String(),
                        'updated_at' => $r->updated_at?->toIso8601String(),
                        'store' => $r->relationLoaded('store') && $r->store ? [
                            'id' => $r->store->id,
                            'name' => $r->store->name,
                        ] : null,
                    ];
                });
            }),
            'line_friend' => $this->whenLoaded('lineFriend', function () {
                return $this->lineFriend ? [
                    'id' => $this->lineFriend->id,
                    'is_following' => (bool) $this->lineFriend->is_following,
                    'followed_at' => $this->lineFriend->followed_at?->toIso8601String(),
                    'unfollowed_at' => $this->lineFriend->unfollowed_at?->toIso8601String(),
                ] : null;
            }),
        ];
    }
}

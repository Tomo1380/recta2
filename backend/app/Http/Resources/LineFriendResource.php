<?php

namespace App\Http\Resources;

use App\Models\LineFriend;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin LineFriend
 */
class LineFriendResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'user_id' => $this->user_id,
            'line_user_id' => $this->line_user_id,
            // display_name = LINE 本来の名前 / admin_name = 管理用の別名。
            // name = 表示用の解決名 (admin_name 優先)。
            'display_name' => $this->display_name,
            'admin_name' => $this->admin_name,
            'name' => $this->admin_name
                ?: $this->display_name
                ?: ($this->user?->nickname)
                ?: ($this->user?->line_display_name)
                ?: null,
            'picture_url' => $this->picture_url,
            'followed_at' => $this->followed_at?->toIso8601String(),
            'unfollowed_at' => $this->unfollowed_at?->toIso8601String(),
            'is_following' => (bool) $this->is_following,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),

            // withCount('messages') が走ったときだけ messages_count が付く。
            'messages_count' => isset($this->messages_count) ? (int) $this->messages_count : null,

            'user' => $this->whenLoaded('user', function () {
                return [
                    'id' => $this->user->id,
                    'line_display_name' => $this->user->line_display_name,
                    'nickname' => $this->user->nickname,
                ];
            }),
        ];
    }
}

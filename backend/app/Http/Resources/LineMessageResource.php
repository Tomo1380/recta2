<?php

namespace App\Http\Resources;

use App\Models\LineMessage;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin LineMessage
 */
class LineMessageResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'line_user_id' => $this->line_user_id,
            'user_id' => $this->user_id,
            'direction' => $this->direction,
            'message_type' => $this->message_type,
            'content' => $this->content,
            'content_meta' => $this->content_meta, // JSONB (free-form)
            'line_message_id' => $this->line_message_id,
            'read_at' => $this->read_at?->toIso8601String(),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}

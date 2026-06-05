<?php

namespace App\Http\Resources;

use App\Models\TrackingLink;
use App\Services\Analytics\TrackingLinkService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin TrackingLink
 */
class TrackingLinkResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'code' => $this->code,
            'label' => $this->label,
            'target_type' => $this->target_type,
            'store_id' => $this->store_id,
            'article_id' => $this->article_id,
            'area' => $this->area,
            'destination_url' => $this->destination_url,
            'is_active' => (bool) $this->is_active,
            'public_url' => app(TrackingLinkService::class)->publicUrl($this->resource),
            'clicks_count' => $this->whenCounted('clicks'),
            'created_at' => $this->created_at?->toIso8601String(),
            'store_name' => $this->whenLoaded('store', fn () => $this->store?->name),
            'article_title' => $this->whenLoaded('article', fn () => $this->article?->title),
        ];
    }
}

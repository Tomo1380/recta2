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
            'destination_url' => $this->destination_url,
            'is_active' => (bool) $this->is_active,
            'public_url' => app(TrackingLinkService::class)->publicUrl($this->resource),
            'clicks_count' => $this->whenCounted('clicks'),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}

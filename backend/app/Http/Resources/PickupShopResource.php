<?php

namespace App\Http\Resources;

use App\Models\PickupShop;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin PickupShop
 */
class PickupShopResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'store_id' => $this->store_id,
            'sort_order' => (int) $this->sort_order,
            'is_pr' => (bool) $this->is_pr,
            'visible' => (bool) $this->visible,
            'store' => $this->whenLoaded('store', function () {
                return [
                    'id' => $this->store->id,
                    'name' => $this->store->name,
                    'area' => $this->store->area,
                    'category' => $this->store->category,
                    // controller 側で append される動的フィールド。一覧 endpoint でだけ付く。
                    'average_rating' => isset($this->store->average_rating)
                        ? (float) $this->store->average_rating
                        : null,
                ];
            }),
        ];
    }
}

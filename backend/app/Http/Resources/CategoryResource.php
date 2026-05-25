<?php

namespace App\Http\Resources;

use App\Models\Category;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Category
 */
class CategoryResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'slug' => $this->slug,
            'image_url' => $this->image_url,
            'visible' => (bool) $this->visible,
            'sort_order' => (int) $this->sort_order,
            // 管理画面の一覧で「このカテゴリに紐づく店舗数」を出すための
            // 動的フィールド。詳しくは AreaResource 参照。
            'shop_count' => isset($this->shop_count) ? (int) $this->shop_count : null,
        ];
    }
}

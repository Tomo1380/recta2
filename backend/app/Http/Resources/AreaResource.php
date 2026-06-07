<?php

namespace App\Http\Resources;

use App\Models\Area;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Area
 */
class AreaResource extends JsonResource
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
            'visible' => (bool) $this->visible,
            'sort_order' => (int) $this->sort_order,
            // 中心座標。トップのピックアップ近隣ソートに使う。管理画面で
            // エリア作成/改名時に geocode 自動セット (未取得なら null)。
            'lat' => $this->lat !== null ? (float) $this->lat : null,
            'lng' => $this->lng !== null ? (float) $this->lng : null,
            // 管理画面の一覧で「このエリアに紐づく店舗数」を出すために
            // controller 側で append される動的フィールド。set されていない
            // endpoint では null になる。フロント側は null/undefined 双方を
            // 「不明」として扱えば良い。
            'shop_count' => isset($this->shop_count) ? (int) $this->shop_count : null,
        ];
    }
}

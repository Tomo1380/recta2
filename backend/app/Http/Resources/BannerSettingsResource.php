<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * banner_* 系の SiteSettings を 4 キー固定で返すための flat DTO。
 *
 * controller 側で `['hero_tagline' => ..., 'hero_subtitle' => ..., ...]`
 * の連想配列を渡す → そのまま toArray で公開。
 *
 * @property string|null $hero_tagline
 * @property string|null $hero_subtitle
 * @property string|null $hero_badge
 * @property string|null $hero_ai_label
 * @property string|null $hero_image_url
 */
class BannerSettingsResource extends JsonResource
{
    /**
     * @return array<string, string|null>
     */
    public function toArray(Request $request): array
    {
        return [
            'hero_tagline' => $this->resource['hero_tagline'] ?? null,
            'hero_subtitle' => $this->resource['hero_subtitle'] ?? null,
            'hero_badge' => $this->resource['hero_badge'] ?? null,
            'hero_ai_label' => $this->resource['hero_ai_label'] ?? null,
            'hero_image_url' => $this->resource['hero_image_url'] ?? null,
        ];
    }
}

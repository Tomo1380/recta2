<?php

namespace App\Http\Resources;

use App\Models\Article;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Lightweight article payload — for list pages and "related" sections.
 * body / body_html を含まないので転送量を抑えられる。
 *
 * @mixin Article
 */
class ArticleSummaryResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'slug' => $this->slug,
            'title' => $this->title,
            'excerpt' => $this->excerpt,
            'thumbnail_url' => $this->thumbnail_url,
            'category' => $this->category,
            'tags' => $this->tags,
            'published_at' => $this->published_at?->toIso8601String(),
        ];
    }
}

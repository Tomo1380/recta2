<?php

namespace App\Http\Resources;

use App\Models\Article;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Full article payload — for admin/detail show.
 *
 * @mixin Article
 */
class ArticleResource extends JsonResource
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
            'body' => $this->body, // TipTap JSON
            'body_html' => $this->body_html,
            'thumbnail_url' => $this->thumbnail_url,
            'category' => $this->category,
            'tags' => $this->tags,
            'status' => $this->status,
            'published_at' => $this->published_at?->toIso8601String(),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),

            // C1: コラム分析（作成者 / 文字数 / PV / LINE導線）。
            'author_id' => $this->author_id,
            'author_name' => $this->whenLoaded('creator', fn () => $this->creator?->name),
            'char_count' => $this->char_count,
            // index() が付与したときだけ出す（show では未集計）。
            'pv_count' => $this->when(isset($this->pv_count), fn () => (int) $this->pv_count),
            'line_clicks_count' => $this->when(isset($this->line_clicks_count), fn () => (int) $this->line_clicks_count),
        ];
    }
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Article extends Model
{
    use HasFactory;

    protected $fillable = [
        'slug',
        'title',
        'excerpt',
        'body',
        'body_html',
        'thumbnail_url',
        'category',
        'tags',
        'status',
        'published_at',
    ];

    protected function casts(): array
    {
        return [
            'body' => 'array',
            'tags' => 'array',
            'published_at' => 'datetime',
        ];
    }

    /**
     * Plain-text version of body, for AI knowledge search.
     */
    public function getBodyPlainTextAttribute(): string
    {
        if (!$this->body_html) {
            return '';
        }
        return trim(preg_replace('/\s+/u', ' ', strip_tags($this->body_html)));
    }

    public function scopePublished($query)
    {
        return $query->where('status', 'published')
            ->whereNotNull('published_at')
            ->where('published_at', '<=', now());
    }
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class IndustryKnowledge extends Model
{
    protected $table = 'industry_knowledges';

    protected $fillable = [
        'category',
        'slug',
        'title',
        'keywords',
        'content',
        'sort_order',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'keywords' => 'array',
            'is_active' => 'boolean',
        ];
    }
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Area extends Model
{
    protected $fillable = [
        'name',
        'slug',
        'tier',
        'visible',
        'sort_order',
    ];

    protected $casts = [
        'visible' => 'boolean',
    ];
}

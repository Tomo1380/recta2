<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Category extends Model
{
    protected $fillable = [
        'name',
        'slug',
        'image_url',
        'visible',
        'sort_order',
    ];

    protected $casts = [
        'visible' => 'boolean',
    ];
}

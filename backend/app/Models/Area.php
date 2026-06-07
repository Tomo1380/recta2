<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Area extends Model
{
    protected $fillable = [
        'name',
        'slug',
        'visible',
        'sort_order',
        'lat',
        'lng',
    ];

    protected $casts = [
        'visible' => 'boolean',
        'lat' => 'float',
        'lng' => 'float',
    ];
}

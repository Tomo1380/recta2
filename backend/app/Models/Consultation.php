<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Consultation extends Model
{
    protected $fillable = [
        'question',
        'answer',
        'tag',
        'count',
        'visible',
        'sort_order',
    ];

    protected $casts = [
        'visible' => 'boolean',
    ];
}

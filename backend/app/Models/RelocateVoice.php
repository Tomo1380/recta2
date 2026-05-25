<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class RelocateVoice extends Model
{
    protected $fillable = [
        'area_from',
        'area_to',
        'body',
        'visible',
        'display_order',
    ];

    protected $casts = [
        'visible' => 'boolean',
        'display_order' => 'integer',
    ];
}

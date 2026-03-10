<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AiChatSetting extends Model
{
    protected $fillable = [
        'page_type',
        'enabled',
        'system_prompt',
        'tone',
        'suggest_buttons',
    ];

    protected $casts = [
        'enabled' => 'boolean',
        'suggest_buttons' => 'array',
    ];
}

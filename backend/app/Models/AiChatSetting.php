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
        'openai_finetuned_model',
        'suggest_categories',
        'suggest_display_mode',
    ];

    protected $casts = [
        'enabled' => 'boolean',
        'suggest_categories' => 'array',
    ];

    public const DISPLAY_MODES = ['off', 'chips_only', 'categorized'];
}

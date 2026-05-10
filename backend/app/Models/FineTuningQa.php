<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class FineTuningQa extends Model
{
    use HasFactory;

    protected $table = 'fine_tuning_qa';

    public const STATUS_ACTIVE = 'active';
    public const STATUS_DRAFT = 'draft';
    public const STATUS_ARCHIVED = 'archived';

    protected $fillable = [
        'category',
        'question',
        'answer',
        'tags',
        'source',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'tags' => 'array',
        ];
    }
}

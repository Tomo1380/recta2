<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * 人物 (line_user_id 単位) の CRM 属性。LineFriend / User とは独立し、
 * line_user_id で紐づく。詳細は migration 参照。
 */
class PersonProfile extends Model
{
    /** 入店進捗の取りうる値。 */
    public const STATUSES = [
        'none',            // 未対応
        'consulting',      // 相談中
        'trial_scheduled', // 体入予定
        'trial_done',      // 体入済
        'joined',          // 入店済
        'passed',          // 見送り
    ];

    protected $fillable = [
        'line_user_id',
        'placement_status',
        'interested_area',
        'wants_relocation',
        'referral_source',
    ];

    protected $casts = [
        'wants_relocation' => 'boolean',
    ];
}

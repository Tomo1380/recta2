<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * 人物 (line_user_id 単位) の CRM 属性。LineFriend / User とは独立し、
 * line_user_id で紐づく。詳細は migration 参照。
 */
class PersonProfile extends Model
{
    /**
     * 入店進捗の取りうる値。ナイトワークの採用フロー
     * (LINE相談 → 店舗紹介 → 面接・体入 → 本入店 → 在籍 → 退店/離脱) に対応。
     */
    public const STATUSES = [
        'new',              // 新規（未対応）
        'consulting',       // 相談中（ヒアリング）
        'store_introduced', // 店舗紹介済み
        'trial_scheduled',  // 面接・体入予定
        'trial_done',       // 体入済
        'joined',           // 入店・在籍中
        'left',             // 退店
        'lost',             // 見送り・連絡途絶
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

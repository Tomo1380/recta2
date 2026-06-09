<?php

namespace Database\Seeders;

use App\Models\AiChatSetting;
use Illuminate\Database\Seeder;

/**
 * AI チャット設定の初期データ。
 *
 * suggest_categories は 2 層構造:
 *   L1 (label/sub のタブ) → L2 (chips の質問例)
 *
 * UI 側は L1 タップ → L2 chips を chipPop アニメで stagger 表示する。
 *
 * 本 seeder は ProductionSeeder からも呼ばれる (冪等: 既存行があれば
 * AiChatSetting::count() で skip される)。
 */
class AiChatSettingSeeder extends Seeder
{
    public function run(): void
    {
        AiChatSetting::create([
            'page_type' => 'top',
            'enabled' => true,
            'system_prompt' => 'あなたはナイトワーク求人サイト「Recta」のAIアシスタントです。求職者の不安を解消し、最適なお店を提案してください。丁寧でフレンドリーな口調で対応してください。',
            'tone' => 'friendly',
            'suggest_display_mode' => 'categorized',
            'suggest_categories' => [
                [
                    'id' => 'ask',
                    'label' => '質問する',
                    'sub' => 'AIに直接聞いてみる',
                    'chips' => [
                        '未経験でも大丈夫？',
                        'ノルマなしのお店は？',
                        '給与の相場を教えて',
                        '日払いできる？',
                        '昼職と掛け持ちできる？',
                    ],
                ],
                [
                    'id' => 'talk',
                    'label' => '状況を話す',
                    'sub' => '自分の状況をAIに伝える',
                    'chips' => [
                        '週2〜3日だけ働きたい',
                        '昼職があって夜も働きたい',
                        '人見知りでも大丈夫？',
                        '子育て中でも働ける？',
                        '体験入店が怖い',
                    ],
                ],
                [
                    'id' => 'worry',
                    'label' => '不安を解消',
                    'sub' => '本音の心配をそのまま',
                    'chips' => [
                        'バレないか心配',
                        '安全なお店を探したい',
                        '初日の流れは？',
                        '面接はどんな感じ？',
                        '体験入店って何？',
                    ],
                ],
                [
                    'id' => 'cond',
                    'label' => '条件で絞る',
                    'sub' => '希望条件をそのまま入力',
                    'chips' => [
                        '渋谷・恵比寿エリア',
                        '月収50万以上',
                        '送迎あり',
                        '個室あり',
                        'ノルマなし・自由出勤',
                    ],
                ],
            ],
        ]);

        AiChatSetting::create([
            'page_type' => 'list',
            'enabled' => true,
            'system_prompt' => 'あなたはナイトワーク求人サイト「Recta」のAIアシスタントです。一覧画面でユーザーが店舗を絞り込む手助けをしてください。条件に合ったお店をおすすめしてください。',
            'tone' => 'friendly',
            // 店舗一覧では chips_only: L1 タブを出さずフラットなチップで素早く絞り込ませる。
            // chips_only は label/sub を描画せず chips だけをフラット表示するため、
            // 1 カテゴリに絞り込み意図の高いチップを厳選して入れている。
            'suggest_display_mode' => 'chips_only',
            'suggest_categories' => [
                [
                    'id' => 'filter',
                    'label' => '条件で絞る',
                    'sub' => '気になる条件をタップ',
                    'chips' => [
                        '高時給な順で見たい',
                        '体入できるお店',
                        '日払いOKのお店',
                        'ノルマなしのお店',
                        '未経験歓迎のお店',
                        '今人気のお店',
                    ],
                ],
            ],
        ]);

        AiChatSetting::create([
            'page_type' => 'detail',
            'enabled' => true,
            'system_prompt' => 'あなたはナイトワーク求人サイト「Recta」のAIアシスタントです。この店舗の詳細について質問に答えてください。店舗情報を元に正確に回答してください。',
            'tone' => 'friendly',
            // 店舗詳細でも chips_only: その店について気になる点をフラットなチップで即タップ。
            // chips_only は label/sub を描画しないため、1 カテゴリに集約している。
            'suggest_display_mode' => 'chips_only',
            'suggest_categories' => [
                [
                    'id' => 'about',
                    'label' => 'このお店について',
                    'sub' => '気になることをタップ',
                    'chips' => [
                        '体入の流れと時給',
                        'バック・保証の詳細',
                        'ノルマはある？',
                        '送迎はある？',
                        '実際の雰囲気は？',
                        '面接はどんな感じ？',
                    ],
                ],
            ],
        ]);
    }
}

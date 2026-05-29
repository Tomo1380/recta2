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
        $ftModel = 'ft:gpt-4o-mini-2024-07-18:personal:recta-advisor-v3:DNBJ6U7S';

        AiChatSetting::create([
            'page_type' => 'top',
            'enabled' => true,
            'system_prompt' => 'あなたはナイトワーク求人サイト「Recta」のAIアシスタントです。求職者の不安を解消し、最適なお店を提案してください。丁寧でフレンドリーな口調で対応してください。',
            'tone' => 'friendly',
            'openai_finetuned_model' => $ftModel,
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
            'openai_finetuned_model' => $ftModel,
            // 店舗一覧では既定でサジェストを出さない (管理画面で切替可能)
            'suggest_display_mode' => 'off',
            'suggest_categories' => [
                [
                    'id' => 'ranking',
                    'label' => 'ランキング',
                    'sub' => '人気・おすすめから絞る',
                    'chips' => [
                        'ベスト3を厳選して！',
                        '今月の人気店',
                        '口コミ評価が高い順',
                        '新着のお店',
                    ],
                ],
                [
                    'id' => 'wage',
                    'label' => '時給で絞る',
                    'sub' => 'お金の条件を伝える',
                    'chips' => [
                        '高時給なお店だけ',
                        '時給5,000円以上',
                        '日払いOKだけ',
                        '保証つきのお店',
                    ],
                ],
                [
                    'id' => 'style',
                    'label' => '働き方で絞る',
                    'sub' => 'ライフスタイルに合わせる',
                    'chips' => [
                        'ゆるく働けるお店',
                        '週1からOK',
                        '体入できるお店',
                        'ノルマなし',
                    ],
                ],
            ],
        ]);

        AiChatSetting::create([
            'page_type' => 'detail',
            'enabled' => true,
            'system_prompt' => 'あなたはナイトワーク求人サイト「Recta」のAIアシスタントです。この店舗の詳細について質問に答えてください。店舗情報を元に正確に回答してください。',
            'tone' => 'friendly',
            'openai_finetuned_model' => $ftModel,
            // 店舗詳細では既定でサジェストを出さない (管理画面で切替可能)
            'suggest_display_mode' => 'off',
            'suggest_categories' => [
                [
                    'id' => 'money',
                    'label' => 'お金のこと',
                    'sub' => '時給・バックを確認',
                    'chips' => [
                        '私の査定額を聞く',
                        'バックシステム詳細',
                        '体入時給はいくら？',
                        '日払いはできる？',
                    ],
                ],
                [
                    'id' => 'workstyle',
                    'label' => '働き方',
                    'sub' => 'シフトやノルマを確認',
                    'chips' => [
                        'ノルマの有無を確認',
                        '週何日から働ける？',
                        '送迎はある？',
                        '同伴・アフターは？',
                    ],
                ],
                [
                    'id' => 'atmosphere',
                    'label' => 'お店の雰囲気',
                    'sub' => '実際どんな感じ？',
                    'chips' => [
                        '実際の雰囲気は？',
                        'お客様層を教えて',
                        'スタッフは優しい？',
                        '系列店との違いは？',
                    ],
                ],
            ],
        ]);
    }
}

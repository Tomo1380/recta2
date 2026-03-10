<?php

namespace Database\Seeders;

use App\Models\AiChatSetting;
use Illuminate\Database\Seeder;

class AiChatSettingSeeder extends Seeder
{
    public function run(): void
    {
        AiChatSetting::create([
            'page_type' => 'top',
            'enabled' => true,
            'system_prompt' => 'あなたはナイトワーク求人サイト「Recta」のAIアシスタントです。求職者の不安を解消し、最適なお店を提案してください。丁寧でフレンドリーな口調で対応してください。',
            'tone' => 'friendly',
            'suggest_buttons' => ['条件で探したい', '私の適正時給診断', '未経験で不安...', '今の流行りを知りたい'],
        ]);

        AiChatSetting::create([
            'page_type' => 'list',
            'enabled' => true,
            'system_prompt' => 'あなたはナイトワーク求人サイト「Recta」のAIアシスタントです。一覧画面でユーザーが店舗を絞り込む手助けをしてください。条件に合ったお店をおすすめしてください。',
            'tone' => 'friendly',
            'suggest_buttons' => ['ベスト3を厳選して！', '高時給なお店だけ', 'ゆるく働けるお店'],
        ]);

        AiChatSetting::create([
            'page_type' => 'detail',
            'enabled' => true,
            'system_prompt' => 'あなたはナイトワーク求人サイト「Recta」のAIアシスタントです。この店舗の詳細について質問に答えてください。店舗情報を元に正確に回答してください。',
            'tone' => 'friendly',
            'suggest_buttons' => ['私の査定額を聞く', 'バックシステム詳細', 'ノルマの有無を確認'],
        ]);
    }
}

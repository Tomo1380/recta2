<?php

namespace Database\Seeders;

use App\Models\AiChatLog;
use App\Models\User;
use Illuminate\Database\Seeder;

/**
 * Admin ダッシュボードのチャート (日次トレンド / モード分布 / Top users) が
 * 初期状態でも見栄え良く出るよう、過去 30 日分のログを 30 件投入する。
 */
class AiChatLogSeeder extends Seeder
{
    public function run(): void
    {
        $userIds = User::pluck('id')->all();
        if (empty($userIds)) {
            return;
        }

        $samples = [
            // [page_type, mode, user_message, ai_response, input_tokens, output_tokens]
            ['top', 'agent', '六本木で時給高めのラウンジを教えて', 'Lounge Phoenix / LOUNGE Noble など 3 件をご紹介します。', 320, 220],
            ['top', 'agent', '未経験でも入れるお店ある？', '未経験歓迎のお店を 5 件ピックアップしました。', 280, 180],
            ['top', 'agent', '体験入店できるお店だけ知りたい', '体験確約のお店一覧です。', 240, 160],
            ['list', 'agent', '銀座エリアでノルマなしのお店', '銀座でノルマなしのラウンジを 4 件抽出しました。', 300, 200],
            ['list', 'agent', '日払い対応のお店だけ絞れる？', '日払い対応の店舗をフィルタしました。', 220, 140],
            ['detail', 'agent', 'このお店の交通費は？', 'こちらの店舗は六本木駅周辺まで全額支給です。', 280, 90],
            ['detail', 'agent', 'シフトはどれくらい自由ですか', '週 2 日からの自由シフト制で、学業との両立も可能です。', 260, 110],
            ['top', 'finetuned', '上京して働きたい', '上京サポートでは住居・引越し費用の補助があります。', 350, 240],
            ['top', 'finetuned', 'ノルマの仕組みを教えて', 'ノルマには売上ノルマ・同伴ノルマがあり、店舗ごとに...', 320, 280],
        ];

        $logs = [];
        for ($i = 0; $i < 30; $i++) {
            $sample = $samples[$i % count($samples)];
            // fake() ヘルパは fakerphp/faker (require-dev) に依存するため
            // production composer install では使えない。素の PHP で代替。
            $hasUser = rand(1, 100) <= 70;
            $ip = sprintf('%d.%d.%d.%d', rand(1, 254), rand(0, 254), rand(0, 254), rand(1, 254));

            $logs[] = [
                'user_id' => $hasUser ? $userIds[array_rand($userIds)] : null,
                'ip_address' => $ip,
                'page_type' => $sample[0],
                'user_message' => $sample[2],
                'ai_response' => $sample[3],
                'input_tokens' => $sample[4] + rand(-30, 30),
                'output_tokens' => $sample[5] + rand(-20, 20),
                'mode' => $sample[1],
                'created_at' => now()->subDays(rand(0, 29))->subHours(rand(0, 23))->subMinutes(rand(0, 59)),
                'updated_at' => now(),
            ];
        }

        // bulk insert (Eloquent::create だと N+1 で遅い)
        foreach (array_chunk($logs, 50) as $chunk) {
            AiChatLog::insert($chunk);
        }
    }
}

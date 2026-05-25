<?php

namespace Database\Seeders;

use App\Models\AiChatLimit;
use Illuminate\Database\Seeder;

/**
 * Singleton limits row。AiChatLimit::current() で firstOrCreate される
 * 仕様なので技術的には不要だが、admin の利用制限画面が初期状態で
 * 既存レコードを編集する形に見える方が UX として自然なので明示投入。
 */
class AiChatLimitSeeder extends Seeder
{
    public function run(): void
    {
        AiChatLimit::current();
    }
}

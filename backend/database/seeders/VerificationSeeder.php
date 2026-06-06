<?php

namespace Database\Seeders;

use App\Models\Store;
use App\Models\User;
use Illuminate\Database\Seeder;

/**
 * 検証環境用シーダー。
 *
 * 手入力した「店舗 (stores)」は残したいので StoreSeeder は呼ばない。
 * それ以外の検証用データ (ユーザー / 口コミ / AIチャット履歴 / コラム記事 /
 * LINE友だち) だけを追加する。
 *
 * 安全性:
 *  - 店舗には一切触れない (DROP も TRUNCATE もしない。既存店舗はそのまま)。
 *  - 非冪等な seeder (User/Review/AiChatLog/LineFriend は create()/insert()) は
 *    再実行で重複・unique 制約エラーになるため、「User がまだ 0 件のときだけ」
 *    一括投入する。2 回目以降はスキップ。
 *  - ArticleSeeder だけは updateOrCreate で冪等なので毎回実行して最新化。
 *  - 口コミは「公開店舗が存在するときだけ」入れる (手入力店舗に紐づく)。
 *
 * 本番 (実データ) には使わないこと。あくまで検証環境にデモ用データを足す用途。
 */
class VerificationSeeder extends Seeder
{
    public function run(): void
    {
        // コラム記事 (冪等)。
        $this->call(ArticleSeeder::class);

        if (User::count() > 0) {
            $this->command?->warn('VerificationSeeder: users already exist — skipping user/review/chat/friend seeders (重複防止)。記事のみ更新しました。');
            return;
        }

        // ── User 依存のデータを一括投入 (User 0 件の初回のみ) ──
        $this->call(UserSeeder::class);

        // 口コミは既存の「公開店舗」に紐づく。店舗が無いと ReviewSeeder が
        // ->random() で失敗するのでガードする。
        if (Store::where('publish_status', 'published')->exists()) {
            $this->call(ReviewSeeder::class);
        } else {
            $this->command?->warn('VerificationSeeder: 公開店舗が無いため口コミ(ReviewSeeder)はスキップしました。');
        }

        $this->call(AiChatLogSeeder::class);
        $this->call(LineFriendSeeder::class);
    }
}

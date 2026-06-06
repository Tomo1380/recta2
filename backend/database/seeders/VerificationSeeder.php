<?php

namespace Database\Seeders;

use App\Models\AiChatLog;
use App\Models\LineFriend;
use App\Models\Review;
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
        // 店舗 (StoreSeeder) は呼ばない＝手入力店舗をそのまま残す。
        // 各テーブルは「空のときだけ」入れる＝既存データを壊さず、欠けてる分だけ補充。
        // 記事だけは updateOrCreate で冪等なので毎回実行して最新化。

        $this->call(ArticleSeeder::class);

        if (User::count() === 0) {
            $this->call(UserSeeder::class);
        } else {
            $this->command?->warn('VerificationSeeder: 既にユーザーがいるため UserSeeder はスキップ。');
        }

        // 口コミは公開店舗が前提 (ReviewSeeder が ->random() を使う)。
        if (Review::count() === 0 && Store::where('publish_status', 'published')->exists()) {
            $this->call(ReviewSeeder::class);
        }

        if (AiChatLog::count() === 0) {
            $this->call(AiChatLogSeeder::class);
        }

        if (LineFriend::count() === 0) {
            $this->call(LineFriendSeeder::class);
        }

        // 「フォロー中・未ログインのヘビーチャッター」デモは line_friends の状態に
        // 依らず必ず用意する (未ログイン×AIチャット履歴=line_user_id 基準 の確認用)。
        // 冪等 (firstOrCreate + チャット未投入時のみ) なので重複しない。
        app(LineFriendSeeder::class)->seedHeavyChatterFriend();
    }
}

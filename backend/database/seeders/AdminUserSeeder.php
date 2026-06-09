<?php

namespace Database\Seeders;

use App\Models\AdminUser;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class AdminUserSeeder extends Seeder
{
    public function run(): void
    {
        // 本番では弱い既定パスワード (旧 'password') を絶対に投入しない。
        //   - ADMIN_INITIAL_PASSWORD が設定されていればそれを使う。
        //   - 未設定なら強いランダム値を生成し、コンソールに 1 回だけ表示する
        //     (運用者が控えて初回ログイン後に変更する想定)。
        // ローカル/テストでは DX 優先で 'password' を許容する。
        $isProduction = app()->environment('production');

        $superPassword = $this->resolvePassword('ADMIN_INITIAL_PASSWORD', $isProduction);

        AdminUser::create([
            'name' => '管理者',
            'email' => env('ADMIN_INITIAL_EMAIL', 'admin@recta2.jp'),
            'password' => $superPassword,
            'role' => 'super_admin',
            'status' => 'active',
        ]);

        // 一般管理者のサンプルは開発用のみ。本番に見本アカウントを作らない。
        if (! $isProduction) {
            AdminUser::create([
                'name' => '田中 太郎',
                'email' => 'tanaka@recta2.jp',
                'password' => 'password',
                'role' => 'admin',
                'status' => 'active',
                'permissions' => ['chat', 'articles'],
            ]);
        }
    }

    /**
     * パスワードを env から解決する。本番で未設定ならランダム生成して表示する。
     * 非本番で未設定なら DX 優先の 'password' を返す。
     */
    private function resolvePassword(string $envKey, bool $isProduction): string
    {
        $fromEnv = env($envKey);
        if (is_string($fromEnv) && $fromEnv !== '') {
            return $fromEnv;
        }

        if (! $isProduction) {
            return 'password';
        }

        $generated = Str::password(20);
        $this->command?->warn('==================================================================');
        $this->command?->warn(" 初期 super_admin パスワードを自動生成しました (この表示は一度きり):");
        $this->command?->warn("   {$generated}");
        $this->command?->warn(' 初回ログイン後に必ず変更してください。固定したい場合は');
        $this->command?->warn(' ADMIN_INITIAL_PASSWORD を環境変数に設定して再投入してください。');
        $this->command?->warn('==================================================================');

        return $generated;
    }
}

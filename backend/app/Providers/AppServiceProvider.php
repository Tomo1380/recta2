<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Recta は素の配列 / 単体オブジェクト返しで設計が固まっている
        // (frontend 側も `api.get<Area[]>` のように直接配列を期待)。
        // JsonResource::collection が { data: [...] } で勝手にラップする
        // とフロント / orval-generated 型と齟齬が出るので、グローバルに
        // 無効化しておく。
        \Illuminate\Http\Resources\Json\JsonResource::withoutWrapping();
    }
}

<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // Authenticate ミドルウェアが未認証時に route('login') へ redirect
        // しようとすると、SPA 構成では `login` 名前付きルートが無いので
        // RouteNotFoundException → 500 になる。redirectGuestsTo に null 返り
        // 関数を渡すと redirect 先が解決されず、AuthenticationException が
        // そのまま伝播し、Exception handler が JSON / リクエスト形態に応じて
        // 401 を返してくれる (このアプリでは全 admin/user API が JSON 想定)。
        $middleware->redirectGuestsTo(fn () => null);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // /api/* への AuthenticationException は常に 401 JSON で返す。
        // デフォルトだと `Accept: application/json` が無いリクエストに対しては
        // `route('login')` への redirect を試み、SPA 構成では `login` 名前付き
        // ルートが無いので 500 になる。
        $exceptions->shouldRenderJsonWhen(function ($request) {
            return $request->is('api/*') || $request->expectsJson();
        });
    })->create();

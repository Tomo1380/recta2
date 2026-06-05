<?php

use App\Http\Controllers\SeoController;
use App\Http\Controllers\TrackingController;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

// SEO: nginx で /sitemap.xml と /robots.txt が Laravel に向けられている。
// /api 配下より浅い path から直接アクセスされるので、web.php 側に登録する。
Route::get('/sitemap.xml', [SeoController::class, 'sitemap']);
Route::get('/robots.txt', [SeoController::class, 'robots']);

// 計測リンク（アフィリエイト / SNS / 店舗別LINE導線）のリダイレクト。
// nginx で /r/ を Laravel に向けている（/api より浅い path のため web.php に登録）。
Route::get('/r/{code}', [TrackingController::class, 'redirect'])
    ->where('code', '[A-Za-z0-9\-_]+');

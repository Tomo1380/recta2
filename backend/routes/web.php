<?php

use App\Http\Controllers\SeoController;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

// SEO: nginx で /sitemap.xml と /robots.txt が Laravel に向けられている。
// /api 配下より浅い path から直接アクセスされるので、web.php 側に登録する。
Route::get('/sitemap.xml', [SeoController::class, 'sitemap']);
Route::get('/robots.txt', [SeoController::class, 'robots']);

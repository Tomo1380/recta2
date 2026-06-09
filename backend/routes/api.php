<?php

use App\Http\Controllers\Admin\AdminUserController;
use App\Http\Controllers\Admin\AiChatSettingController;
use App\Http\Controllers\Admin\AnalyticsController;
use App\Http\Controllers\Admin\TrackingLinkController;
use App\Http\Controllers\Admin\ArticleController;
use App\Http\Controllers\Admin\AreaCategoryController;
use App\Http\Controllers\Admin\AuthController;
use App\Http\Controllers\Admin\ContentController;
use App\Http\Controllers\Admin\DashboardController;
use App\Http\Controllers\Admin\IndustryKnowledgeController;
use App\Http\Controllers\Admin\LineFriendController;
use App\Http\Controllers\Admin\RelocateVoiceController;
use App\Http\Controllers\Admin\ReviewController;
use App\Http\Controllers\Admin\StoreController;
use App\Http\Controllers\Admin\UserController;
use App\Http\Controllers\PublicArticleController;
use App\Http\Controllers\PublicRelocateController;
use App\Http\Controllers\PublicStoreController;
use App\Http\Controllers\AiChatController;
use App\Http\Controllers\LineAuthController;
use App\Http\Controllers\LineWebhookController;
use App\Http\Controllers\UserProfileController;
use App\Http\Controllers\PublicReviewController;
use App\Http\Controllers\SeoController;
use App\Http\Controllers\TrackingController;
use Illuminate\Support\Facades\Route;

// ========== ヘルスチェック ==========
Route::get('/', fn () => response()->json(['status' => 'ok']));

// ========== 公開API ==========
Route::get('/home', [PublicStoreController::class, 'home']);
Route::get('/stores', [PublicStoreController::class, 'index']);
Route::get('/stores/{store}', [PublicStoreController::class, 'show'])
    ->where('store', '[A-Za-z0-9\-]+');
Route::get('/areas', [PublicStoreController::class, 'areas']);
Route::get('/categories', [PublicStoreController::class, 'categories']);

// SEO ランディングページ: エリア × 業態の組み合わせ
Route::get('/landings/areas/{slug}', [\App\Http\Controllers\PublicLandingController::class, 'area']);
Route::get('/landings/categories/{slug}', [\App\Http\Controllers\PublicLandingController::class, 'category']);
Route::get('/landings/areas/{areaSlug}/categories/{categorySlug}', [\App\Http\Controllers\PublicLandingController::class, 'areaCategory']);

// 業界用語集 (Glossary)
Route::get('/glossary', [\App\Http\Controllers\PublicGlossaryController::class, 'index']);
Route::get('/glossary/{slug}', [\App\Http\Controllers\PublicGlossaryController::class, 'show']);
Route::get('/relocate-voices', [PublicRelocateController::class, 'voices']);
Route::get('/chat/config', [AiChatController::class, 'config']);
Route::post('/chat', [AiChatController::class, 'chat'])->middleware('throttle:30,1');
// SSE 版 — 同じ payload を受けて Server-Sent Events で逐次返す。
// Function Calling 中は status イベント、最終回答は text 差分イベント、完了時に done イベント。
Route::post('/chat/stream', [AiChatController::class, 'chatStream'])->middleware('throttle:30,1');

// ========== コラム記事（公開） ==========
Route::get('/columns', [PublicArticleController::class, 'index']);
Route::get('/columns/{slug}', [PublicArticleController::class, 'show']);

// ========== アクセス解析（公開ビーコン） ==========
// PV / LINE追加クリックを navigator.sendBeacon で受ける。無認証・append-only。
Route::post('/track/pv', [TrackingController::class, 'pageView'])->middleware('throttle:240,1');
Route::post('/track/line-click', [TrackingController::class, 'lineClick'])->middleware('throttle:120,1');

// ========== SEO (sitemap / robots) ==========
// nginx で `/sitemap.xml` → `/api/sitemap`, `/robots.txt` → `/api/robots` に rewrite している。
Route::get('/sitemap', [SeoController::class, 'sitemap']);
Route::get('/robots', [SeoController::class, 'robots']);

// OG 画像 (トップ/一覧/汎用ページ共通の og:image)。管理画面のヒーロー設定を
// 焼き込んだ 1200x630 を配信する。frontend の seo.ts が DEFAULT_OG_IMAGE として参照。
Route::get('/og-image', [\App\Http\Controllers\OgImageController::class, 'show']);

// ========== LINE認証 ==========
// state cookie / 交換コードを扱うため、ブルートフォース・濫用を防ぐ throttle を付与。
Route::middleware('throttle:20,1')->group(function () {
    Route::get('/auth/line', [LineAuthController::class, 'redirect']);
    Route::get('/auth/line/callback', [LineAuthController::class, 'callback']);
    // 交換コード → 実トークン (単回使用・60秒)
    Route::post('/auth/line/exchange', [LineAuthController::class, 'exchange']);
});

// ========== LINE Webhook (公開、署名検証あり) ==========
Route::post('/webhook/line', [LineWebhookController::class, 'handle'])
    ->middleware('throttle:60,1');

// ========== ユーザー（エンドユーザー） ==========
// user.type:user で AdminUser トークンによる流用を遮断 (認証境界)。
Route::middleware(['auth:sanctum', 'user.type:user'])->prefix('user')->group(function () {
    Route::get('/me', [UserProfileController::class, 'me']);
    Route::put('/profile', [UserProfileController::class, 'update']);
    Route::post('/logout', [UserProfileController::class, 'logout']);
    Route::get('/reviews', [PublicReviewController::class, 'userReviews']);
});

// ========== 口コミ投稿・削除（エンドユーザー） ==========
Route::middleware(['auth:sanctum', 'user.type:user'])->post('/stores/{store}/reviews', [PublicReviewController::class, 'store'])->whereNumber('store');
Route::middleware(['auth:sanctum', 'user.type:user'])->delete('/user/reviews/{review}', [PublicReviewController::class, 'destroy']);

// ========== 管理画面 ==========
Route::prefix('admin')->group(function () {
    Route::post('/login', [AuthController::class, 'login'])
        ->middleware('throttle:10,10');

    // user.type:admin で LINE ログインの User トークンによる管理API流用を遮断 (権限昇格防止)。
    Route::middleware(['auth:sanctum', 'user.type:admin'])->group(function () {
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::get('/me', [AuthController::class, 'me']);

        // ダッシュボード
        Route::get('/dashboard', [DashboardController::class, 'index']);

        // アクセス解析（店舗/エリア/コラム ランキング・LINE経路）
        Route::get('/analytics/overview', [AnalyticsController::class, 'overview']);
        Route::get('/analytics/breakdown', [AnalyticsController::class, 'breakdown']);

        // 計測リンク（アフィリエイト/店舗別LINE導線/SNS）発行・管理
        Route::get('/tracking-links', [TrackingLinkController::class, 'index']);
        Route::post('/tracking-links', [TrackingLinkController::class, 'store']);
        Route::put('/tracking-links/{trackingLink}', [TrackingLinkController::class, 'update']);
        Route::delete('/tracking-links/{trackingLink}', [TrackingLinkController::class, 'destroy']);

        // ユーザー管理
        Route::get('/users', [UserController::class, 'index']);
        Route::get('/users/{user}', [UserController::class, 'show']);
        Route::put('/users/{user}/status', [UserController::class, 'updateStatus']);
        Route::put('/users/{user}/notes', [UserController::class, 'updateNotes']);
        Route::post('/users/{user}/line-message', [UserController::class, 'sendLineMessage']);
        Route::get('/users/{user}/messages', [UserController::class, 'messages']);

        // LINE 友だち (line_user_id 基準のトーク)。アプリ User 未連携の相手でも
        // トーク・送信・名前編集ができるようにする (2026-06-06 FB)。
        Route::get('/line-friends/{lineUserId}/messages', [LineFriendController::class, 'messages']);
        Route::get('/line-friends/{lineUserId}', [LineFriendController::class, 'show']);
        Route::post('/line-friends/push', [LineFriendController::class, 'push']);
        Route::put('/line-friends/{lineUserId}/name', [LineFriendController::class, 'updateName']);
        Route::put('/line-friends/{lineUserId}/notes', [LineFriendController::class, 'updateNotes']);

        // 店舗管理
        // 住所 → 緯度経度 (Google Geocoding) — apiResource の {store} に飲まれないよう先に登録。
        Route::post('/stores/geocode', [StoreController::class, 'geocode']);
        Route::apiResource('/stores', StoreController::class);
        Route::post('/stores/{store}/images', [StoreController::class, 'uploadImage']);
        Route::put('/stores/{store}/images/reorder', [StoreController::class, 'reorderImages']);
        Route::delete('/stores/{store}/images/{index}', [StoreController::class, 'deleteImage']);

        // 汎用画像アップロード (StaffPhotosEditor / DressCode OK・NG / TipTap 本文 等)。
        // 親モデルに紐付けず URL だけ返すので、フロントが form 側で URL を保持し、
        // save 時に親モデルと一緒に保存する設計。
        Route::post('/uploads/{kind}', [\App\Http\Controllers\Admin\MediaUploadController::class, 'store'])
            ->where('kind', '[a-z0-9-]+');

        // 口コミ管理
        Route::get('/reviews', [ReviewController::class, 'index']);
        Route::post('/reviews', [ReviewController::class, 'store']);
        Route::get('/reviews/{review}', [ReviewController::class, 'show']);
        Route::put('/reviews/{review}/status', [ReviewController::class, 'updateStatus']);
        Route::put('/reviews/{review}', [ReviewController::class, 'update']);

        // AIチャット設定
        Route::get('/ai-chat/settings', [AiChatSettingController::class, 'index']);
        Route::put('/ai-chat/settings/{ai_chat_setting}', [AiChatSettingController::class, 'update']);
        Route::get('/ai-chat/stats', [AiChatSettingController::class, 'stats']);
        Route::get('/ai-chat/logs', [AiChatSettingController::class, 'logs']);
        Route::get('/ai-chat/limits', [AiChatSettingController::class, 'limits']);
        Route::put('/ai-chat/limits', [AiChatSettingController::class, 'updateLimits']);

        // 管理ユーザー
        Route::get('/admin-users', [AdminUserController::class, 'index']);
        Route::post('/admin-users', [AdminUserController::class, 'store']);
        Route::put('/admin-users/{admin_user}', [AdminUserController::class, 'update']);
        Route::put('/admin-users/{admin_user}/reset-password', [AdminUserController::class, 'resetPassword']);
        Route::delete('/admin-users/{admin_user}', [AdminUserController::class, 'destroy']);

        // Area & Category management
        Route::get('areas', [AreaCategoryController::class, 'areas']);
        Route::post('areas', [AreaCategoryController::class, 'storeArea']);
        Route::put('areas/{area}', [AreaCategoryController::class, 'updateArea']);
        Route::delete('areas/{area}', [AreaCategoryController::class, 'destroyArea']);
        Route::post('areas/reorder', [AreaCategoryController::class, 'reorderAreas']);

        Route::get('categories', [AreaCategoryController::class, 'categories']);
        Route::post('categories', [AreaCategoryController::class, 'storeCategory']);
        Route::put('categories/{category}', [AreaCategoryController::class, 'updateCategory']);
        Route::delete('categories/{category}', [AreaCategoryController::class, 'destroyCategory']);
        Route::post('categories/reorder', [AreaCategoryController::class, 'reorderCategories']);
        Route::post('categories/{category}/image', [AreaCategoryController::class, 'uploadCategoryImage']);

        // Relocate voices (上京した先輩の声)
        Route::get('relocate-voices', [RelocateVoiceController::class, 'index']);
        Route::post('relocate-voices', [RelocateVoiceController::class, 'store']);
        Route::put('relocate-voices/{relocateVoice}', [RelocateVoiceController::class, 'update']);
        Route::delete('relocate-voices/{relocateVoice}', [RelocateVoiceController::class, 'destroy']);
        Route::post('relocate-voices/reorder', [RelocateVoiceController::class, 'reorder']);

        // Content management
        Route::get('pickup-shops', [ContentController::class, 'pickupShops']);
        Route::post('pickup-shops', [ContentController::class, 'storePickupShop']);
        Route::put('pickup-shops/{pickupShop}', [ContentController::class, 'updatePickupShop']);
        Route::delete('pickup-shops/{pickupShop}', [ContentController::class, 'destroyPickupShop']);
        Route::post('pickup-shops/reorder', [ContentController::class, 'reorderPickupShops']);

        Route::get('consultations', [ContentController::class, 'consultations']);
        Route::post('consultations', [ContentController::class, 'storeConsultation']);
        Route::put('consultations/{consultation}', [ContentController::class, 'updateConsultation']);
        Route::delete('consultations/{consultation}', [ContentController::class, 'destroyConsultation']);

        Route::get('banner-settings', [ContentController::class, 'bannerSettings']);
        Route::put('banner-settings', [ContentController::class, 'updateBannerSettings']);

        // コラム記事管理
        Route::apiResource('articles', ArticleController::class);
        Route::post('articles/{article}/thumbnail', [ArticleController::class, 'uploadThumbnail']);

        // 業界ナレッジ管理
        Route::get('/ai-chat/knowledge', [IndustryKnowledgeController::class, 'index']);
        Route::post('/ai-chat/knowledge', [IndustryKnowledgeController::class, 'store']);
        Route::put('/ai-chat/knowledge/{industry_knowledge}', [IndustryKnowledgeController::class, 'update']);
        Route::delete('/ai-chat/knowledge/{industry_knowledge}', [IndustryKnowledgeController::class, 'destroy']);
        Route::post('/ai-chat/knowledge/reorder', [IndustryKnowledgeController::class, 'reorder']);
    });
});

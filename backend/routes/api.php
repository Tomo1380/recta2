<?php

use App\Http\Controllers\Admin\AdminUserController;
use App\Http\Controllers\Admin\AiChatSettingController;
use App\Http\Controllers\Admin\AreaCategoryController;
use App\Http\Controllers\Admin\AuthController;
use App\Http\Controllers\Admin\ContentController;
use App\Http\Controllers\Admin\DashboardController;
use App\Http\Controllers\Admin\LineFriendController;
use App\Http\Controllers\Admin\ReviewController;
use App\Http\Controllers\Admin\StoreController;
use App\Http\Controllers\Admin\UserController;
use App\Http\Controllers\PublicStoreController;
use App\Http\Controllers\AiChatController;
use App\Http\Controllers\LineAuthController;
use App\Http\Controllers\LineWebhookController;
use App\Http\Controllers\UserProfileController;
use App\Http\Controllers\PublicReviewController;
use Illuminate\Support\Facades\Route;

// ========== 公開API ==========
Route::get('/home', [PublicStoreController::class, 'home']);
Route::get('/stores', [PublicStoreController::class, 'index']);
Route::get('/stores/{store}', [PublicStoreController::class, 'show']);
Route::get('/areas', [PublicStoreController::class, 'areas']);
Route::get('/categories', [PublicStoreController::class, 'categories']);
Route::get('/chat/config', [AiChatController::class, 'config']);
Route::post('/chat', [AiChatController::class, 'chat'])->middleware('throttle:30,1');

// ========== LINE認証 ==========
Route::get('/auth/line', [LineAuthController::class, 'redirect']);
Route::get('/auth/line/callback', [LineAuthController::class, 'callback']);

// ========== LINE Webhook (公開、署名検証あり) ==========
Route::post('/webhook/line', [LineWebhookController::class, 'handle']);

// ========== ユーザー（エンドユーザー） ==========
Route::middleware('auth:sanctum')->prefix('user')->group(function () {
    Route::get('/me', [UserProfileController::class, 'me']);
    Route::put('/me', [UserProfileController::class, 'update']);
    Route::post('/logout', [UserProfileController::class, 'logout']);
    Route::get('/reviews', [PublicReviewController::class, 'userReviews']);
});

// ========== 口コミ投稿・削除（エンドユーザー） ==========
Route::middleware('auth:sanctum')->post('/stores/{store}/reviews', [PublicReviewController::class, 'store']);
Route::middleware('auth:sanctum')->delete('/user/reviews/{review}', [PublicReviewController::class, 'destroy']);

// ========== 管理画面 ==========
Route::prefix('admin')->group(function () {
    Route::post('/login', [AuthController::class, 'login'])
        ->middleware('throttle:10,10');

    Route::middleware('auth:sanctum')->group(function () {
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::get('/me', [AuthController::class, 'me']);

        // ダッシュボード
        Route::get('/dashboard', [DashboardController::class, 'index']);

        // ユーザー管理
        Route::get('/users', [UserController::class, 'index']);
        Route::get('/users/{user}', [UserController::class, 'show']);
        Route::put('/users/{user}/status', [UserController::class, 'updateStatus']);
        Route::post('/users/{user}/line-message', [UserController::class, 'sendLineMessage']);

        // 店舗管理
        Route::apiResource('/stores', StoreController::class);

        // 口コミ管理
        Route::get('/reviews', [ReviewController::class, 'index']);
        Route::get('/reviews/{review}', [ReviewController::class, 'show']);
        Route::put('/reviews/{review}/status', [ReviewController::class, 'updateStatus']);

        // AIチャット設定
        Route::get('/ai-chat/settings', [AiChatSettingController::class, 'index']);
        Route::put('/ai-chat/settings/{ai_chat_setting}', [AiChatSettingController::class, 'update']);
        Route::get('/ai-chat/stats', [AiChatSettingController::class, 'stats']);
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

        // LINE Messaging管理
        Route::prefix('line')->group(function () {
            Route::get('/friends', [LineFriendController::class, 'index']);
            Route::get('/friends/{lineUserId}/messages', [LineFriendController::class, 'messages']);
            Route::post('/push', [LineFriendController::class, 'push']);
            Route::post('/broadcast', [LineFriendController::class, 'broadcast']);
        });
    });
});

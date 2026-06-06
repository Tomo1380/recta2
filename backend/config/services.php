<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'gemini' => [
        'api_key' => env('GEMINI_API_KEY'),
        'tuned_model_id' => env('GEMINI_TUNED_MODEL_ID'),
        // Default は preview の取れた GA 安定版。料金は preview 版と同じだが
        // レート上限が緩く、突然 deprecated されるリスクも無い。
        // env('GEMINI_MODEL') が空文字を返した場合もデフォルトに倒すため ?: で書く。
        // ('?:' は left-side が falsy ('' や null) なら right-side に落ちる)。
        'model' => env('GEMINI_MODEL') ?: 'gemini-3.1-flash-lite',
    ],

    'google_maps' => [
        // IP-restricted server-side key used by GeocodingService.
        // 公開キー (フロントエンドの Maps JS API) は VITE_GOOGLE_MAPS_API_KEY
        // としてフロント側 .env に置く — ここには来ない。
        'server_key' => env('GOOGLE_MAPS_SERVER_KEY'),
    ],

    'openai' => [
        'api_key' => env('OPENAI_API_KEY'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'line_login' => [
        'channel_id' => env('LINE_LOGIN_CHANNEL_ID'),
        'channel_secret' => env('LINE_LOGIN_CHANNEL_SECRET'),
        'callback_url' => env('LINE_LOGIN_CALLBACK_URL'),
    ],

    'line_messaging' => [
        'channel_id' => env('LINE_MESSAGING_CHANNEL_ID'),
        'channel_secret' => env('LINE_MESSAGING_CHANNEL_SECRET'),
        'access_token' => env('LINE_MESSAGING_CHANNEL_ACCESS_TOKEN'),
    ],

    'line' => [
        // LINE公式アカウントBot基本ID (@xxx形式) — Official Managerへのジャンプ用
        'official_account_id' => env('LINE_OFFICIAL_ACCOUNT_ID'),
        // LINE Official Account Manager のチャット画面ID。
        // 個人チャットURLは https://chat.line.biz/{oa_chat_id}/chat/{line_user_id}。
        // 運営は返信を公式チャットで行うので、管理画面から該当者の公式チャットへ飛ばす。
        // 秘匿情報ではない (URLに出る識別子・利用には chat.line.biz への認証が別途必要) ため
        // デフォルト値を入れておき、env 無しの環境 (検証/本番) でも動くようにする。
        'oa_chat_id' => env('LINE_OA_CHAT_ID', 'Uf6399e18c18dba40eda802fadec3359a'),
    ],

];

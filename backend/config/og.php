<?php

return [
    /*
    |--------------------------------------------------------------------------
    | OG 画像レンダリング設定
    |--------------------------------------------------------------------------
    |
    | App\Services\Content\OgImageRenderer が SNS シェア用の OG 画像 (1200x630)
    | を Imagick で合成するときに使う。日本語フォントはコンテナに同梱した
    | Noto Sans CJK を既定にし、環境ごとに差し替えられるよう env で上書き可能。
    |
    */

    // 本文・ラベル用フォント (.ttc / .ttf 可)。Alpine の font-noto-cjk は
    // /usr/share/fonts/noto/ 配下に Noto Sans CJK を置く。
    'font_path' => env('OG_FONT_PATH', '/usr/share/fonts/noto/NotoSansCJK-Regular.ttc'),

    // 見出し (タグライン / Recta ロゴ) 用の太字フォント。未設定なら font_path を流用。
    'font_path_bold' => env('OG_FONT_PATH_BOLD', '/usr/share/fonts/noto/NotoSansCJK-Bold.ttc'),

    // ヒーロー背景が未設定のときに使う既定背景画像 URL。未設定ならダークグラデのみ。
    'default_hero_url' => env('OG_DEFAULT_HERO_URL'),

    // OG 画像を置く固定の相対キー (MediaStorage の prefix 配下)。
    'object_key' => env('OG_OBJECT_KEY', 'og/home.jpg'),
];

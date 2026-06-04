<?php

namespace App\Http\Controllers;

use App\Services\Content\OgImageRenderer;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * OG 画像 (1200x630) を固定 URL で配信する。
 *
 * トップ/一覧/汎用ページの og:image はすべてこの 1 本を指す (seo.ts の
 * DEFAULT_OG_IMAGE)。バイト列を直接返すので、リダイレクト追従しない
 * クローラ (一部の SNS) でも確実にサムネを取得できる。
 *
 * 画像本体は管理画面のバナー保存時に生成され S3 の固定キーに置かれる。
 * 未生成 (初回デプロイ直後など) の場合はここで遅延生成する。
 */
class OgImageController extends Controller
{
    public function show(OgImageRenderer $renderer): Response
    {
        try {
            $bytes = $renderer->currentOrGenerate();
        } catch (\Throwable $e) {
            report($e);
            // フォント未導入等で生成できない場合は 404 (og:image 無し扱い)。
            return response('OG image unavailable', 404);
        }

        return new StreamedResponse(function () use ($bytes) {
            echo $bytes;
        }, 200, [
            'Content-Type' => 'image/jpeg',
            'Content-Length' => (string) strlen($bytes),
            // SNS 再クロールで更新が拾える程度の短めキャッシュ。
            'Cache-Control' => 'public, max-age=300',
        ]);
    }
}

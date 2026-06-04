<?php

namespace App\Support;

use Illuminate\Contracts\Filesystem\Filesystem;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * 画像 (店舗写真 / Article thumbnail / Category 画像 / Staff 写真 /
 * Dress code 画像 / TipTap 本文画像) の S3 アップロード/削除を集約する。
 *
 * 設計:
 *   - すべて s3 disk 経由。bucket と prefix は env から取る (ローカルは
 *     dev/、本番は prod/)。
 *   - object key の形式: `${PREFIX}${category}/${uuid}.${ext}`
 *     例: `dev/stores/3f8c....jpg`
 *   - upload は public read で投入 (bucket policy で全 object public read)。
 *   - 返す URL は s3 disk の `url($key)` 結果。
 *   - 削除は **同じ bucket・同じ prefix** の URL のみ実行。外部 URL や
 *     prefix 違いの URL はスキップする (運営が手動で URL 貼った場合の
 *     誤削除防止)。
 */
class MediaStorage
{
    /**
     * 1 枚アップロードして public URL を返す。
     *
     * @param  string  $category  e.g. "stores", "articles/thumbnails", "categories", "staff-photos"
     */
    public static function upload(UploadedFile $file, string $category): string
    {
        // iPhone 標準の HEIC/HEIF はブラウザ表示も多くの環境で不可なので、
        // アップロード時点で JPEG に変換して保存する。それ以外はそのまま。
        [$contents, $ext, $contentType] = self::readForStorage($file);

        $filename = Str::uuid()->toString() . '.' . $ext;
        $key = self::prefix() . trim($category, '/') . '/' . $filename;

        // NOTE: 'visibility' => 'public' は object ACL を set しようとする。
        // bucket が ObjectOwnership=BucketOwnerEnforced だと ACL が使えず put が
        // 黙って false を返す。bucket policy で全 object public read を許可済み
        // なので ACL 指定は不要。
        self::disk()->put($key, $contents, [
            'ContentType' => $contentType,
            'CacheControl' => 'public, max-age=31536000, immutable',
        ]);

        return self::disk()->url($key);
    }

    /**
     * 保存用のバイナリ・拡張子・Content-Type を決める。
     * HEIC/HEIF は JPEG へ変換し、それ以外は原本のまま返す。
     *
     * @return array{0: string, 1: string, 2: string}  [contents, ext, contentType]
     */
    private static function readForStorage(UploadedFile $file): array
    {
        $ext = strtolower($file->getClientOriginalExtension() ?: $file->guessExtension() ?: '');
        $mime = strtolower($file->getMimeType() ?: '');

        $isHeic = in_array($ext, ['heic', 'heif'], true)
            || in_array($mime, [
                'image/heic', 'image/heif',
                'image/heic-sequence', 'image/heif-sequence',
            ], true);

        if ($isHeic) {
            return self::convertHeicToJpeg($file);
        }

        return [
            file_get_contents($file->getRealPath()),
            $ext !== '' ? $ext : 'bin',
            $mime !== '' ? $mime : 'application/octet-stream',
        ];
    }

    /**
     * HEIC/HEIF を JPEG に変換して [binary, 'jpg', 'image/jpeg'] を返す。
     * Imagick (libheif delegate) が無い環境では 422 で分かるように落とす。
     *
     * @return array{0: string, 1: string, 2: string}
     */
    private static function convertHeicToJpeg(UploadedFile $file): array
    {
        if (!class_exists(\Imagick::class) || !\Imagick::queryFormats('HEIC')) {
            abort(422, 'HEIC形式の画像をサーバで変換できません。JPEGまたはPNGに変換してからアップロードしてください。');
        }

        try {
            $img = new \Imagick();
            $img->readImage($file->getRealPath());
            // iPhone は EXIF の回転情報を持つので、変換前に向きを焼き込む。
            if (method_exists($img, 'autoOrientImage')) {
                $img->autoOrientImage();
            }
            $img->setImageFormat('jpeg');
            $img->setImageCompressionQuality(88);
            $img->stripImage();
            $blob = $img->getImageBlob();
            $img->clear();
            $img->destroy();

            return [$blob, 'jpg', 'image/jpeg'];
        } catch (\Throwable $e) {
            abort(422, 'HEIC画像の変換に失敗しました。別の画像でお試しください。');
        }
    }

    /**
     * URL から object key を逆引きして削除。bucket/prefix が一致する URL
     * だけが対象。外部 URL や別 prefix は何もしない (返り値は false)。
     */
    public static function deleteByUrl(?string $url): bool
    {
        if (!is_string($url) || $url === '') {
            return false;
        }

        $key = self::keyFromUrl($url);
        if ($key === null) {
            return false;
        }

        return self::disk()->delete($key);
    }

    /**
     * S3 上の bucket 内 key を URL から取り出す。
     * 既定 prefix にマッチしない URL は null (= 触らない)。
     */
    public static function keyFromUrl(string $url): ?string
    {
        $prefix = self::prefix(); // e.g. "dev/"

        // 1) virtual-hosted style: https://{bucket}.s3.{region}.amazonaws.com/{key}
        if (preg_match('#^https?://[^/]+\.s3(?:\.[^/]+)?\.amazonaws\.com/(.+)$#', $url, $m)) {
            $key = $m[1];
        // 2) path style: https://s3.{region}.amazonaws.com/{bucket}/{key}
        } elseif (preg_match('#^https?://s3(?:\.[^/]+)?\.amazonaws\.com/[^/]+/(.+)$#', $url, $m)) {
            $key = $m[1];
        // 3) disk の url() base に対する相対 (例: 後で proxy domain にした場合)
        } elseif (str_starts_with($url, '/')) {
            $key = ltrim($url, '/');
        } else {
            return null;
        }

        // prefix 配下のみ対象 (運営が貼った外部 URL や別環境の prefix を
        // 誤って削除しない)
        if (!str_starts_with($key, $prefix)) {
            return null;
        }

        return $key;
    }

    private static function disk(): Filesystem
    {
        return Storage::disk(config('filesystems.media_disk', 's3'));
    }

    private static function prefix(): string
    {
        // 旧実装は env() 直読みだったが、container の env_file が常に効いて
        // しまうと phpunit の <env> override が効かない。config 経由にして
        // 「config:cache 後 / phpunit env」のどちらも一貫させる。
        $p = (string) config('filesystems.media_prefix', '');
        // 末尾スラッシュは必ず付ける (空文字なら付けない)
        if ($p === '' || str_ends_with($p, '/')) {
            return $p;
        }
        return $p . '/';
    }
}

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
        $ext = $file->getClientOriginalExtension() ?: $file->guessExtension() ?: 'bin';
        $filename = Str::uuid()->toString() . '.' . $ext;
        $key = self::prefix() . trim($category, '/') . '/' . $filename;

        // NOTE: 'visibility' => 'public' は object ACL を set しようとする。
        // bucket が ObjectOwnership=BucketOwnerEnforced だと ACL が使えず put が
        // 黙って false を返す。bucket policy で全 object public read を許可済み
        // なので ACL 指定は不要。
        self::disk()->put($key, file_get_contents($file->getRealPath()), [
            'ContentType' => $file->getMimeType() ?: 'application/octet-stream',
            'CacheControl' => 'public, max-age=31536000, immutable',
        ]);

        return self::disk()->url($key);
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

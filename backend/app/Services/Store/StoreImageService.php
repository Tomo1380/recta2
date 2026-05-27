<?php

namespace App\Services\Store;

use App\Models\Store;
use App\Support\MediaStorage;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;

/**
 * Store の画像 / 動画 / スタッフ写真の同期と単発アップロードを集約。
 *
 * Phase 2-3 で Admin\StoreController から切り出し:
 *   - uploadImage / deleteImage (images JSONB カラムの管理)
 *   - syncVideos / syncStaffPhotos (store_videos / store_staff_photos
 *     リレーションを「全置換」方式で同期)
 *   - bridgeLegacyVideoUrl (旧 admin UI / API 直叩き互換のリクエスト整形)
 *
 * Controller 側は HTTP layer だけ持ち、こちらは Eloquent / Storage 操作のみ。
 */
class StoreImageService
{
    /**
     * 1 枚アップロードして store->images に追記。アップロード後の url と
     * 完全な images 配列を返す。Controller の uploadImage から呼ばれる。
     *
     * @return array{url: string, images: array<int, mixed>}
     */
    public function uploadImage(Store $store, UploadedFile $file): array
    {
        // S3 (`recta2-media-*`) に dev/ または prod/ prefix で upload。
        // public read のため URL をそのまま images JSONB に保存する。
        $url = MediaStorage::upload($file, 'stores');

        $images = $store->images ?? [];
        $images[] = $url;
        $store->update(['images' => $images]);

        return [
            'url' => $url,
            'images' => $images,
        ];
    }

    /**
     * index 指定で 1 枚削除。範囲外なら null を返す。
     *
     * @return array{images: array<int, mixed>}|null
     */
    public function deleteImage(Store $store, int $index): ?array
    {
        $images = $store->images ?? [];

        if ($index < 0 || $index >= count($images)) {
            return null;
        }

        $imageUrl = $images[$index];
        $url = is_array($imageUrl) ? ($imageUrl['url'] ?? null) : $imageUrl;

        // 自分の S3 bucket + prefix 配下の URL のみ実ファイルを消す。
        // 外部 URL (unsplash 等) や別環境 prefix は触らない。
        MediaStorage::deleteByUrl(is_string($url) ? $url : null);

        array_splice($images, $index, 1);
        $store->update(['images' => array_values($images)]);

        return ['images' => array_values($images)];
    }

    /**
     * 受け取った videos 配列で store_videos を全置換する。
     * 差分計算より UI が分かりやすいので全置換方式。
     *
     * @param  array<int, array{video_url:string,label?:?string,description?:?string,poster_url?:?string}>  $videos
     */
    public function syncVideos(Store $store, array $videos): void
    {
        $store->videos()->delete();

        $records = [];
        foreach (array_values($videos) as $i => $row) {
            if (!isset($row['video_url']) || $row['video_url'] === '') {
                continue;
            }
            $records[] = [
                'video_url' => (string) $row['video_url'],
                'label' => $row['label'] ?? null,
                'description' => $row['description'] ?? null,
                'poster_url' => $row['poster_url'] ?? null,
                'display_order' => $i,
            ];
        }
        if (!empty($records)) {
            $store->videos()->createMany($records);
        }
    }

    /**
     * 受け取った staff_photos 配列で store_staff_photos を全置換する。
     *
     * @param  array<int, array{image_url:string,caption?:?string,instagram_url?:?string,staff_type?:?string}>  $photos
     */
    public function syncStaffPhotos(Store $store, array $photos): void
    {
        $store->staffPhotos()->delete();

        $records = [];
        foreach (array_values($photos) as $i => $row) {
            if (!isset($row['image_url']) || $row['image_url'] === '') {
                continue;
            }
            $records[] = [
                'image_url' => (string) $row['image_url'],
                'caption' => $row['caption'] ?? null,
                'instagram_url' => $row['instagram_url'] ?? null,
                'staff_type' => $row['staff_type'] ?? null,
                'display_order' => $i,
            ];
        }
        if (!empty($records)) {
            $store->staffPhotos()->createMany($records);
        }
    }

    /**
     * 旧 admin UI / API 直叩き互換: `video_url` が単独で送られて `videos`
     * が無い場合のみ、`videos: [{ video_url, label: '店舗紹介動画' }]` に
     * リライトする。`videos` が明示的に送られていればそちらを優先 (破壊しない)。
     */
    public function bridgeLegacyVideoUrl(Request $request): void
    {
        if ($request->has('videos')) {
            return;
        }
        $legacy = $request->input('video_url');
        if (!is_string($legacy) || $legacy === '') {
            return;
        }
        $request->merge([
            'videos' => [[
                'video_url' => $legacy,
                'label' => '店舗紹介動画',
            ]],
        ]);
    }
}

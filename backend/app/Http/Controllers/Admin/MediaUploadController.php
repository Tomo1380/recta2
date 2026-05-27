<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\UploadMediaRequest;
use App\Support\MediaStorage;
use Illuminate\Http\JsonResponse;

/**
 * 汎用画像アップロード endpoint。
 *
 * フロントの個別 form (StaffPhotosEditor / DressCode OK・NG / TipTap 本文 等)
 * から呼ばれる。レスポンスは {url} だけ返し、呼び出し側は form の image_url
 * field にセットして save 時に親モデル (Store / Article) と一緒に保存する。
 *
 * - 親モデルに紐付けないので、save 前に kind ごとに別 sub-path に書く程度の
 *   分類だけ持っておく (運用で見やすくするため)。
 * - 親 model 紐付け削除はしない (orphan が出るが、運用的に許容)。
 *   将来掃除したくなったら別 batch で。
 */
class MediaUploadController extends Controller
{
    /**
     * POST /admin/uploads/{kind}
     *   multipart: image=<file>
     *   returns: { url: string }
     */
    public function store(UploadMediaRequest $request, string $kind): JsonResponse
    {
        $url = MediaStorage::upload($request->file('image'), $this->resolveCategory($kind));

        return response()->json(['url' => $url], 201);
    }

    /**
     * URL path の "kind" を S3 上の sub-path に正規化する。
     * 未知 kind は "misc" 扱いで弾かない (フロントの新規 form 追加で
     * バックエンド変更を強要しないため)。
     */
    private function resolveCategory(string $kind): string
    {
        return match ($kind) {
            'staff-photo' => 'staff-photos',
            'dress-code' => 'dress-code',
            'article-body' => 'articles/body',
            'store-extra' => 'stores/extra',
            default => 'misc/' . preg_replace('/[^a-z0-9-]/', '', strtolower($kind)),
        };
    }
}

<?php

namespace App\Support;

use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Recta のフロント側 (StoreListPage / ReviewsPage / UsersPage 等) は
 * Laravel 標準の paginate() が返す flat 形 (current_page, total,
 * last_page を root に持つ) を直接読みに来る設計。
 *
 * Resource::collection($paginator) は便利だが、出力が
 * `{ data: [...], links: {...}, meta: {...} }` に勝手にラップされてしまい、
 * `withoutWrapping()` でも解除できない。そのため paginator 内部の
 * collection だけを Resource 変換に差し替えて、外形は paginator のまま
 * 返す形にする。
 */
class PaginatorWithResource
{
    /**
     * @template T of \Illuminate\Database\Eloquent\Model
     * @param  LengthAwarePaginator<int, T>  $paginator
     * @param  class-string<JsonResource>    $resourceClass
     */
    public static function map(LengthAwarePaginator $paginator, string $resourceClass): LengthAwarePaginator
    {
        $paginator->getCollection()->transform(function ($item) use ($resourceClass) {
            return (new $resourceClass($item))->resolve();
        });
        return $paginator;
    }
}

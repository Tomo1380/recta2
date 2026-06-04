<?php

namespace App\Http\Controllers\Admin\Concerns;

use Illuminate\Contracts\Database\Eloquent\Builder;
use Illuminate\Http\Request;

/**
 * 管理画面の一覧 endpoint に「日時 / 更新日でのソート」を付ける共通処理。
 *
 * ?sort=created_at|updated_at & ?order=asc|desc を受け取り、許可カラム以外や
 * 不正な order は既定 (created_at desc) に丸める。各 controller の index で
 * $this->applyListSort($query, $request) を呼ぶだけで使える。
 */
trait SortsListByDate
{
    /**
     * @param  list<string>  $allowed  ソート可能なカラムの allowlist
     */
    protected function applyListSort(
        Builder $query,
        Request $request,
        array $allowed = ['created_at', 'updated_at'],
        string $defaultColumn = 'created_at',
        string $defaultOrder = 'desc',
    ): Builder {
        $sort = (string) $request->input('sort', $defaultColumn);
        if (!in_array($sort, $allowed, true)) {
            $sort = $defaultColumn;
        }

        $order = strtolower((string) $request->input('order', $defaultOrder));
        if (!in_array($order, ['asc', 'desc'], true)) {
            $order = $defaultOrder;
        }

        return $query->orderBy($sort, $order);
    }
}

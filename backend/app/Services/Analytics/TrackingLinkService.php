<?php

namespace App\Services\Analytics;

use App\Models\TrackingLink;
use Illuminate\Support\Str;

/**
 * 計測リンク（アフィリエイト / 店舗別LINE導線 / SNSキャンペーン）の発行。
 *
 * destination_url を省略した場合は LINE 公式アカウント友だち追加URLを既定にする。
 */
class TrackingLinkService
{
    /**
     * 計測リンクを発行する。code 未指定なら衝突しない短いランダム code を採番。
     *
     * @param array{label:string,target_type:string,store_id?:int|null,article_id?:int|null,area?:string|null,destination_url?:string|null,code?:string|null} $data
     */
    public function issue(array $data, ?int $adminUserId = null): TrackingLink
    {
        return TrackingLink::create([
            'code' => $this->resolveCode($data['code'] ?? null),
            'label' => $data['label'],
            'target_type' => $data['target_type'],
            'store_id' => $data['store_id'] ?? null,
            'article_id' => $data['article_id'] ?? null,
            'area' => $data['area'] ?? null,
            'destination_url' => $this->trimOrNull($data['destination_url'] ?? null) ?? $this->defaultLineUrl(),
            'created_by' => $adminUserId,
            'is_active' => true,
        ]);
    }

    /**
     * 公開リダイレクトURL (`https://<host>/r/{code}`) を返す。
     */
    public function publicUrl(TrackingLink $link): string
    {
        return rtrim(config('app.url'), '/') . '/r/' . $link->code;
    }

    private function resolveCode(?string $requested): string
    {
        $requested = $this->trimOrNull($requested);
        if ($requested !== null) {
            return $requested;
        }

        do {
            $code = Str::lower(Str::random(7));
        } while (TrackingLink::where('code', $code)->exists());

        return $code;
    }

    private function defaultLineUrl(): string
    {
        $basicId = config('services.line.official_account_id') ?: '@043uxuen';

        return 'https://line.me/R/ti/p/' . $basicId;
    }

    private function trimOrNull(?string $value): ?string
    {
        $value = is_string($value) ? trim($value) : null;

        return ($value === null || $value === '') ? null : $value;
    }
}

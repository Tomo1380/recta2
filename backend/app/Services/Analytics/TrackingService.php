<?php

namespace App\Services\Analytics;

use App\Models\LinkClick;
use App\Models\PageView;
use App\Models\TrackingLink;
use Illuminate\Http\Request;

/**
 * 計測の書き込み担当。PV / LINE追加クリックを正規化して記録する。
 *
 * IP は生で保存せず app.key を salt にした sha256 ハッシュにする (個人情報を残さない)。
 * session_id はフロントが cookie `recta_aid` で発行する匿名IDで、ユニーク概算に使う。
 */
class TrackingService
{
    /** PV として受け付ける page_type のホワイトリスト。 */
    private const PAGE_TYPES = [
        'home', 'store', 'column', 'area_landing', 'category_landing',
        'store_list', 'relocate', 'glossary', 'other',
    ];

    /**
     * PV を 1 件記録する。
     *
     * @param array{page_type?:string,store_id?:int|null,article_id?:int|null,area?:string|null,path?:string|null,session_id?:string|null} $payload
     */
    public function recordPageView(Request $request, array $payload): void
    {
        PageView::create([
            'session_id' => $this->cleanSession($payload['session_id'] ?? null),
            'page_type' => $this->normalisePageType($payload['page_type'] ?? null),
            'store_id' => $payload['store_id'] ?? null,
            'article_id' => $payload['article_id'] ?? null,
            'area' => $this->trimOrNull($payload['area'] ?? null),
            'path' => mb_substr((string) ($payload['path'] ?? $request->path()), 0, 1024),
            'referrer' => $this->referrer($request),
            'ip_hash' => $this->ipHash($request),
            'user_agent' => $this->userAgent($request),
        ]);
    }

    /**
     * サイト内 CTA / アフィリエイトからの LINE 追加クリックを記録する。
     *
     * @param array{source?:string|null,page_type?:string|null,store_id?:int|null,article_id?:int|null,area?:string|null,session_id?:string|null} $payload
     */
    public function recordLineClick(Request $request, array $payload, ?TrackingLink $link = null): LinkClick
    {
        return LinkClick::create([
            'tracking_link_id' => $link?->id,
            'source' => $this->trimOrNull($payload['source'] ?? ($link ? 'affiliate' : null)),
            'page_type' => $this->trimOrNull($payload['page_type'] ?? null),
            'store_id' => $payload['store_id'] ?? $link?->store_id,
            'article_id' => $payload['article_id'] ?? $link?->article_id,
            'area' => $this->trimOrNull($payload['area'] ?? $link?->area),
            'session_id' => $this->cleanSession($payload['session_id'] ?? null),
            'ip_hash' => $this->ipHash($request),
            'referrer' => $this->referrer($request),
            'user_agent' => $this->userAgent($request),
        ]);
    }

    private function normalisePageType(?string $type): string
    {
        $type = $this->trimOrNull($type);

        return in_array($type, self::PAGE_TYPES, true) ? $type : 'other';
    }

    private function ipHash(Request $request): ?string
    {
        $ip = $request->ip();
        if (!$ip) {
            return null;
        }

        return hash('sha256', $ip . '|' . config('app.key'));
    }

    private function referrer(Request $request): ?string
    {
        $ref = $request->headers->get('referer');

        return $ref ? mb_substr($ref, 0, 1024) : null;
    }

    private function userAgent(Request $request): ?string
    {
        $ua = $request->userAgent();

        return $ua ? mb_substr($ua, 0, 512) : null;
    }

    private function cleanSession(?string $value): ?string
    {
        $value = $this->trimOrNull($value);

        return $value ? mb_substr($value, 0, 64) : null;
    }

    private function trimOrNull(?string $value): ?string
    {
        $value = is_string($value) ? trim($value) : null;

        return ($value === null || $value === '') ? null : $value;
    }
}

<?php

namespace App\Http\Controllers;

use App\Models\Area;
use App\Models\Article;
use App\Models\Category;
use App\Models\Store;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Cache;

/**
 * sitemap.xml と robots.txt の動的生成。
 *
 * nginx 側で `/sitemap.xml` → `/api/sitemap`, `/robots.txt` → `/api/robots`
 * に rewrite している前提。
 */
class SeoController extends Controller
{
    /**
     * sitemap キャッシュキーのプレフィクス。Store / Article のモデルイベントから
     * `Cache::tags([self::CACHE_TAG])->flush()` で一括無効化する。
     */
    public const CACHE_TAG = 'seo:sitemap';

    public function sitemap(Request $request): Response
    {
        $base = $this->resolveBaseUrl($request);

        // 全件 scan は store / article が増えると遅くなる。
        // base URL ごとにキャッシュして DB アクセスを抑える。
        // tag-based なので、Store / Article 保存時に SeoController::CACHE_TAG を
        // flush すれば全 base URL ぶん即時無効化される。
        $xml = Cache::tags([self::CACHE_TAG])->remember(
            "sitemap:{$base}",
            3600,
            fn () => $this->buildXml($this->collectSitemapUrls($base)),
        );

        return response($xml, 200, [
            'Content-Type' => 'application/xml; charset=UTF-8',
            'Cache-Control' => 'public, max-age=3600',
        ]);
    }

    /**
     * @return array<int, array{loc:string, lastmod?:?string, priority?:string, changefreq?:string}>
     */
    private function collectSitemapUrls(string $base): array
    {
        $urls = [];

        // Top
        $urls[] = ['loc' => $base . '/', 'priority' => '1.0', 'changefreq' => 'daily'];
        // Lists
        $urls[] = ['loc' => $base . '/stores', 'priority' => '0.9', 'changefreq' => 'daily'];
        $urls[] = ['loc' => $base . '/columns', 'priority' => '0.8', 'changefreq' => 'weekly'];
        $urls[] = ['loc' => $base . '/relocate-support', 'priority' => '0.7', 'changefreq' => 'monthly'];

        // 個別店舗: slug があれば slug URL を、なければ ID で出す
        Store::where('publish_status', 'published')
            ->select('id', 'slug', 'updated_at')
            ->orderBy('id')
            ->chunkById(500, function ($stores) use (&$urls, $base) {
                foreach ($stores as $s) {
                    $key = $s->slug ?: (string) $s->id;
                    $urls[] = [
                        'loc' => $base . '/stores/' . $key,
                        'lastmod' => optional($s->updated_at)->toAtomString(),
                        'priority' => '0.7',
                        'changefreq' => 'weekly',
                    ];
                }
            });

        Article::where('status', 'published')
            ->whereNotNull('published_at')
            ->select('id', 'slug', 'updated_at', 'published_at')
            ->orderBy('id')
            ->chunkById(500, function ($articles) use (&$urls, $base) {
                foreach ($articles as $a) {
                    $urls[] = [
                        'loc' => $base . '/columns/' . $a->slug,
                        'lastmod' => optional($a->updated_at ?? $a->published_at)->toAtomString(),
                        'priority' => '0.7',
                        'changefreq' => 'monthly',
                    ];
                }
            });

        // SEO ランディング: エリア LP / 業態 LP / エリア × 業態 LP
        $visibleAreas = Area::where('visible', true)->get(['slug']);
        $visibleCategories = Category::where('visible', true)->get(['slug']);

        foreach ($visibleAreas as $area) {
            $urls[] = [
                'loc' => $base . '/jobs/areas/' . $area->slug,
                'priority' => '0.8',
                'changefreq' => 'weekly',
            ];
        }

        foreach ($visibleCategories as $cat) {
            $urls[] = [
                'loc' => $base . '/jobs/categories/' . $cat->slug,
                'priority' => '0.8',
                'changefreq' => 'weekly',
            ];
        }

        foreach ($visibleAreas as $area) {
            foreach ($visibleCategories as $cat) {
                $urls[] = [
                    'loc' => $base . '/jobs/areas/' . $area->slug . '/categories/' . $cat->slug,
                    'priority' => '0.75',
                    'changefreq' => 'weekly',
                ];
            }
        }

        return $urls;
    }

    public function robots(Request $request): Response
    {
        $base = $this->resolveBaseUrl($request);
        $body = implode("\n", [
            'User-agent: *',
            'Allow: /',
            'Disallow: /admin',
            'Disallow: /admin/',
            'Disallow: /api/',
            'Disallow: /mypage',
            'Disallow: /login',
            'Disallow: /auth/',
            // 比較 URL は ids の組み合わせで実質無限・薄ページなのでクロール対象外
            'Disallow: /compare/',
            // 口コミ投稿フォーム自体は store-detail から到達するもので、
            // 検索結果に出す価値はない
            'Disallow: /stores/*/review',
            '',
            'Sitemap: ' . $base . '/sitemap.xml',
            '',
        ]);

        return response($body, 200, [
            'Content-Type' => 'text/plain; charset=UTF-8',
            'Cache-Control' => 'public, max-age=86400',
        ]);
    }

    /**
     * 環境変数 APP_URL を優先し、開発環境のみリクエストヘッダから推定する。
     *
     * 本番で Host ヘッダにフォールバックすると Host header injection で
     * 攻撃者制御のドメインを sitemap に書き出され SEO スパムの加害者になる。
     * したがって本番では APP_URL の明示設定を必須とする。
     */
    private function resolveBaseUrl(Request $request): string
    {
        $configured = rtrim((string) config('app.url'), '/');
        if ($configured && $configured !== 'http://localhost') {
            return $configured;
        }
        if (app()->environment('production')) {
            // 本番で APP_URL 未設定はミスコンフィグ。500 で気付かせる。
            throw new \RuntimeException(
                'APP_URL must be configured in production for SEO endpoints '
                . '(sitemap.xml / robots.txt). Falling back to Host header is '
                . 'unsafe in public-facing environments.'
            );
        }
        return rtrim($request->getSchemeAndHttpHost(), '/');
    }

    /**
     * @param  array<int, array{loc:string, lastmod?:?string, priority?:string, changefreq?:string}>  $urls
     */
    private function buildXml(array $urls): string
    {
        $lines = [];
        $lines[] = '<?xml version="1.0" encoding="UTF-8"?>';
        $lines[] = '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">';
        foreach ($urls as $u) {
            $lines[] = '  <url>';
            $lines[] = '    <loc>' . htmlspecialchars($u['loc'], ENT_XML1 | ENT_QUOTES, 'UTF-8') . '</loc>';
            if (!empty($u['lastmod'])) {
                $lines[] = '    <lastmod>' . $u['lastmod'] . '</lastmod>';
            }
            if (!empty($u['changefreq'])) {
                $lines[] = '    <changefreq>' . $u['changefreq'] . '</changefreq>';
            }
            if (!empty($u['priority'])) {
                $lines[] = '    <priority>' . $u['priority'] . '</priority>';
            }
            $lines[] = '  </url>';
        }
        $lines[] = '</urlset>';
        return implode("\n", $lines);
    }
}

<?php

namespace App\Services\Content;

use App\Models\SiteSetting;
use App\Support\MediaStorage;
use Illuminate\Support\Facades\Http;
use Imagick;
use ImagickDraw;
use ImagickPixel;
use RuntimeException;

/**
 * SNS シェア用の OG 画像 (1200x630) を Imagick で合成する。
 *
 * トップページのヒーローを模した構図:
 *   - ヒーロー背景画像 (cover) + 視認性確保のダークグラデ
 *   - 左上に AI ラベル pill / 右上に「AIチャットで質問できる」訴求 pill
 *   - 下部左に ナイトワーク求人バッジ → Recta ロゴ → タグライン → サブタイトル
 *   - 下端にゴールドのライン
 *
 * 文言/背景は site_settings (banner_*) から取得し、保存時に
 * regenerateHomeOgImage() で焼き直して S3 の固定キーへ put する。
 */
class OgImageRenderer
{
    private const W = 1200;
    private const H = 630;
    private const PAD = 64;

    // 配色 (トップページのヒーローに合わせる)
    private const GOLD = '#d4af37';
    private const GOLD_LIGHT = '#ffe066';
    private const PINK = 'rgb(200,96,128)';
    private const WHITE = '#ffffff';
    private const AMBER_TEXT = 'rgb(255,224,150)';

    /**
     * banner_* 設定から OG 画像を作り直し、固定キーへ保存して URL を返す。
     */
    public function regenerateHomeOgImage(): string
    {
        $settings = $this->bannerSettings();
        $blob = $this->renderHomeOg($settings);

        $url = MediaStorage::putBytes($blob, (string) config('og.object_key', 'og/home.jpg'), 'image/jpeg');

        // 配信側のキャッシュバスター兼「生成済みか」の目印。
        SiteSetting::updateOrCreate(['key' => 'og_image_updated_at'], ['value' => (string) now()->timestamp]);

        return $url;
    }

    /**
     * 現在保存済みの OG 画像バイナリを返す。無ければ生成して保存してから返す。
     * 配信 endpoint の遅延生成フォールバックに使う。
     */
    public function currentOrGenerate(): string
    {
        $existing = MediaStorage::getBytes((string) config('og.object_key', 'og/home.jpg'));
        if ($existing !== null) {
            return $existing;
        }

        $blob = $this->renderHomeOg($this->bannerSettings());
        MediaStorage::putBytes($blob, (string) config('og.object_key', 'og/home.jpg'), 'image/jpeg');
        return $blob;
    }

    /**
     * @param  array<string, string|null>  $settings  banner_* 連想配列
     * @return string  JPEG バイナリ
     */
    public function renderHomeOg(array $settings): string
    {
        if (!class_exists(Imagick::class)) {
            throw new RuntimeException('Imagick 拡張が無いため OG 画像を生成できません。');
        }

        $tagline = $this->fallback($settings['hero_tagline'] ?? null, 'AIと探す、理想のナイトワーク');
        $subtitle = $this->fallback($settings['hero_subtitle'] ?? null, 'キャバクラ・ラウンジ・クラブ｜全国厳選');
        $badge = $this->fallback($settings['hero_badge'] ?? null, 'ナイトワーク求人');
        $aiLabel = $this->fallback($settings['hero_ai_label'] ?? null, 'AI MATCHING');
        $heroUrl = $settings['hero_image_url'] ?? null;

        $canvas = $this->buildBackground($heroUrl);
        $this->drawScrim($canvas);
        $this->drawBottomGoldLine($canvas);

        $fontRegular = $this->fontPath(false);
        $fontBold = $this->fontPath(true);

        // ── 上段の pill ──
        $this->drawOutlinePill($canvas, $fontRegular, self::PAD, 48, strtoupper($aiLabel), self::GOLD_LIGHT, self::GOLD);
        $this->drawPromoPill($canvas, $fontBold, 'AIチャットで質問できる →');

        // ── 下段スタック (下から積む) ──
        $bottom = self::H - self::PAD;

        // サブタイトル
        $this->drawText($canvas, $fontRegular, self::PAD, $bottom, $subtitle, 28, self::AMBER_TEXT);
        $bottom -= 46;

        // タグライン (必要なら 2 行折返し)
        $lines = $this->wrapText($fontBold, $tagline, 44, self::W - self::PAD * 2, 2);
        foreach (array_reverse($lines) as $line) {
            $this->drawText($canvas, $fontBold, self::PAD, $bottom, $line, 44, self::WHITE);
            $bottom -= 58;
        }
        $bottom -= 6;

        // ゴールド下線
        $this->drawRect($canvas, self::PAD, $bottom, self::PAD + 84, $bottom + 3, self::GOLD);
        $bottom -= 26;

        // Recta ロゴ + ゴールドドット
        $logoSize = 92;
        $this->drawText($canvas, $fontBold, self::PAD, $bottom, 'Recta', $logoSize, self::WHITE);
        $logoW = $this->textWidth($fontBold, 'Recta', $logoSize);
        $this->drawCircle($canvas, self::PAD + $logoW + 16, $bottom - 8, 8, self::GOLD);
        $bottom -= ($logoSize + 18);

        // ナイトワーク求人バッジ (ピンク)
        $this->drawFilledPill($canvas, $fontBold, self::PAD, $bottom - 26, $badge, 22, self::PINK, self::WHITE);

        $canvas->setImageFormat('jpeg');
        $canvas->setImageCompressionQuality(90);
        $canvas->stripImage();
        $blob = $canvas->getImageBlob();
        $canvas->clear();
        $canvas->destroy();

        return $blob;
    }

    /**
     * @return array<string, string|null>
     */
    private function bannerSettings(): array
    {
        $keys = ['hero_tagline', 'hero_subtitle', 'hero_badge', 'hero_ai_label', 'hero_image_url'];
        $values = SiteSetting::whereIn('key', $keys)->pluck('value', 'key');
        $out = [];
        foreach ($keys as $k) {
            $out[$k] = $values[$k] ?? null;
        }
        return $out;
    }

    /**
     * 背景 Imagick を用意する。ヒーロー画像を cover で敷き、取得できなければ
     * ダークグラデ単色にフォールバックする。
     */
    private function buildBackground(?string $heroUrl): Imagick
    {
        $bytes = $this->fetchHeroBytes($heroUrl);

        if ($bytes !== null) {
            try {
                $img = new Imagick();
                $img->readImageBlob($bytes);
                if (method_exists($img, 'autoOrientImage')) {
                    $img->autoOrientImage();
                }
                // cover + 中央クロップで 1200x630 ちょうどにする。
                $img->cropThumbnailImage(self::W, self::H);
                $img->setImagePage(self::W, self::H, 0, 0);
                return $img;
            } catch (\Throwable $e) {
                report($e);
            }
        }

        // フォールバック: ダークグラデ。
        // gradient: pseudo image は format が "GRADIENT" 固定で JPEG 化できないため、
        // 通常キャンバス (newImage) に合成して「焼き付ける」。
        $canvas = new Imagick();
        $canvas->newImage(self::W, self::H, new ImagickPixel('#0d1416'));
        $canvas->setImageFormat('jpeg');

        $grad = new Imagick();
        $grad->newPseudoImage(self::W, self::H, 'gradient:#1b2528-#0d1416');
        $canvas->compositeImage($grad, Imagick::COMPOSITE_OVER, 0, 0);
        $grad->clear();
        $grad->destroy();

        return $canvas;
    }

    private function fetchHeroBytes(?string $heroUrl): ?string
    {
        // 1) 管理画面でアップロードされたヒーロー画像 / env の既定 URL を HTTP 取得。
        $candidates = array_values(array_filter([
            $heroUrl,
            config('og.default_hero_url'),
        ]));

        foreach ($candidates as $url) {
            if (!is_string($url) || $url === '') {
                continue;
            }
            try {
                $res = Http::timeout(6)->get($url);
                if ($res->successful()) {
                    return $res->body();
                }
            } catch (\Throwable $e) {
                report($e);
            }
        }

        // 2) どれも取得できなければ backend 同梱の既定ヒーロー (frontend の
        //    /hero-top.jpg のコピー) を使う。これでヒーロー未設定でも OG は
        //    トップと同じヒーロー画像入りになる (ネットワーク非依存)。
        $bundled = resource_path('og/hero-default.jpg');
        if (is_file($bundled)) {
            $bytes = @file_get_contents($bundled);
            if ($bytes !== false && $bytes !== '') {
                return $bytes;
            }
        }

        return null;
    }

    /** 視認性確保の下重ダークグラデを overlay する。 */
    private function drawScrim(Imagick $canvas): void
    {
        $scrim = new Imagick();
        // 上は透明、下に向かって濃い暗幕。
        $scrim->newPseudoImage(self::W, self::H, 'gradient:rgba(8,6,16,0.28)-rgba(8,6,16,0.86)');
        $canvas->compositeImage($scrim, Imagick::COMPOSITE_OVER, 0, 0);
        $scrim->clear();
        $scrim->destroy();
    }

    private function drawBottomGoldLine(Imagick $canvas): void
    {
        $draw = new ImagickDraw();
        $draw->setFillColor(new ImagickPixel(self::GOLD));
        $draw->rectangle(0, self::H - 4, self::W, self::H);
        $canvas->drawImage($draw);
        $draw->destroy();
    }

    // ───────────────────────── テキスト/図形ヘルパ ─────────────────────────

    /** 左上スタイルの枠線 pill (塗りつぶし無し, 文字色=枠色)。 */
    private function drawOutlinePill(
        Imagick $canvas,
        string $font,
        int $x,
        int $y,
        string $text,
        string $textColor,
        string $borderColor,
    ): void {
        $size = 22;
        $padX = 22;
        $h = 48;
        $tw = $this->textWidth($font, $text, $size);
        $w = (int) ($tw + $padX * 2);

        $draw = new ImagickDraw();
        $draw->setStrokeColor(new ImagickPixel($borderColor));
        $draw->setStrokeWidth(1.5);
        $draw->setFillColor(new ImagickPixel('rgba(212,175,55,0.10)'));
        $draw->roundRectangle($x, $y, $x + $w, $y + $h, $h / 2, $h / 2);
        $canvas->drawImage($draw);
        $draw->destroy();

        $this->drawTextCentered($canvas, $font, $x + $w / 2, $y + $h / 2, $text, $size, $textColor);
    }

    /** 右上の訴求 pill (アンバー塗り, 濃色文字)。 */
    private function drawPromoPill(Imagick $canvas, string $font, string $text): void
    {
        $size = 26;
        $padX = 28;
        $h = 56;
        $y = 44;
        $tw = $this->textWidth($font, $text, $size);
        $w = (int) ($tw + $padX * 2);
        $x = self::W - self::PAD - $w;

        $draw = new ImagickDraw();
        $draw->setFillColor(new ImagickPixel(self::GOLD));
        $draw->roundRectangle($x, $y, $x + $w, $y + $h, $h / 2, $h / 2);
        $canvas->drawImage($draw);
        $draw->destroy();

        $this->drawTextCentered($canvas, $font, $x + $w / 2, $y + $h / 2, $text, $size, '#1b1208');
    }

    /** 塗りつぶし pill (バッジ用)。左上 (x,y) 起点。 */
    private function drawFilledPill(
        Imagick $canvas,
        string $font,
        int $x,
        int $y,
        string $text,
        int $size,
        string $bgColor,
        string $textColor,
    ): void {
        $padX = 18;
        $h = $size + 20;
        $tw = $this->textWidth($font, $text, $size);
        $w = (int) ($tw + $padX * 2);

        $draw = new ImagickDraw();
        $draw->setFillColor(new ImagickPixel($bgColor));
        $draw->roundRectangle($x, $y, $x + $w, $y + $h, 8, 8);
        $canvas->drawImage($draw);
        $draw->destroy();

        $this->drawTextCentered($canvas, $font, $x + $w / 2, $y + $h / 2, $text, $size, $textColor);
    }

    /** ベースライン (x,y) 左寄せでテキストを描く。 */
    private function drawText(Imagick $canvas, string $font, int $x, int $y, string $text, int $size, string $color): void
    {
        $draw = new ImagickDraw();
        $draw->setFont($font);
        $draw->setFontSize($size);
        $draw->setFillColor(new ImagickPixel($color));
        $draw->setTextAlignment(Imagick::ALIGN_LEFT);
        $canvas->annotateImage($draw, $x, $y, 0, $text);
        $draw->destroy();
    }

    /** (cx, cy) を中心にテキストを描く (pill ラベル用)。 */
    private function drawTextCentered(Imagick $canvas, string $font, float $cx, float $cy, string $text, int $size, string $color): void
    {
        $draw = new ImagickDraw();
        $draw->setFont($font);
        $draw->setFontSize($size);
        $draw->setFillColor(new ImagickPixel($color));
        $draw->setTextAlignment(Imagick::ALIGN_CENTER);
        $metrics = $canvas->queryFontMetrics($draw, $text);
        // 垂直中央: ascender/descender から中心合わせ。
        $yBaseline = $cy + ($metrics['ascender'] + $metrics['descender']) / 2;
        $canvas->annotateImage($draw, $cx, $yBaseline, 0, $text);
        $draw->destroy();
    }

    private function drawRect(Imagick $canvas, int $x1, int $y1, int $x2, int $y2, string $color): void
    {
        $draw = new ImagickDraw();
        $draw->setFillColor(new ImagickPixel($color));
        $draw->rectangle($x1, $y1, $x2, $y2);
        $canvas->drawImage($draw);
        $draw->destroy();
    }

    private function drawCircle(Imagick $canvas, int $cx, int $cy, int $r, string $color): void
    {
        $draw = new ImagickDraw();
        $draw->setFillColor(new ImagickPixel($color));
        $draw->circle($cx, $cy, $cx + $r, $cy);
        $canvas->drawImage($draw);
        $draw->destroy();
    }

    private function textWidth(string $font, string $text, int $size): float
    {
        $draw = new ImagickDraw();
        $draw->setFont($font);
        $draw->setFontSize($size);
        $probe = new Imagick();
        $metrics = $probe->queryFontMetrics($draw, $text);
        $probe->destroy();
        $draw->destroy();
        return $metrics['textWidth'];
    }

    /**
     * 最大幅に収まるよう日本語テキストを文字単位で折返す。
     *
     * @return list<string>  最大 $maxLines 行 (超過分は末尾を … で省略)
     */
    private function wrapText(string $font, string $text, int $size, int $maxWidth, int $maxLines): array
    {
        $chars = preg_split('//u', $text, -1, PREG_SPLIT_NO_EMPTY) ?: [];
        $lines = [];
        $cur = '';
        foreach ($chars as $ch) {
            $try = $cur . $ch;
            if ($this->textWidth($font, $try, $size) > $maxWidth && $cur !== '') {
                $lines[] = $cur;
                $cur = $ch;
                if (count($lines) === $maxLines) {
                    break;
                }
            } else {
                $cur = $try;
            }
        }
        if (count($lines) < $maxLines && $cur !== '') {
            $lines[] = $cur;
        } elseif (count($lines) === $maxLines) {
            // まだ文字が残っている場合は最終行を省略表記にする。
            $last = $lines[$maxLines - 1] ?? '';
            while ($last !== '' && $this->textWidth($font, $last . '…', $size) > $maxWidth) {
                $last = mb_substr($last, 0, mb_strlen($last) - 1);
            }
            $lines[$maxLines - 1] = $last . '…';
        }
        return $lines ?: [''];
    }

    private function fontPath(bool $bold): string
    {
        $configured = $bold
            ? (config('og.font_path_bold') ?: config('og.font_path'))
            : config('og.font_path');

        $candidates = array_values(array_filter([
            $configured,
            // よくある Noto CJK の配置 (Alpine font-noto-cjk / Debian fonts-noto-cjk)。
            $bold ? '/usr/share/fonts/noto/NotoSansCJK-Bold.ttc' : null,
            '/usr/share/fonts/noto/NotoSansCJK-Regular.ttc',
            '/usr/share/fonts/noto-cjk/NotoSansCJK-Regular.ttc',
            '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc',
            '/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc',
        ]));

        foreach ($candidates as $path) {
            if (is_string($path) && is_file($path)) {
                return $path;
            }
        }

        throw new RuntimeException(
            'OG 画像用の日本語フォントが見つかりません。OG_FONT_PATH を設定するか font-noto-cjk を導入してください。',
        );
    }

    private function fallback(?string $value, string $default): string
    {
        $v = is_string($value) ? trim($value) : '';
        return $v !== '' ? $v : $default;
    }
}

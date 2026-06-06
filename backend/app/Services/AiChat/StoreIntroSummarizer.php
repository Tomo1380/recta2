<?php

namespace App\Services\AiChat;

use App\Models\Store;
use Illuminate\Support\Facades\Log;

/**
 * 店舗詳細のAIチャット初期メッセージ用「AI紹介文」を生成し、store にキャッシュする。
 *
 * 背景 (2026-06-06 FB): 旧 intro は カテゴリ/エリア/体入時給/営業時間/特徴タグ を
 * 並べていたが、これはヒーロー直下のクイックスタッツ・店舗情報カードと丸被りで
 * 「AIなのにスペックを音読してるだけ」に見えていた。
 *
 * そこで、数値スペックでは伝わらない「雰囲気・働く人・どんな子が活躍してるか・
 * 安心ポイント」を、店舗の自由入力 (features_text / summary_text / staff_comment /
 * recta_episodes 等) から Gemini で要約して出す。
 *
 * コスト対策: 素材テキストの md5 を ai_intro_hash に保存し、変化が無ければ
 * 再生成しない (= 1店舗・1コンテンツ版につき1回だけ課金、以降は即時返却)。
 * 素材が変わると hash が変わり、次の閲覧時に自動で作り直される。
 */
class StoreIntroSummarizer
{
    public function __construct(private GeminiClient $gemini) {}

    /**
     * 紹介文を返す (必要なら生成してキャッシュ)。素材が無い / 生成失敗時は
     * 既存キャッシュ (無ければ null) を返し、フロントは従来 fallback で表示する。
     */
    public function intro(Store $store): ?string
    {
        $source = $this->sourceText($store);
        if ($source === '') {
            return $store->ai_intro; // 素材なし → 生成しない
        }

        $hash = md5($source);
        if (!empty($store->ai_intro) && $store->ai_intro_hash === $hash) {
            return $store->ai_intro; // キャッシュヒット
        }

        $apiKey = config('services.gemini.api_key');
        if (!$apiKey) {
            return $store->ai_intro; // キー未設定 → 既存値のまま
        }

        try {
            $text = $this->callGemini($apiKey, $source);
        } catch (\Throwable $e) {
            Log::warning('StoreIntroSummarizer failed', [
                'store' => $store->id,
                'error' => $e->getMessage(),
            ]);
            return $store->ai_intro;
        }

        if ($text === '') {
            return $store->ai_intro;
        }

        // saveQuietly: 紹介文の更新で sitemap キャッシュ flush (Store::booted) を
        // 走らせない。閲覧のたびに副作用を起こさないため。
        $store->forceFill(['ai_intro' => $text, 'ai_intro_hash' => $hash])->saveQuietly();

        return $text;
    }

    /**
     * 要約の素材になる自由入力テキストを 1 本に束ねる。
     * 数値スペック (時給/営業時間/最寄り駅) はあえて含めない。
     */
    private function sourceText(Store $store): string
    {
        $parts = [];

        foreach (['features_text', 'summary_text', 'description'] as $field) {
            $v = trim((string) ($store->{$field} ?? ''));
            if ($v !== '') {
                $parts[] = $v;
            }
        }

        $tags = $store->feature_tags ?? [];
        if (is_array($tags) && $tags !== []) {
            $parts[] = '特徴: ' . implode('、', array_filter($tags, 'is_string'));
        }

        $staff = $store->staff_comment ?? null;
        if (is_array($staff) && !empty($staff['comment'])) {
            $role = trim((string) ($staff['role'] ?? ''));
            $name = trim((string) ($staff['name'] ?? ''));
            $who = trim($role . ($name !== '' ? " {$name}" : ''));
            $parts[] = ($who !== '' ? "{$who}より: " : 'スタッフより: ') . $staff['comment'];
        }

        $episodes = $store->recta_episodes ?? [];
        if (is_array($episodes)) {
            foreach ($episodes as $ep) {
                if (is_array($ep) && !empty($ep['comment'])) {
                    $parts[] = '在籍者の声: ' . $ep['comment'];
                }
            }
        }

        $champagne = trim((string) ($store->champagne_description ?? ''));
        if ($champagne !== '') {
            $parts[] = $champagne;
        }

        return trim(implode("\n", $parts));
    }

    /**
     * Gemini に紹介文を書かせる。スペック羅列を禁止し、雰囲気・人・安心に寄せる。
     */
    private function callGemini(string $apiKey, string $source): string
    {
        $system = <<<'PROMPT'
あなたはナイトワーク求人サイト「Recta」のAIアシスタントです。
求職者が店舗詳細ページを開いたときに最初に表示する、お店の紹介文を1つ作ってください。

# 制約
- 2〜3文、全体で100〜160字程度。
- 体入時給・営業時間・最寄り駅などの数値スペックは書かない（別の場所で既に表示済みのため重複になる）。
- 代わりに「お店の雰囲気・働いている人・どんな子が活躍しているか・初心者でも安心なポイント」を伝える。
- 素材に書かれていない事実（在籍数・具体的な金額など）を創作しない。誇張しない。
- マークダウン記号・箇条書き・絵文字は使わない。丁寧でフレンドリーな日本語の地の文にする。
- 「〜なお店です」「〜が魅力です」のように、求職者に語りかけるトーンで。

出力は紹介文の本文のみ。前置き・見出し・引用符は付けないこと。
PROMPT;

        $payload = [
            'contents' => [
                ['role' => 'user', 'parts' => [['text' => "以下の店舗情報から紹介文を作ってください。\n\n{$source}"]]],
            ],
            'system_instruction' => ['parts' => [['text' => $system]]],
            'generationConfig' => [
                'temperature' => 0.4,
                'maxOutputTokens' => 256,
            ],
        ];

        $response = $this->gemini->generate($apiKey, $payload);
        $data = $response->json();
        $text = $data['candidates'][0]['content']['parts'][0]['text'] ?? '';

        return trim((string) $text);
    }
}

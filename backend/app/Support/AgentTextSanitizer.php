<?php

namespace App\Support;

/**
 * Recta AI の応答テキストを表示用に整える。
 *
 * 役割は 2 つ:
 *  1. [STORE:ID] マーカーを除去する（店舗カードは別途構造化データで表示するため）。
 *  2. 店舗ハルシネーションの安全網。実在店舗が 1 件も紐づいていない
 *     ($hasStores=false) のに、本文に店舗カード形式の行
 *     「店名（エリア/最寄り駅）時給◯◯円〜」が含まれる場合、それはモデルが
 *     search_stores を呼ばずに創作した架空店舗。その行を除去し、存在しない
 *     店名・時給がユーザーに表示されないようにする。
 *
 * システムプロンプト側でも創作を強く禁止しているが、Gemini Flash は
 * 非決定的なため、決定的なサーバ側ガードで「絶対に架空店舗を出さない」
 * ことを担保する。
 */
class AgentTextSanitizer
{
    // 「（…駅…）」または「（…/…）」のような、エリア/駅を含む丸括弧 + 時給 を
    // 含む行 = 店舗カード行。駅/スラッシュを必須にすることで、業界用語の
    // 解説文（例「指名バックは1回1,000〜3,000円」）を誤って消さない。
    private const STORE_CARD_LINE =
        '/[（(][^（()）]*(?:駅|\/)[^（()）]*[)）][^\n]*時給/u';

    public static function strip(string $aiText, bool $hasStores): string
    {
        // 1. [STORE:ID] マーカー除去（従来動作）
        $text = preg_replace('/\[STORE:\d+\]\s*/u', '', $aiText);

        // 2. 実店舗ゼロなのに店舗カード行があれば、それは創作 → 除去
        if (!$hasStores && preg_match(self::STORE_CARD_LINE, $text)) {
            $lines = preg_split('/\R/u', $text);
            $lines = array_filter(
                $lines,
                fn ($line) => !preg_match(self::STORE_CARD_LINE, $line)
            );
            $text = implode("\n", $lines);
        }

        // 3. 行除去で空いた連続改行を整理
        $text = preg_replace('/\n{3,}/u', "\n\n", $text);

        return trim($text);
    }
}

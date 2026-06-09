<?php

namespace App\Support;

/**
 * Recta AI の応答テキストを表示用に整える。
 *
 * 役割は 3 つ:
 *  1. [STORE:ID] / [STORE:ID|コメント] マーカーを処理する。店舗カードは別途
 *     構造化データ(stores)で表示するため、本文からはマーカーを取り除く。
 *     ただし「カードをどこに差し込むか」が分かるよう、最初のマーカー位置に
 *     内部スロット CARD_SLOT を 1 つだけ残す（実店舗がある場合のみ）。
 *     → splitParts() でこのスロットを境に pre / post に分割し、フロントは
 *       「pre テキスト → 店舗カード → post テキスト」の順で描画できる。
 *  2. 店舗ハルシネーションの安全網。実在店舗が 1 件も紐づいていない
 *     ($hasStores=false) のに、本文に店舗カード形式の行
 *     「店名（エリア/最寄り駅）時給◯◯円〜」が含まれる場合、それはモデルが
 *     search_stores を呼ばずに創作した架空店舗。その行を除去する。
 *  3. CARD_SLOT はクライアントには出さない内部トークン。必ず splitParts() で
 *     取り除いてから返すこと（strip() の戻り値には含まれる）。
 *
 * システムプロンプト側でも創作を強く禁止しているが、Gemini Flash は
 * 非決定的なため、決定的なサーバ側ガードで「絶対に架空店舗を出さない」
 * ことを担保する。
 */
class AgentTextSanitizer
{
    /** 店舗カードの差し込み位置を示す内部スロット（クライアントには出さない）。 */
    public const CARD_SLOT = '[[STORES]]';

    // マーカー単独行（行頭の箇条書き記号「・- *」を許容、行全体がマーカー）。
    private const MARKER_ONLY_LINE =
        '/^[ \t　]*[・\-\*]?[ \t　]*\[STORE:\d+(?:\|[^\]\n]*)?\][ \t　]*$/u';

    // 行内に埋め込まれたマーカー。
    private const INLINE_MARKER = '/\[STORE:\d+(?:\|[^\]\n]*)?\]\s*/u';

    // 「（…駅…）」または「（…/…）」のような、エリア/駅を含む丸括弧 + 時給 を
    // 含む行 = 店舗カード行。駅/スラッシュを必須にすることで、業界用語の
    // 解説文（例「指名バックは1回1,000〜3,000円」）を誤って消さない。
    private const STORE_CARD_LINE =
        '/[（(][^（()）]*(?:駅|\/)[^（()）]*[)）][^\n]*時給/u';

    public static function strip(string $aiText, bool $hasStores): string
    {
        // 1. マーカー処理。マーカー単独行は除去し、最初の出現位置に
        //    CARD_SLOT を 1 つだけ挿入する（実店舗がある場合のみ）。
        $lines = preg_split('/\R/u', $aiText);
        $out = [];
        $slotInserted = false;
        foreach ($lines as $line) {
            if (preg_match(self::MARKER_ONLY_LINE, $line)) {
                if ($hasStores && !$slotInserted) {
                    $out[] = self::CARD_SLOT;
                    $slotInserted = true;
                }
                // それ以外のマーカー行は捨てる
                continue;
            }
            // 行内マーカーは除去（スロットは挿入しない＝従来どおりカードは末尾）
            $out[] = preg_replace(self::INLINE_MARKER, '', $line);
        }
        $text = implode("\n", $out);

        // 2. 実店舗ゼロなのに店舗カード行があれば、それは創作 → 除去
        if (!$hasStores && preg_match(self::STORE_CARD_LINE, $text)) {
            $kept = array_filter(
                preg_split('/\R/u', $text),
                fn ($line) => !preg_match(self::STORE_CARD_LINE, $line)
            );
            $text = implode("\n", $kept);
        }

        // 3. 行除去で空いた連続改行を整理
        $text = preg_replace('/\n{3,}/u', "\n\n", $text);

        return trim($text);
    }

    /**
     * strip() の結果を CARD_SLOT を境に pre / post に分割する。
     * スロットが無ければ pre=全文, post='' を返す。
     *
     * @return array{pre: string, post: string}
     */
    public static function splitParts(string $text): array
    {
        $idx = mb_strpos($text, self::CARD_SLOT);
        if ($idx === false) {
            return ['pre' => trim($text), 'post' => ''];
        }

        $pre = mb_substr($text, 0, $idx);
        $post = mb_substr($text, $idx + mb_strlen(self::CARD_SLOT));

        return ['pre' => trim($pre), 'post' => trim($post)];
    }
}

<?php

namespace Tests\Unit;

use App\Support\AgentTextSanitizer;
use PHPUnit\Framework\TestCase;

class AgentTextSanitizerTest extends TestCase
{
    public function test_strips_store_id_markers(): void
    {
        $in = "[STORE:75] Cafe 翠（六本木/六本木駅）時給3,000円〜\n充実の研修制度で安心です";
        $out = AgentTextSanitizer::strip($in, hasStores: true);

        $this->assertStringNotContainsString('[STORE:', $out);
        // 実店舗が紐づく場合は本文の店舗行を保持する
        $this->assertStringContainsString('Cafe 翠', $out);
        $this->assertStringContainsString('時給3,000円', $out);
    }

    public function test_removes_fabricated_store_lines_when_no_real_stores(): void
    {
        // search_stores を呼ばずモデルが創作した店舗（stores=[] = $hasStores false）
        $in = "未経験から安心のお店をピックアップしました。\n"
            . "・キャバクラ・ルミナス（新宿/新宿駅）時給3,500円〜\n"
            . "未経験歓迎のアットホームなお店です\n"
            . "もっと詳しく知りたい方は、LINEで担当者に直接相談できます！";

        $out = AgentTextSanitizer::strip($in, hasStores: false);

        // 架空の店名・時給は表示されない
        $this->assertStringNotContainsString('キャバクラ・ルミナス', $out);
        $this->assertStringNotContainsString('時給3,500円', $out);
        // 周辺の安全な文や LINE 誘導は残る
        $this->assertStringContainsString('LINEで担当者に直接相談できます', $out);
    }

    public function test_keeps_industry_knowledge_text_with_yen_amounts(): void
    {
        // 業界用語の解説で金額に触れるが店舗ではない → 消してはいけない
        $in = "バックとは歩合給のことです。\n"
            . "指名バックは1回につき1,000〜3,000円ほど加算されます。\n"
            . "ご希望条件を教えていただければお店をお探しします。";

        $out = AgentTextSanitizer::strip($in, hasStores: false);

        $this->assertStringContainsString('指名バックは1回につき1,000〜3,000円', $out);
        $this->assertStringContainsString('お探しします', $out);
    }
}

<?php

namespace Database\Seeders;

use App\Models\Article;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

/**
 * コラム機能のデモ用記事 2 本。
 *
 * body は TipTap の doc JSON 形式、body_html はそれを SSR で出したときの
 * HTML スナップショット (フロント /columns/:slug が body_html を直挿入する)。
 * 実運用では admin が TipTap エディタで書き、保存時に backend が body_html
 * を埋める。
 */
class ArticleSeeder extends Seeder
{
    public function run(): void
    {
        $articles = [
            [
                'slug' => 'cabaclub-vs-lounge',
                'title' => 'キャバクラとラウンジの違いをやさしく解説',
                'excerpt' => '時給・接客スタイル・ノルマ・お客様層まで、ナイトワーク初心者が最初に迷うキャバクラとラウンジの違いを実際の現場目線でまとめました。',
                'category' => '業界解説',
                'tags' => ['キャバクラ', 'ラウンジ', '初心者向け'],
                'thumbnail_url' => 'https://images.unsplash.com/photo-1514306191717-452ec28c7814?w=1200&q=80',
                'body_paragraphs' => [
                    ['h2', 'そもそも何が違うのか'],
                    ['p', 'キャバクラは「華やかさ・お酒を作る・指名で稼ぐ」が基本。ラウンジは「会話中心・接待や 2 軒目利用・落ち着いた大人の空間」が基本です。同じ「ナイトワーク」でくくられがちですが、お客様層もお金の動き方もかなり違います。'],
                    ['h2', '時給・収入の目安'],
                    ['p', '時給はキャバクラの方が高めに設定されているお店が多く、未経験で 4,000〜6,000 円、経験者やランカーで 8,000〜15,000 円。ラウンジは時給 3,000〜5,000 円が中心ですが、その分指名やバックの仕組みは緩めで、無理なく長く働きやすい傾向にあります。'],
                    ['h2', 'ノルマと働きやすさ'],
                    ['p', 'キャバクラはノルマ・同伴・売上目標があるお店が多めです。ラウンジは「ノルマなし・出勤自由」を打ち出す店舗が多く、副業やかけもちと相性が良いのが特徴。本気で稼ぐならキャバクラ、無理なく続けたいならラウンジ、という選び方をする女性が多いです。'],
                    ['h2', 'まずは体験入店してみる'],
                    ['p', 'どちらが自分に合うかは正直、実際に入ってみないと分かりません。Recta では体入確約のお店も多数掲載しているので、気になる業態を 2〜3 件回ってから決めるのが失敗しないコツです。'],
                ],
            ],
            [
                'slug' => 'jokyo-relocation-guide',
                'title' => '上京して東京で働くまでの流れ完全ガイド',
                'excerpt' => '地方在住で東京のナイトワークに興味がある人向けに、面接〜住居〜入店までの実際の流れと、よくある不安への答えをまとめました。',
                'category' => '上京サポート',
                'tags' => ['上京', '初心者向け', '住居サポート'],
                'thumbnail_url' => 'https://images.unsplash.com/photo-1545569310-4e8b6b53d3aa?w=1200&q=80',
                'body_paragraphs' => [
                    ['h2', 'なぜ「上京 + ナイトワーク」が増えているのか'],
                    ['p', '地方と東京で同じ業態でも時給差が 2〜3 倍。さらに東京は店舗数が桁違いに多いので、自分の系統に合うお店が必ず見つかります。最近は住居や引っ越し費用までサポートしてくれるお店も増えていて、「貯金ゼロでも上京できる」体制が整ってきました。'],
                    ['h2', '上京までの 4 ステップ'],
                    ['p', '① オンライン面接 (LINE 通話 / Zoom、15-30 分)。② 体験入店 (体入確約 / 交通費全額負担あり)。③ 住居サポート (家具家電付きシェアハウス、敷金礼金ゼロ物件)。④ 本入店 (引っ越し補助 + 初月家賃 + 入店祝い金)。'],
                    ['h2', 'よくある不安への答え'],
                    ['p', '「身バレ」は写真掲載 NG・特定エリアからのお客様ブロックなど対策可能。「貯金が無くて引っ越せない」もお店持ち負担で OK。「親に知られたくない」は寮や物件契約は本人名義になるので問題なし。'],
                    ['h2', 'まず何をすればいいか'],
                    ['p', 'Recta の AI チャット or LINE で「地方在住で上京を検討中」と伝えてください。エリア・希望時給・出身地に合わせて、住居サポート対応のお店をピックアップしてご紹介します。'],
                ],
            ],
        ];

        foreach ($articles as $i => $a) {
            // TipTap doc JSON を組み立て (heading h2 → level:2, paragraph)。
            $content = [];
            foreach ($a['body_paragraphs'] as [$tag, $text]) {
                if ($tag === 'h2') {
                    $content[] = ['type' => 'heading', 'attrs' => ['level' => 2], 'content' => [['type' => 'text', 'text' => $text]]];
                } else {
                    $content[] = ['type' => 'paragraph', 'content' => [['type' => 'text', 'text' => $text]]];
                }
            }
            $body = ['type' => 'doc', 'content' => $content];

            // 同じパラグラフから body_html を構築 (SSR 表示用)。
            $bodyHtml = '';
            foreach ($a['body_paragraphs'] as [$tag, $text]) {
                $escaped = htmlspecialchars($text, ENT_QUOTES, 'UTF-8');
                $bodyHtml .= $tag === 'h2' ? "<h2>{$escaped}</h2>" : "<p>{$escaped}</p>";
            }

            Article::create([
                'slug' => $a['slug'],
                'title' => $a['title'],
                'excerpt' => $a['excerpt'],
                'body' => $body,
                'body_html' => $bodyHtml,
                'thumbnail_url' => $a['thumbnail_url'],
                'category' => $a['category'],
                'tags' => $a['tags'],
                'status' => 'published',
                'published_at' => now()->subDays(($i + 1) * 7),
            ]);
        }
    }
}

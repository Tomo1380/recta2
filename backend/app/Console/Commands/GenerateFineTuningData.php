<?php

namespace App\Console\Commands;

use App\Models\Store;
use Illuminate\Console\Command;

class GenerateFineTuningData extends Command
{
    protected $signature = 'ai:generate-training-data {--output=storage/app/training_data.jsonl}';
    protected $description = 'Generate Gemini fine-tuning JSONL from store data';

    public function handle(): int
    {
        // Fixed seed for deterministic training data
        mt_srand(54321);

        $stores = Store::where('publish_status', 'published')->get();
        $this->info("Loaded {$stores->count()} stores");

        $grouped = $stores->groupBy('area');
        $byCategory = $stores->groupBy('category');

        $pairs = [];

        // === Pattern 1: エリア検索 ===
        foreach ($grouped as $area => $areaStores) {
            $pairs[] = $this->areaPair($area, $areaStores);
            // エリア + カテゴリ
            foreach ($areaStores->groupBy('category') as $cat => $catStores) {
                if ($catStores->count() >= 2) {
                    $pairs[] = $this->areaCategoryPair($area, $cat, $catStores);
                }
            }
        }

        // === Pattern 2: 条件検索 ===
        $beginnerStores = $stores->filter(fn($s) => $this->hasTag($s, '未経験'));
        if ($beginnerStores->count() >= 2) {
            $pairs[] = $this->conditionPair('未経験でも働けるお店ってありますか？', $beginnerStores->take(5), '未経験歓迎');
        }

        $trialStores = $stores->where('same_day_trial', true);
        if ($trialStores->count() >= 2) {
            $pairs[] = $this->conditionPair('体入できるお店を教えて！', $trialStores->take(5), '体入OK');
        }

        $guaranteeStores = $stores->filter(fn($s) => !empty($s->guarantee_period));
        if ($guaranteeStores->count() >= 2) {
            $pairs[] = $this->conditionPair('保証があるお店はありますか？', $guaranteeStores->take(5), '保証あり');
        }

        $normaFreeStores = $stores->filter(fn($s) => $this->hasTag($s, 'ノルマなし'));
        if ($normaFreeStores->count() >= 2) {
            $pairs[] = $this->conditionPair('ノルマがないお店がいいんですけど', $normaFreeStores->take(5), 'ノルマなし');
        }

        $lastTrainStores = $stores->filter(fn($s) => $this->hasTag($s, '終電'));
        if ($lastTrainStores->count() >= 2) {
            $pairs[] = $this->conditionPair('終電で帰れるお店ってある？', $lastTrainStores->take(5), '終電上がりOK');
        }

        $dailyPayStores = $stores->filter(fn($s) => $this->hasTag($s, '日払'));
        if ($dailyPayStores->count() >= 2) {
            $pairs[] = $this->conditionPair('日払いのお店を探してます', $dailyPayStores->take(5), '日払いあり');
        }

        // === Pattern 3: エリア × 条件 ===
        foreach (['六本木', '銀座', '新宿', '渋谷'] as $area) {
            $areaS = $grouped->get($area, collect());
            $beginners = $areaS->filter(fn($s) => $this->hasTag($s, '未経験'));
            if ($beginners->count() >= 1) {
                $pairs[] = $this->areaConditionPair($area, '未経験', $beginners->take(3));
            }
            $trials = $areaS->where('same_day_trial', true);
            if ($trials->count() >= 1) {
                $pairs[] = $this->areaConditionPair($area, '体入', $trials->take(3));
            }
        }

        // === Pattern 4: 給与系 ===
        $highPay = $stores->where('hourly_min', '>=', 5000)->sortByDesc('hourly_min');
        if ($highPay->count() >= 2) {
            $pairs[] = $this->salaryPair('時給高めのお店ってどこ？', $highPay->take(5));
        }
        foreach (['六本木', '銀座', '新宿'] as $area) {
            $areaHigh = $grouped->get($area, collect())->sortByDesc('hourly_min');
            if ($areaHigh->count() >= 2) {
                $pairs[] = $this->salaryPair("{$area}で稼げるお店は？", $areaHigh->take(3));
            }
        }

        // === Pattern 5: 個別店舗詳細 ===
        foreach ($stores->random(min(15, $stores->count())) as $store) {
            $pairs[] = $this->storeDetailPair($store);
        }

        // === Pattern 6: 比較 ===
        $areaKeys = $grouped->keys();
        if ($areaKeys->count() >= 2) {
            for ($i = 0; $i < min(4, $areaKeys->count() - 1); $i++) {
                $a1 = $areaKeys[$i];
                $a2 = $areaKeys[$i + 1];
                $pairs[] = $this->comparePair($a1, $a2, $grouped->get($a1), $grouped->get($a2));
            }
        }

        // === Pattern 7: 相談系 ===
        $pairs = array_merge($pairs, $this->consultationPairs($stores));

        // === Pattern 8: ナイトワーク外 ===
        $pairs = array_merge($pairs, $this->outOfScopePairs());

        // === Pattern 9: カテゴリ説明 ===
        $pairs = array_merge($pairs, $this->categoryExplanationPairs());

        // === Pattern 10: 駅ベース検索 ===
        $stations = $stores->pluck('nearest_station')->filter()->unique()->take(5);
        foreach ($stations as $station) {
            $stationStores = $stores->filter(fn($s) => $s->nearest_station === $station);
            if ($stationStores->count() >= 1) {
                $pairs[] = $this->stationPair($station, $stationStores->take(3));
            }
        }

        $output = $this->option('output');
        $dir = dirname($output);
        if (!is_dir($dir)) {
            mkdir($dir, 0755, true);
        }

        $fp = fopen($output, 'w');
        foreach ($pairs as $pair) {
            fwrite($fp, json_encode($pair, JSON_UNESCAPED_UNICODE) . "\n");
        }
        fclose($fp);

        $this->info("Generated " . count($pairs) . " training pairs → {$output}");
        return 0;
    }

    // ========================
    // Pair generators
    // ========================

    private function areaPair(string $area, $stores): array
    {
        $questions = [
            "{$area}のお店を教えて",
            "{$area}で働きたいんだけど",
            "{$area}にはどんなお店がある？",
        ];
        $q = $questions[array_rand($questions)];
        $top = $stores->take(3);
        $reply = "{$area}エリアには{$stores->count()}件のお店があります！いくつかご紹介しますね。\n\n";
        foreach ($top as $s) {
            $reply .= $this->storeOneLiner($s) . "\n";
        }
        $reply .= "\n気になるお店があれば詳しくお伝えしますね✨ 条件を絞りたい場合は、カテゴリ（ラウンジ、キャバクラなど）や希望条件を教えてください！";
        return $this->makePair($q, $reply);
    }

    private function areaCategoryPair(string $area, string $cat, $stores): array
    {
        $q = "{$area}の{$cat}を探してる";
        $top = $stores->take(3);
        $reply = "{$area}の{$cat}は{$stores->count()}件ありますよ！\n\n";
        foreach ($top as $s) {
            $reply .= $this->storeOneLiner($s) . "\n";
        }
        $reply .= "\n詳しく知りたいお店があれば聞いてくださいね！";
        return $this->makePair($q, $reply);
    }

    private function conditionPair(string $question, $stores, string $label): array
    {
        $reply = "{$label}のお店をご紹介しますね！\n\n";
        foreach ($stores->take(4) as $s) {
            $reply .= $this->storeOneLiner($s) . "\n";
        }
        $reply .= "\nエリアを絞ったり、他の条件も追加できますので、気軽に聞いてくださいね！";
        return $this->makePair($question, $reply);
    }

    private function areaConditionPair(string $area, string $condition, $stores): array
    {
        $questions = [
            "{$area}で{$condition}OKのお店ある？",
            "{$area}で{$condition}できるところ教えて",
        ];
        $q = $questions[array_rand($questions)];
        $reply = "{$area}で{$condition}OKのお店はこちらです！\n\n";
        foreach ($stores->take(3) as $s) {
            $reply .= $this->storeOneLiner($s) . "\n";
        }
        $reply .= "\n他にも条件があれば教えてくださいね✨";
        return $this->makePair($q, $reply);
    }

    private function salaryPair(string $question, $stores): array
    {
        $reply = "お給料重視ですね！高時給のお店をご紹介します。\n\n";
        foreach ($stores->take(4) as $s) {
            $hourly = number_format($s->hourly_min) . '〜' . number_format($s->hourly_max) . '円';
            $reply .= "【{$s->name}】{$s->area}・{$s->category}\n";
            $reply .= "  時給 {$hourly}";
            if ($s->daily_estimate) {
                $reply .= " ／ 日給目安 {$s->daily_estimate}";
            }
            $reply .= "\n";
            if ($s->back_items && is_array($s->back_items)) {
                $backs = collect($s->back_items)->map(fn($b) => "{$b['label']} {$b['amount']}")->join('、');
                $reply .= "  バック: {$backs}\n";
            }
            $reply .= "\n";
        }
        $reply .= "お給料は経験やスキルによって変動しますので、実際の条件は面接で確認するのがベストです！気になるお店があればLINEでご相談ください✨";
        return $this->makePair($question, $reply);
    }

    private function storeDetailPair(Store $s): array
    {
        $questions = [
            "{$s->name}について詳しく教えて",
            "{$s->name}ってどんなお店？",
        ];
        $q = $questions[array_rand($questions)];

        $hourly = number_format($s->hourly_min) . '〜' . number_format($s->hourly_max) . '円';
        $reply = "【{$s->name}】の詳細をお伝えしますね！\n\n";
        $reply .= "📍 {$s->area}（{$s->nearest_station}） ／ {$s->category}\n";
        $reply .= "💰 時給 {$hourly}";
        if ($s->daily_estimate) {
            $reply .= "（日給目安: {$s->daily_estimate}）";
        }
        $reply .= "\n⏰ {$s->business_hours}（{$s->holidays}休み）\n\n";

        if ($s->description) {
            $reply .= "{$s->description}\n\n";
        }

        if ($s->back_items && is_array($s->back_items)) {
            $backs = collect($s->back_items)->map(fn($b) => "{$b['label']}: {$b['amount']}")->join("\n  ");
            $reply .= "【バック】\n  {$backs}\n\n";
        }

        $tags = is_array($s->feature_tags) ? implode('、', $s->feature_tags) : '';
        if ($tags) {
            $reply .= "【特徴】{$tags}\n\n";
        }

        if ($s->same_day_trial) {
            $reply .= "体験入店OK！ 体入時給: {$s->trial_hourly}\n\n";
        }

        if ($s->guarantee_period) {
            $reply .= "保証: {$s->guarantee_period}\n";
            if ($s->guarantee_details) {
                $reply .= "{$s->guarantee_details}\n\n";
            }
        }

        $reply .= "気になったらLINEで気軽にご相談ください！面接の段取りもサポートしますよ✨";
        return $this->makePair($q, $reply);
    }

    private function comparePair(string $area1, string $area2, $stores1, $stores2): array
    {
        $q = "{$area1}と{$area2}ってどっちがいいかな？";
        $avg1 = $stores1->avg('hourly_min');
        $avg2 = $stores2->avg('hourly_min');
        $reply = "{$area1}と{$area2}、それぞれ特徴がありますよ！\n\n";
        $reply .= "【{$area1}】{$stores1->count()}店舗\n";
        $reply .= "  平均時給: " . number_format((int)$avg1) . "円〜\n";
        $reply .= "  カテゴリ: " . $stores1->pluck('category')->unique()->join('、') . "\n\n";
        $reply .= "【{$area2}】{$stores2->count()}店舗\n";
        $reply .= "  平均時給: " . number_format((int)$avg2) . "円〜\n";
        $reply .= "  カテゴリ: " . $stores2->pluck('category')->unique()->join('、') . "\n\n";

        if ($avg1 > $avg2) {
            $reply .= "時給で見ると{$area1}の方が高め。";
        } else {
            $reply .= "時給で見ると{$area2}の方が高め。";
        }
        $reply .= "でも大事なのは自分に合ったお店を見つけること！通いやすさや雰囲気も大切ですよ。\n\n";
        $reply .= "どちらかのエリアで詳しく見てみますか？✨";
        return $this->makePair($q, $reply);
    }

    private function consultationPairs($stores): array
    {
        $pairs = [];

        // 未経験相談
        $pairs[] = $this->makePair(
            'ナイトワーク初めてで不安なんだけど…',
            "初めてだと不安ですよね、でも大丈夫！未経験からスタートしてる方はとても多いですよ。\n\n" .
            "Rectaに掲載されているお店の多くは「未経験歓迎」で、こんなサポートがあります：\n" .
            "・接客マナーや会話のコツを丁寧に教えてくれる\n" .
            "・ドレスの貸し出しあり（手ぶらで体入OK）\n" .
            "・体入で実際の雰囲気を確かめてから決められる\n\n" .
            "まずは体験入店で雰囲気を見てみるのがおすすめです！エリアの希望があれば、未経験に優しいお店をピックアップしますよ✨"
        );

        // 副業相談
        $pairs[] = $this->makePair(
            '昼職しながらでもできる？',
            "もちろんできますよ！Wワーク・副業OKのお店はたくさんあります。\n\n" .
            "ポイントは：\n" .
            "・「終電上がりOK」のお店なら早い時間に帰れる\n" .
            "・週1〜2日からOKのお店も多い\n" .
            "・シフト自由制なら、本業に合わせて調整しやすい\n\n" .
            "エリアや曜日の希望があれば、ぴったりのお店を探しますね！"
        );

        // 学生相談
        $pairs[] = $this->makePair(
            '大学生でもできますか？',
            "18歳以上（高校生不可）であればOKです！学生さんも多く活躍していますよ。\n\n" .
            "学生さんに人気のポイント：\n" .
            "・終電上がりOKで翌日の授業にも影響なし\n" .
            "・週2〜3日のシフトでも高収入が見込める\n" .
            "・長期休暇にガッツリ稼ぐこともできる\n\n" .
            "テスト期間はお休みできるお店がほとんどなので、勉強との両立も可能です✨ 気になるエリアがあれば教えてくださいね！"
        );

        // 容姿の不安
        $pairs[] = $this->makePair(
            '容姿に自信がないんだけど大丈夫かな？',
            "容姿だけで決まるわけではないので大丈夫ですよ！\n\n" .
            "実際は「明るさ」や「話しやすさ」を重視するお店がとても多いです。ガールズバーやコンカフェは特にその傾向が強いですね。\n\n" .
            "ヘアメイク付きのお店も多いので、プロの力も借りられます。まずは体入で実際の雰囲気を見てみませんか？\n\n" .
            "カテゴリやエリアの希望があれば、合いそうなお店をご紹介しますよ✨"
        );

        // 面接の持ち物
        $pairs[] = $this->makePair(
            '面接に何を持っていけばいい？',
            "面接に必要なものはこちらです：\n\n" .
            "【必須】\n" .
            "・身分証明書（運転免許証 or マイナンバーカード）\n\n" .
            "【あると良い】\n" .
            "・住民票（3ヶ月以内）※採用決定後でOKの場合が多い\n" .
            "・写真付き履歴書（不要なお店も多い）\n\n" .
            "【服装】\n" .
            "・清潔感のある私服でOK（ワンピースやキレイめカジュアル推奨）\n" .
            "・ドレス貸出ありのお店が多いので、体入時の衣装は心配不要です\n\n" .
            "お店によって多少異なるので、気になるお店があれば具体的にお伝えしますね！"
        );

        return $pairs;
    }

    private function outOfScopePairs(): array
    {
        return [
            $this->makePair(
                '明日の天気教えて',
                "ごめんなさい、お天気情報はお答えできないんです🙏\n\n私はナイトワーク専門のアドバイザーなので、お店探しや働き方の相談に特化しています。お仕事探しのことなら何でも聞いてくださいね！"
            ),
            $this->makePair(
                '彼氏と別れたんだけど…',
                "それは辛かったですね…。でもごめんなさい、私はお仕事探しの専門なので、恋愛相談は専門外なんです🙏\n\nもし気分転換に新しいお仕事を探してみたいなら、いつでもお手伝いしますよ！"
            ),
            $this->makePair(
                'おすすめのレストラン教えて',
                "レストラン情報はお答えできないんです、ごめんなさい🙏\n\n私はナイトワーク専門のキャリアアドバイザーです！お店探しや面接のこと、何でも聞いてくださいね✨"
            ),
        ];
    }

    private function categoryExplanationPairs(): array
    {
        return [
            $this->makePair(
                'キャバクラとラウンジの違いって何？',
                "簡単に説明しますね！\n\n" .
                "【キャバクラ】\n" .
                "・指名制で1対1の接客がメイン\n" .
                "・時給+各種バック（指名、ドリンク、同伴）で稼ぐ\n" .
                "・華やかな雰囲気、ドレス着用\n" .
                "・頑張り次第で高収入が狙える\n\n" .
                "【ラウンジ】\n" .
                "・複数のお客様のテーブルを回る接客スタイル\n" .
                "・キャバクラより落ち着いた雰囲気\n" .
                "・ノルマなしのお店が多く、未経験でも始めやすい\n" .
                "・会話メインで、お酒を飲めなくてもOKな場合が多い\n\n" .
                "初めてならラウンジから始める方が多いですよ！どちらか気になる方はあります？✨"
            ),
            $this->makePair(
                'ガールズバーってどんな感じ？',
                "ガールズバーはカウンター越しの接客なので、お客様の隣に座ることがないのが特徴です！\n\n" .
                "【ガールズバーの特徴】\n" .
                "・カウンター越しなので安心感がある\n" .
                "・ドリンクを作ったり、会話を楽しむのがメイン\n" .
                "・私服OKのお店が多い（ドレス不要）\n" .
                "・短時間勤務OKで学生さんにも人気\n" .
                "・時給はキャバクラより低めだけど、気軽に始められる\n\n" .
                "「ナイトワーク初めて」という方にはおすすめです！気になるエリアはありますか？"
            ),
            $this->makePair(
                'コンカフェって何？',
                "コンカフェ（コンセプトカフェ）は、メイド喫茶やアニメ系カフェの進化版です！\n\n" .
                "【コンカフェの特徴】\n" .
                "・テーマに合わせた衣装・世界観で接客\n" .
                "・カウンターやテーブルでの会話がメイン\n" .
                "・お酒を提供するお店もあり（ガールズバー寄り）\n" .
                "・推し活やアニメ好きなお客様が多い\n" .
                "・明るく楽しい雰囲気で、未経験でも始めやすい\n\n" .
                "お酒が苦手でも大丈夫なお店が多いですよ！興味があれば探してみましょうか？✨"
            ),
        ];
    }

    private function stationPair(string $station, $stores): array
    {
        $q = "{$station}の近くで働きたい";
        $reply = "{$station}周辺のお店をご紹介しますね！\n\n";
        foreach ($stores->take(3) as $s) {
            $reply .= $this->storeOneLiner($s) . "\n";
        }
        $reply .= "\n他にも条件があれば教えてくださいね✨";
        return $this->makePair($q, $reply);
    }

    // ========================
    // Helpers
    // ========================

    private function storeOneLiner(Store $s): string
    {
        $hourly = number_format($s->hourly_min) . '〜' . number_format($s->hourly_max) . '円';
        $line = "【{$s->name}】{$s->category} ／ 時給{$hourly}";
        $tags = [];
        if ($s->same_day_trial) $tags[] = '体入OK';
        if ($this->hasTag($s, '未経験')) $tags[] = '未経験歓迎';
        if ($this->hasTag($s, 'ノルマなし')) $tags[] = 'ノルマなし';
        if ($this->hasTag($s, '終電')) $tags[] = '終電OK';
        if ($this->hasTag($s, '日払')) $tags[] = '日払いあり';
        if (!empty($tags)) {
            $line .= '（' . implode('・', array_slice($tags, 0, 3)) . '）';
        }
        return $line;
    }

    private function hasTag(Store $s, string $keyword): bool
    {
        $tags = is_array($s->feature_tags) ? implode(' ', $s->feature_tags) : '';
        $text = $s->features_text ?? '';
        return str_contains($tags . $text, $keyword);
    }

    private function makePair(string $user, string $model): array
    {
        return [
            'contents' => [
                ['role' => 'user', 'parts' => [['text' => $user]]],
                ['role' => 'model', 'parts' => [['text' => $model]]],
            ],
        ];
    }
}

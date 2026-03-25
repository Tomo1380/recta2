<?php

namespace Database\Seeders;

use App\Models\Store;
use Illuminate\Database\Seeder;

class StoreSeeder extends Seeder
{
    // -----------------------------------------------------------------------
    // Data pools
    // -----------------------------------------------------------------------

    private const AREAS = [
        ['name' => '新宿',     'weight' => 20, 'stations' => ['新宿駅', '新宿三丁目駅', '西武新宿駅'], 'tier' => 'high', 'address_prefix' => '東京都新宿区歌舞伎町'],
        ['name' => '六本木',   'weight' => 16, 'stations' => ['六本木駅', '乃木坂駅', '六本木一丁目駅'], 'tier' => 'high', 'address_prefix' => '東京都港区六本木'],
        ['name' => '銀座',     'weight' => 12, 'stations' => ['銀座駅', '新橋駅', '東銀座駅'], 'tier' => 'high', 'address_prefix' => '東京都中央区銀座'],
        ['name' => '渋谷',     'weight' => 10, 'stations' => ['渋谷駅', '神泉駅'], 'tier' => 'mid', 'address_prefix' => '東京都渋谷区道玄坂'],
        ['name' => '池袋',     'weight' => 8,  'stations' => ['池袋駅', '東池袋駅'], 'tier' => 'mid', 'address_prefix' => '東京都豊島区東池袋'],
        ['name' => '恵比寿',   'weight' => 6,  'stations' => ['恵比寿駅', '代官山駅'], 'tier' => 'mid', 'address_prefix' => '東京都渋谷区恵比寿南'],
        ['name' => '麻布十番', 'weight' => 4,  'stations' => ['麻布十番駅'], 'tier' => 'high', 'address_prefix' => '東京都港区麻布十番'],
        ['name' => '表参道',   'weight' => 4,  'stations' => ['表参道駅', '明治神宮前駅'], 'tier' => 'mid', 'address_prefix' => '東京都渋谷区神宮前'],
    ];

    private const CATEGORIES = [
        [
            'name' => 'キャバクラ',
            'weight' => 24,
            'hourly' => ['min_range' => [3000, 6000], 'max_range' => [6000, 12000]],
            'hours_start' => ['20:00', '19:30', '20:30'],
            'hours_end' => ['LAST', '1:00', '0:30'],
            'holidays' => ['日曜日', '日曜・祝日', '不定休'],
        ],
        [
            'name' => 'ラウンジ',
            'weight' => 20,
            'hourly' => ['min_range' => [3500, 7000], 'max_range' => [7000, 15000]],
            'hours_start' => ['19:00', '19:30', '18:30'],
            'hours_end' => ['1:00', '0:00', '0:30'],
            'holidays' => ['日曜・祝日', '日曜日', '日曜・月曜'],
        ],
        [
            'name' => 'ガールズバー',
            'weight' => 16,
            'hourly' => ['min_range' => [1800, 3000], 'max_range' => [3000, 5000]],
            'hours_start' => ['17:00', '18:00', '19:00'],
            'hours_end' => ['5:00', '3:00', '2:00', '0:00'],
            'holidays' => ['不定休', '月曜日', '火曜日'],
        ],
        [
            'name' => 'コンカフェ',
            'weight' => 12,
            'hourly' => ['min_range' => [1500, 2500], 'max_range' => [2500, 4000]],
            'hours_start' => ['11:00', '12:00', '14:00'],
            'hours_end' => ['22:00', '23:00', '21:00'],
            'holidays' => ['不定休', '火曜日', '水曜日'],
        ],
        [
            'name' => 'クラブ',
            'weight' => 8,
            'hourly' => ['min_range' => [2500, 5000], 'max_range' => [5000, 8000]],
            'hours_start' => ['21:00', '22:00'],
            'hours_end' => ['5:00', '4:00'],
            'holidays' => ['月曜・火曜', '月曜日', '不定休'],
        ],
    ];

    // Tags with approximate usage frequency (out of 80 stores)
    private const TAGS_POOL = [
        ['tag' => '未経験歓迎', 'freq' => 0.55],
        ['tag' => '日払いあり', 'freq' => 0.45],
        ['tag' => '送りあり', 'freq' => 0.50],
        ['tag' => '終電上がりOK', 'freq' => 0.40],
        ['tag' => 'ノルマなし', 'freq' => 0.35],
        ['tag' => '体入全額日払い', 'freq' => 0.30],
        ['tag' => '髪色自由', 'freq' => 0.30],
        ['tag' => 'ネイルOK', 'freq' => 0.25],
        ['tag' => 'ピアスOK', 'freq' => 0.20],
        ['tag' => '経験者優遇', 'freq' => 0.25],
        ['tag' => '高時給', 'freq' => 0.20],
        ['tag' => 'Wワーク歓迎', 'freq' => 0.30],
        ['tag' => '学生歓迎', 'freq' => 0.25],
        ['tag' => '週1OK', 'freq' => 0.20],
        ['tag' => '短期OK', 'freq' => 0.15],
        ['tag' => '寮完備', 'freq' => 0.08],
        ['tag' => '託児所あり', 'freq' => 0.05],
        ['tag' => 'ボトルバック高め', 'freq' => 0.12],
        ['tag' => '大型店', 'freq' => 0.10],
        ['tag' => '少人数制', 'freq' => 0.15],
        ['tag' => '落ち着いた雰囲気', 'freq' => 0.18],
        ['tag' => '制服あり', 'freq' => 0.20],
        ['tag' => 'ドレス無料', 'freq' => 0.15],
        ['tag' => '外国人客多め', 'freq' => 0.08],
        ['tag' => 'カウンター越し', 'freq' => 0.12],
        ['tag' => '全額日払い', 'freq' => 0.25],
        ['tag' => '衣装貸出', 'freq' => 0.18],
        ['tag' => 'アットホーム', 'freq' => 0.22],
        ['tag' => '完全自由シフト', 'freq' => 0.20],
        ['tag' => '交通費支給', 'freq' => 0.30],
    ];

    private const NAME_PREFIXES = [
        'キャバクラ' => ['Club', 'Club', 'Night', 'CLUB', 'Cabaret'],
        'ラウンジ' => ['Lounge', 'Lounge', 'Night Lounge', 'LOUNGE', 'Salon'],
        'ガールズバー' => ["Girl's Bar", 'Girls Bar', 'BAR', 'Bar', 'GIRLS BAR'],
        'コンカフェ' => ['Cafe', 'Cafe&Bar', 'メイドカフェ', 'Concept Cafe', 'カフェ'],
        'クラブ' => ['Night Club', 'CLUB', 'Club', 'Night'],
    ];

    private const NAME_SUFFIXES = [
        // French / Italian
        'Lumière', 'Étoile', 'Rêve', 'Amour', 'Bijou', 'Fleur', 'Ciel', 'Rosé',
        'Dolce', 'Bella', 'Stella', 'Luna', 'Noire', 'Blanche', 'Perle', 'Ruban',
        'Vogue', 'Chérie', 'Plaisir', 'Grâce', 'Joie', 'Charme', 'Luxe', 'Soirée',
        // English
        'Platinum', 'Diamond', 'Crystal', 'Emerald', 'Royal', 'Crown', 'Grace',
        'Elegance', 'Velvet', 'Bloom', 'Radiance', 'Aura', 'Bliss', 'Eden',
        'Prestige', 'Imperial', 'Noble', 'Jewel', 'Orchid', 'Phoenix',
        'Infinity', 'Premier', 'Luxuria', 'Grandeur', 'Sapphire',
        // Japanese
        '華', '蓮', '月', '雪', '星', '凛', '雅', '紫', '桜', '翠',
        '鈴蘭', '紬', '葵', '椿', '彩', '和', '京', '楓', '朱', '瑠璃',
        // Cute / Pop (ガールズバー / コンカフェ向け)
        'CHERRY', 'HONEY', 'SWEET', 'CANDY', 'PEACH', 'LEMON', 'MINT',
        'BERRY', 'SUGAR', 'MILK', 'RIBBON', 'BUNNY', 'ANGEL', 'COCOA', 'MELTY',
    ];

    private const ADJECTIVES = [
        '老舗', '人気', '高級', 'アットホームな', '新規オープンの', '話題の',
        '隠れ家的', '大型', '会員制', '完全個室の', '少人数制の', '落ち着いた',
    ];

    private const APPEALS = [
        '未経験者も安心のサポート体制が自慢です',
        '経験者には高待遇をお約束します',
        '自分らしく働ける自由な環境が魅力です',
        'スタッフ全員でサポートするアットホームな雰囲気です',
        '安定した客層で安心して働けます',
        '充実の研修制度で初日から安心です',
        '働きやすさを重視した環境づくりを心がけています',
        '実力に応じた高収入が期待できます',
        'お客様の質が高く、ストレスなく働けます',
        '終電上がりOKで学校や本業との両立もバッチリです',
    ];

    private const BACK_OPTIONS = [
        ['label' => '指名バック', 'amounts' => ['1,000円', '1,500円', '2,000円', '2,500円', '3,000円']],
        ['label' => 'ドリンクバック', 'amounts' => ['300円', '500円', '700円', '1,000円']],
        ['label' => 'ボトルバック', 'amounts' => ['5%', '8%', '10%', '15%', '20%']],
        ['label' => '同伴バック', 'amounts' => ['2,000円', '3,000円', '4,000円', '5,000円']],
        ['label' => 'フードバック', 'amounts' => ['200円', '300円', '500円']],
    ];

    private const FEE_OPTIONS = [
        ['label' => '雑費', 'amounts' => ['500円/日', '1,000円/日', '1,500円/日']],
        ['label' => 'ヘアメイク', 'amounts' => ['500円', '1,000円', '無料']],
        ['label' => '衣装代', 'amounts' => ['無料', '500円/日']],
    ];

    private const STAFF_NAMES = [
        '佐藤', '鈴木', '田中', '高橋', '渡辺', '伊藤', '山本', '中村',
        '小林', '加藤', '吉田', '山田', '松本', '井上', '木村', '林',
    ];

    private const STAFF_ROLES = ['店長', 'マネージャー', 'オーナー', 'チーフ', '副店長', 'フロアマネージャー'];

    private const STAFF_COMMENTS = [
        'うちはとにかくアットホームが自慢。スタッフ全員で新人さんをサポートします！',
        '稼ぎたい子も、ゆるく働きたい子も、それぞれに合った働き方ができるお店です。',
        'お客様の質が高いので、安心して働ける環境です。未経験の方もぜひ！',
        '無理なく自分のペースで働けるのが当店の魅力です。まずは見学だけでもOK！',
        '少人数だからこそ、一人ひとりに向き合えるお店です。困ったことはすぐ相談してください。',
        'スタッフ同士の仲が良く、毎日楽しく働いています。一緒に盛り上げましょう！',
        '経験者の方には実力に見合った待遇をお約束します。まずはお話だけでも！',
        '当店はノルマなし・終電OK。プライベートとの両立を大切にしています。',
    ];

    private const SUPPORT_OPTIONS = [
        '面接同行', 'ドレス選びサポート', '接客マナー研修', 'メンタルケア',
        '終電後タクシー送り', 'ヘアメイク無料', '寮紹介', 'ネイルサロン割引',
        '語学研修', '税金相談', '美容サポート', 'シフト柔軟対応',
    ];

    private const QA_POOL = [
        ['q' => 'お酒が飲めなくても大丈夫ですか？', 'a' => 'はい、大丈夫です。ソフトドリンクやノンアルコールカクテルをご用意しています。'],
        ['q' => '送りはどこまで出ますか？', 'a' => '都内近郊であれば無料で送迎いたします。詳しくはお問い合わせください。'],
        ['q' => '掛け持ちはOKですか？', 'a' => 'はい、Wワーク歓迎です。他店との掛け持ちも問題ありません。'],
        ['q' => '容姿に自信がないのですが…', 'a' => '容姿だけでなく、人柄やコミュニケーション力も重視しています。まずはお気軽にご応募ください。'],
        ['q' => '週何日から働けますか？', 'a' => '週1日からOKです。ご自身の都合に合わせてシフトを組めます。'],
        ['q' => '体入の日にそのまま入店できますか？', 'a' => 'はい、体入後にそのまま入店を決めていただくことも可能です。'],
        ['q' => '友達と一緒に働けますか？', 'a' => 'もちろんです！友達同士のご応募も大歓迎です。'],
        ['q' => 'ドレスは自分で用意する必要がありますか？', 'a' => 'お店にドレスの貸出がありますので、手ぶらでOKです。'],
        ['q' => '客層はどんな感じですか？', 'a' => '会社員や経営者の方が中心で、落ち着いた客層です。'],
        ['q' => '罰金やペナルティはありますか？', 'a' => '当店は罰金・ペナルティ一切なしです。安心してお越しください。'],
    ];

    // Free-to-use Pexels bar/lounge ambient videos (short, HD)
    private const SAMPLE_VIDEOS = [
        'https://videos.pexels.com/video-files/3571264/3571264-uhd_2560_1440_30fps.mp4',
        'https://videos.pexels.com/video-files/3121459/3121459-uhd_2560_1440_24fps.mp4',
        'https://videos.pexels.com/video-files/2795173/2795173-uhd_2560_1440_25fps.mp4',
        'https://videos.pexels.com/video-files/4691586/4691586-uhd_2560_1440_25fps.mp4',
        'https://videos.pexels.com/video-files/3773486/3773486-uhd_2560_1440_30fps.mp4',
    ];

    private array $usedNames = [];

    // -----------------------------------------------------------------------
    // Main
    // -----------------------------------------------------------------------

    public function run(): void
    {
        // Fixed seed for deterministic output (Fine-tuning data must match seeded stores)
        mt_srand(12345);

        // Keep anchor stores (first 5) + generate 75 more
        $anchors = $this->getAnchorStores();
        $generated = [];

        for ($i = 0; $i < 75; $i++) {
            $generated[] = $this->generateStore($i);
        }

        // 5 draft / unpublished among the generated
        $generated[70]['publish_status'] = 'draft';
        $generated[71]['publish_status'] = 'draft';
        $generated[72]['publish_status'] = 'draft';
        $generated[73]['publish_status'] = 'unpublished';
        $generated[74]['publish_status'] = 'unpublished';

        foreach (array_merge($anchors, $generated) as $store) {
            Store::create($store);
        }
    }

    // -----------------------------------------------------------------------
    // Generator
    // -----------------------------------------------------------------------

    private function generateStore(int $index): array
    {
        $area = $this->weightedPick(self::AREAS);
        $category = $this->weightedPick(self::CATEGORIES);
        $name = $this->generateUniqueName($category['name']);

        // Wage: adjust by area tier
        $tierBonus = match ($area['tier']) {
            'high' => rand(500, 1500),
            default => 0,
        };
        $hourlyMin = $this->randInRange($category['hourly']['min_range']) + $tierBonus;
        $hourlyMax = $this->randInRange($category['hourly']['max_range']) + $tierBonus;
        // Round to nearest 500
        $hourlyMin = (int)(round($hourlyMin / 500) * 500);
        $hourlyMax = (int)(round($hourlyMax / 500) * 500);
        if ($hourlyMax <= $hourlyMin) {
            $hourlyMax = $hourlyMin + 2000;
        }

        $station = $area['stations'][array_rand($area['stations'])];
        $hoursStart = $category['hours_start'][array_rand($category['hours_start'])];
        $hoursEnd = $category['hours_end'][array_rand($category['hours_end'])];
        $holidays = $category['holidays'][array_rand($category['holidays'])];

        // Tags: pick 3-7, weighted
        $tags = $this->pickTags($category['name']);

        // Description
        $adj = self::ADJECTIVES[array_rand(self::ADJECTIVES)];
        $appeal = self::APPEALS[array_rand(self::APPEALS)];
        $description = "{$area['name']}の{$adj}{$category['name']}。{$appeal}";

        $store = [
            'name' => $name,
            'area' => $area['name'],
            'address' => $area['address_prefix'] . rand(1, 9) . '-' . rand(1, 30) . '-' . rand(1, 15),
            'nearest_station' => $station,
            'category' => $category['name'],
            'business_hours' => "{$hoursStart}〜{$hoursEnd}",
            'holidays' => $holidays,
            'phone' => '03-' . rand(1000, 9999) . '-' . rand(1000, 9999),
            'hourly_min' => $hourlyMin,
            'hourly_max' => $hourlyMax,
            'daily_estimate' => number_format($hourlyMin * 5) . '円〜' . number_format($hourlyMax * 6) . '円',
            'feature_tags' => $tags,
            'description' => $description,
            'features_text' => "{$station}徒歩" . rand(1, 8) . "分。{$appeal}",
            'publish_status' => 'published',
        ];

        // Optional fields (70% chance each)
        if ($this->chance(0.7)) {
            $store['back_items'] = $this->randomBackItems();
        }
        if ($this->chance(0.6)) {
            $store['fee_items'] = $this->randomFeeItems();
        }
        if ($this->chance(0.6)) {
            $store['salary_notes'] = $this->randomSalaryNotes();
        }
        if ($this->chance(0.5)) {
            $store['guarantee_period'] = ['1ヶ月', '2ヶ月', '最大3ヶ月'][array_rand(['1ヶ月', '2ヶ月', '最大3ヶ月'])];
            $store['guarantee_details'] = "未経験者は時給" . number_format($hourlyMin + 1000) . "円保証。";
        }
        if ($this->chance(0.5)) {
            $store['norma_info'] = ['ノルマなし', 'ノルマなし。ただし月8日以上の出勤推奨。', '月間売上目標あり（未達でもペナルティなし）'][array_rand(['ノルマなし', 'ノルマなし。ただし月8日以上の出勤推奨。', '月間売上目標あり（未達でもペナルティなし）'])];
        }
        if ($this->chance(0.7)) {
            $store['trial_avg_hourly'] = number_format($hourlyMin + 500) . '円';
            $store['trial_hourly'] = number_format($hourlyMin) . '円';
            $store['interview_hours'] = ['13:00〜18:00', '14:00〜19:00', '15:00〜20:00', '12:00〜17:00'][array_rand(['13:00〜18:00', '14:00〜19:00', '15:00〜20:00', '12:00〜17:00'])];
            $store['same_day_trial'] = $this->chance(0.4);
        }
        if ($this->chance(0.4)) {
            $store['analysis'] = $this->randomAnalysis($category['name']);
        }
        if ($this->chance(0.35)) {
            $store['qa'] = $this->randomQa();
        }
        if ($this->chance(0.3)) {
            $store['staff_comment'] = $this->randomStaffComment();
        }
        // Video URL — 60% of stores have a promo video
        if ($this->chance(0.6)) {
            $store['video_url'] = self::SAMPLE_VIDEOS[array_rand(self::SAMPLE_VIDEOS)];
        }
        if ($this->chance(0.25)) {
            $store['schedule'] = [
                'hours' => $store['business_hours'],
                'holidays' => $store['holidays'],
                'shift_info' => '週' . rand(1, 3) . '日〜OK。シフト自由制。',
            ];
        }
        if ($this->chance(0.2)) {
            $store['recent_hires'] = [
                [
                    'month' => '2026年2月',
                    'count' => rand(3, 15),
                    'examples' => [rand(18, 28) . '歳 未経験 → 時給' . number_format($hourlyMin) . '円スタート'],
                ],
            ];
            $store['recent_hires_summary'] = '直近1ヶ月で' . $store['recent_hires'][0]['count'] . '名採用';
        }

        return $store;
    }

    private function generateUniqueName(string $category): string
    {
        $prefixes = self::NAME_PREFIXES[$category] ?? ['Club'];
        $maxAttempts = 100;

        for ($i = 0; $i < $maxAttempts; $i++) {
            $prefix = $prefixes[array_rand($prefixes)];
            $suffix = self::NAME_SUFFIXES[array_rand(self::NAME_SUFFIXES)];
            $name = "{$prefix} {$suffix}";

            if (!in_array($name, $this->usedNames)) {
                $this->usedNames[] = $name;
                return $name;
            }
        }

        // Fallback: add number
        $name = $prefixes[0] . ' ' . self::NAME_SUFFIXES[array_rand(self::NAME_SUFFIXES)] . ' ' . count($this->usedNames);
        $this->usedNames[] = $name;
        return $name;
    }

    private function pickTags(string $category): array
    {
        $tags = [];
        $count = rand(3, 7);

        // Category-specific guaranteed tags
        if ($category === 'ガールズバー') {
            $tags[] = 'カウンター越し';
        }
        if ($category === 'コンカフェ') {
            $tags[] = '衣装貸出';
        }

        foreach (self::TAGS_POOL as $item) {
            if (count($tags) >= $count) break;
            if (in_array($item['tag'], $tags)) continue;
            if ($this->chance($item['freq'])) {
                $tags[] = $item['tag'];
            }
        }

        // Ensure at least 3 tags
        while (count($tags) < 3) {
            $item = self::TAGS_POOL[array_rand(self::TAGS_POOL)];
            if (!in_array($item['tag'], $tags)) {
                $tags[] = $item['tag'];
            }
        }

        return $tags;
    }

    private function randomBackItems(): array
    {
        $count = rand(2, 4);
        $items = [];
        $used = [];

        for ($i = 0; $i < $count; $i++) {
            $option = self::BACK_OPTIONS[array_rand(self::BACK_OPTIONS)];
            if (in_array($option['label'], $used)) continue;
            $used[] = $option['label'];
            $items[] = [
                'label' => $option['label'],
                'amount' => $option['amounts'][array_rand($option['amounts'])],
            ];
        }

        return $items;
    }

    private function randomFeeItems(): array
    {
        $items = [];
        $count = rand(1, 2);

        for ($i = 0; $i < $count; $i++) {
            $option = self::FEE_OPTIONS[$i % count(self::FEE_OPTIONS)];
            $items[] = [
                'label' => $option['label'],
                'amount' => $option['amounts'][array_rand($option['amounts'])],
            ];
        }

        return $items;
    }

    private function randomSalaryNotes(): string
    {
        $notes = [
            '体験入店時も全額日払いOK。指名本数に応じて時給UP制度あり。',
            '全額日払い。交通費支給（上限1,000円）。',
            '経験者優遇。売上に応じたインセンティブ制度あり。',
            '日払い・週払い選択可。昇給制度あり。',
            '体入日も全額支給。入店祝い金あり（規定あり）。',
            '完全日払い制。頑張り次第で時給UP。',
            '月末締め翌月払い。日払いも相談可。',
        ];

        return $notes[array_rand($notes)];
    }

    private function randomAnalysis(string $category): array
    {
        $expLevel = match ($category) {
            'ラウンジ' => rand(50, 80),
            'キャバクラ' => rand(25, 55),
            'クラブ' => rand(30, 60),
            'ガールズバー' => rand(10, 30),
            'コンカフェ' => rand(5, 25),
            default => rand(20, 50),
        };

        return [
            'experience_level' => $expLevel,
            'atmosphere' => rand(20, 80),
            'cast_style' => [
                'beauty' => rand(10, 50),
                'cute' => rand(10, 50),
                'glamour' => rand(5, 25),
                'natural' => rand(10, 40),
            ],
            'experience_ratio' => $expLevel + rand(-10, 10),
            'customer_age' => [
                ['label' => '20代', 'ratio' => $r1 = rand(5, 40)],
                ['label' => '30代', 'ratio' => $r2 = rand(15, 40)],
                ['label' => '40代', 'ratio' => $r3 = rand(15, 35)],
                ['label' => '50代〜', 'ratio' => max(5, 100 - $r1 - $r2 - $r3)],
            ],
            'drinking_style' => rand(20, 75),
        ];
    }

    private function randomQa(): array
    {
        $count = rand(2, 4);
        $indices = array_rand(self::QA_POOL, min($count, count(self::QA_POOL)));
        if (!is_array($indices)) $indices = [$indices];

        return array_map(fn($i) => [
            'question' => self::QA_POOL[$i]['q'],
            'answer' => self::QA_POOL[$i]['a'],
        ], $indices);
    }

    private function randomStaffComment(): array
    {
        return [
            'name' => self::STAFF_NAMES[array_rand(self::STAFF_NAMES)],
            'role' => self::STAFF_ROLES[array_rand(self::STAFF_ROLES)],
            'comment' => self::STAFF_COMMENTS[array_rand(self::STAFF_COMMENTS)],
            'supports' => array_values(array_intersect_key(
                self::SUPPORT_OPTIONS,
                array_flip((array)array_rand(self::SUPPORT_OPTIONS, rand(2, 4)))
            )),
        ];
    }

    // -----------------------------------------------------------------------
    // Anchor stores (existing hand-crafted stores)
    // -----------------------------------------------------------------------

    private function getAnchorStores(): array
    {
        $this->usedNames = ['Club Lumière', 'Lounge SEIREN', 'Girls Bar Honey', 'Club GRANDEUR', 'Lounge Crescent'];

        return [
            [
                'name' => 'Club Lumière',
                'area' => '六本木',
                'address' => '東京都港区六本木3-15-20',
                'nearest_station' => '六本木駅',
                'category' => 'キャバクラ',
                'business_hours' => '20:00〜LAST',
                'holidays' => '日曜日',
                'phone' => '03-1234-5678',
                'hourly_min' => 4000,
                'hourly_max' => 8000,
                'daily_estimate' => '30,000円〜60,000円',
                'back_items' => [
                    ['label' => '指名バック', 'amount' => '1,500円'],
                    ['label' => 'ドリンクバック', 'amount' => '500円'],
                    ['label' => '同伴バック', 'amount' => '3,000円'],
                ],
                'fee_items' => [
                    ['label' => '雑費', 'amount' => '1,000円/日'],
                    ['label' => 'ヘアメイク', 'amount' => '500円（任意）'],
                ],
                'salary_notes' => '体験入店時も全額日払いOK。指名本数に応じて時給UP制度あり。',
                'guarantee_period' => '最大3ヶ月',
                'guarantee_details' => '未経験者は時給5,000円保証。3ヶ月目以降は実績ベースに移行。',
                'norma_info' => 'ノルマなし。ただし月8日以上の出勤推奨。',
                'trial_avg_hourly' => '5,000円',
                'trial_hourly' => '4,500円',
                'interview_hours' => '14:00〜19:00',
                'same_day_trial' => true,
                'feature_tags' => ['未経験歓迎', '終電上がりOK', '日払いあり', 'ノルマなし', '送りあり', '体入全額日払い'],
                'description' => '六本木の老舗キャバクラ。アットホームな雰囲気で未経験者も安心して働けます。スタッフのサポート体制が充実しており、接客マナーから会話術まで丁寧に指導します。',
                'features_text' => '六本木駅徒歩3分の好立地。20代〜30代の落ち着いた客層が中心。終電上がりOKで学生さんやWワークの方にも人気のお店です。',
                'video_url' => 'https://videos.pexels.com/video-files/3571264/3571264-uhd_2560_1440_30fps.mp4',
                'website_url' => 'https://example.com/club-lumiere',
                'images' => [
                    ['url' => 'https://images.unsplash.com/photo-1566417713940-fe7c737a9ef2?w=800&q=80', 'order' => 1],
                    ['url' => 'https://images.unsplash.com/photo-1572116469696-31de0f17cc34?w=800&q=80', 'order' => 2],
                    ['url' => 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&q=80', 'order' => 3],
                    ['url' => 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&q=80', 'order' => 4],
                ],
                'analysis' => [
                    'experience_level' => 35, 'atmosphere' => 40,
                    'cast_style' => ['beauty' => 30, 'cute' => 40, 'glamour' => 10, 'natural' => 20],
                    'experience_ratio' => 45,
                    'customer_age' => [['label' => '20代', 'ratio' => 15], ['label' => '30代', 'ratio' => 35], ['label' => '40代', 'ratio' => 35], ['label' => '50代〜', 'ratio' => 15]],
                    'drinking_style' => 55,
                ],
                'interview_info' => [
                    'dress_advice' => '清潔感のある私服でOK。ワンピースやキレイめカジュアルがおすすめ。',
                    'tips' => ['笑顔を意識してください', 'お酒が飲めなくても大丈夫です', '希望の勤務日数を伝えてください'],
                    'dress_code' => 'ドレス貸出あり（無料）。自前ドレスも可。',
                    'criteria' => '18歳以上（高校生不可）。明るくコミュニケーションが取れる方。',
                    'dialog' => [
                        ['speaker' => 'staff', 'text' => 'はじめまして！今日はお越しいただきありがとうございます。まず、ナイトワークは初めてですか？'],
                        ['speaker' => 'user', 'text' => 'はい、全くの未経験です。少し不安で…'],
                        ['speaker' => 'staff', 'text' => '大丈夫ですよ！うちは未経験からスタートした子がほとんどです。最初は先輩がマンツーマンでサポートしますので安心してくださいね。'],
                    ],
                ],
                'required_documents' => [
                    'documents' => ['身分証明書（運転免許証 or マイナンバーカード）', '住民票（3ヶ月以内）'],
                    'notes' => '身分証は面接時に確認します。住民票は採用決定後でOKです。',
                ],
                'schedule' => [
                    'hours' => '20:00〜LAST（1:00頃）', 'holidays' => '日曜定休',
                    'shift_info' => '週2日〜OK。シフト自由制。前日までに連絡いただければ変更可能です。',
                ],
                'recent_hires' => [
                    ['month' => '2026年1月', 'count' => 8, 'examples' => ['22歳 未経験 → 時給5,000円スタート', '25歳 経験1年 → 時給6,500円スタート']],
                    ['month' => '2026年2月', 'count' => 12, 'examples' => ['20歳 大学生 → 時給4,500円スタート', '28歳 経験3年 → 時給7,000円スタート']],
                ],
                'recent_hires_summary' => '直近2ヶ月で20名採用',
                'popular_features' => ['features' => ['未経験歓迎', 'ノルマなし', '終電上がり'], 'hint' => '六本木エリアではノルマなしのお店が人気です'],
                'after_spots' => [
                    ['name' => '鳥貴族 六本木店', 'genre' => '居酒屋', 'distance' => '徒歩2分'],
                    ['name' => 'すき家 六本木店', 'genre' => '牛丼', 'distance' => '徒歩3分'],
                ],
                'companion_spots' => [
                    ['name' => 'リストランテ アマルフィ', 'genre' => 'イタリアン', 'distance' => '徒歩5分'],
                    ['name' => '鮨 さいとう', 'genre' => '寿司', 'distance' => '徒歩8分'],
                ],
                'qa' => [
                    ['question' => 'お酒が飲めなくても大丈夫ですか？', 'answer' => 'はい、大丈夫です。ソフトドリンクやノンアルコールカクテルをご用意しています。'],
                    ['question' => '送りはどこまで出ますか？', 'answer' => '都内近郊であれば無料で送迎いたします。詳しくはお問い合わせください。'],
                    ['question' => '掛け持ちはOKですか？', 'answer' => 'はい、Wワーク歓迎です。他店との掛け持ちも問題ありません。'],
                ],
                'staff_comment' => [
                    'name' => '佐藤', 'role' => '店長',
                    'comment' => 'うちはとにかくアットホームが自慢。スタッフ全員で新人さんをサポートします！不安なことがあれば何でも聞いてくださいね。',
                    'supports' => ['面接同行', 'ドレス選びサポート', '接客マナー研修', 'メンタルケア'],
                ],
                'publish_status' => 'published',
            ],
            [
                'name' => 'Lounge SEIREN',
                'area' => '銀座',
                'address' => '東京都中央区銀座7-8-10',
                'nearest_station' => '銀座駅',
                'category' => 'ラウンジ',
                'business_hours' => '19:00〜1:00',
                'holidays' => '日曜・祝日',
                'phone' => '03-9876-5432',
                'hourly_min' => 5000,
                'hourly_max' => 12000,
                'daily_estimate' => '40,000円〜80,000円',
                'back_items' => [
                    ['label' => '指名バック', 'amount' => '2,000円'],
                    ['label' => 'ボトルバック', 'amount' => '10%'],
                    ['label' => '同伴バック', 'amount' => '5,000円'],
                ],
                'fee_items' => [['label' => '雑費', 'amount' => '1,500円/日']],
                'salary_notes' => '経験者優遇。売上に応じたインセンティブ制度あり。',
                'guarantee_period' => '1ヶ月',
                'guarantee_details' => '経験者は面談にて応相談。',
                'norma_info' => '月間売上目標あり（未達でもペナルティなし）',
                'trial_avg_hourly' => '6,000円',
                'trial_hourly' => '5,500円',
                'interview_hours' => '13:00〜18:00',
                'same_day_trial' => false,
                'feature_tags' => ['経験者優遇', '高時給', '落ち着いた雰囲気', 'ボトルバック高め'],
                'description' => '銀座の高級ラウンジ。落ち着いた大人の空間で、品のある接客を心がけています。経営者や医師など、ハイクラスなお客様が中心です。',
                'features_text' => '銀座駅徒歩2分。完全会員制ラウンジ。20席のアットホームな空間で、お客様一人ひとりとじっくり向き合える環境です。',
                'analysis' => [
                    'experience_level' => 70, 'atmosphere' => 25,
                    'cast_style' => ['beauty' => 50, 'cute' => 15, 'glamour' => 5, 'natural' => 30],
                    'experience_ratio' => 75,
                    'customer_age' => [['label' => '30代', 'ratio' => 20], ['label' => '40代', 'ratio' => 40], ['label' => '50代〜', 'ratio' => 40]],
                    'drinking_style' => 35,
                ],
                'qa' => [
                    ['question' => '未経験でも応募できますか？', 'answer' => '応募は可能ですが、ある程度の接客経験がある方を優先しています。'],
                    ['question' => '客層はどんな感じですか？', 'answer' => '経営者、医師、弁護士など30代〜50代のお客様が中心です。'],
                ],
                'staff_comment' => [
                    'name' => '山田', 'role' => 'マネージャー',
                    'comment' => '銀座で10年以上続く信頼のあるお店です。品のある接客を学びたい方にぴったりの環境です。',
                    'supports' => ['接客研修', 'ドレスレンタル', 'タクシー送り'],
                ],
                'publish_status' => 'published',
            ],
            [
                'name' => 'Girls Bar Honey',
                'area' => '渋谷',
                'address' => '東京都渋谷区道玄坂2-10-5',
                'nearest_station' => '渋谷駅',
                'category' => 'ガールズバー',
                'business_hours' => '18:00〜5:00',
                'holidays' => '不定休',
                'phone' => '03-5555-1234',
                'hourly_min' => 2500,
                'hourly_max' => 4000,
                'daily_estimate' => '15,000円〜25,000円',
                'back_items' => [
                    ['label' => 'ドリンクバック', 'amount' => '300円'],
                    ['label' => 'フードバック', 'amount' => '200円'],
                ],
                'fee_items' => [],
                'salary_notes' => '全額日払い。交通費支給（上限1,000円）。',
                'trial_avg_hourly' => '3,000円',
                'trial_hourly' => '2,800円',
                'interview_hours' => '15:00〜20:00',
                'same_day_trial' => true,
                'feature_tags' => ['未経験歓迎', '髪色自由', 'ネイルOK', 'ピアスOK', 'カウンター越し', '全額日払い'],
                'description' => '渋谷の人気ガールズバー。カウンター越しの接客なので初めてでも安心！20代のスタッフが活躍中。友達同士の応募も大歓迎！',
                'features_text' => '渋谷駅徒歩5分。服装・髪色自由でありのままの自分で働けます。Wワーク・学生さん大歓迎。',
                'analysis' => [
                    'experience_level' => 15, 'atmosphere' => 80,
                    'cast_style' => ['beauty' => 10, 'cute' => 50, 'glamour' => 5, 'natural' => 35],
                    'experience_ratio' => 20,
                    'customer_age' => [['label' => '20代', 'ratio' => 45], ['label' => '30代', 'ratio' => 35], ['label' => '40代', 'ratio' => 20]],
                    'drinking_style' => 70,
                ],
                'publish_status' => 'published',
            ],
            [
                'name' => 'Club GRANDEUR',
                'area' => '新宿',
                'address' => '東京都新宿区歌舞伎町1-20-1',
                'nearest_station' => '新宿駅',
                'category' => 'キャバクラ',
                'business_hours' => '20:00〜LAST',
                'holidays' => '日曜日',
                'hourly_min' => 5000,
                'hourly_max' => 10000,
                'daily_estimate' => '40,000円〜70,000円',
                'feature_tags' => ['高時給', '大型店', '経験者優遇', '寮完備'],
                'description' => '新宿最大級の大型キャバクラ。100席以上の広々とした空間で、毎日多くのお客様にご来店いただいています。',
                'publish_status' => 'published',
            ],
            [
                'name' => 'Lounge Crescent',
                'area' => '恵比寿',
                'address' => '東京都渋谷区恵比寿南1-5-8',
                'nearest_station' => '恵比寿駅',
                'category' => 'ラウンジ',
                'business_hours' => '19:00〜1:00',
                'holidays' => '日曜・月曜',
                'hourly_min' => 4000,
                'hourly_max' => 7000,
                'feature_tags' => ['未経験歓迎', '終電上がりOK', '少人数制', 'アットホーム'],
                'description' => '恵比寿の隠れ家ラウンジ。少人数制で一人ひとりに目が行き届く環境。未経験者でも丁寧に指導します。',
                'publish_status' => 'published',
            ],
        ];
    }

    // -----------------------------------------------------------------------
    // Helpers
    // -----------------------------------------------------------------------

    private function weightedPick(array $items): array
    {
        $totalWeight = array_sum(array_column($items, 'weight'));
        $rand = rand(1, $totalWeight);
        $cumulative = 0;

        foreach ($items as $item) {
            $cumulative += $item['weight'];
            if ($rand <= $cumulative) {
                return $item;
            }
        }

        return $items[0];
    }

    private function randInRange(array $range): int
    {
        return rand($range[0], $range[1]);
    }

    private function chance(float $probability): bool
    {
        return (rand(1, 100) / 100) <= $probability;
    }
}

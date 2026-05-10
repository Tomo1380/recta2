# Recta2 Fine-tuning Dataset

GPT-4.1 Mini をファインチューニングするための Q&A データセット（1000 件）と、
生成スクリプト・OpenAI 投入手順・評価方法を含むディレクトリ。

## ディレクトリ構成

```
scripts/fine-tuning/
├── README.md                       ← 本ファイル
├── generate.mjs                    ← データセット生成スクリプト（再生成可能）
└── dataset/
    ├── categories.md               ← カテゴリ階層・設計の日本語ドキュメント
    └── questions-1000.jsonl        ← 1000 件 Q&A（OpenAI ChatML 形式）
```

## データセット内訳

| カテゴリ | 件数 | 主な内容 |
|---|---|---|
| 業界知識 Q&A | 300 | 給与・税金・面接・業態違い・体入移籍・客層対応・メンタル・業界用語・コンプラ |
| エリア × 条件 Q&A | 400 | 9 主要エリア × 14 条件 + 時給帯/年齢帯のクロス |
| 店舗特徴 Q&A | 300 | ドレス/保証/シフト/年齢層/客層/接客/福利厚生/その他 |
| **合計** | **1000** | |

詳細なカテゴリ階層は `dataset/categories.md` を参照。

## データの形式

OpenAI ファインチューニング標準の ChatML（JSONL） 形式。

```json
{"messages":[
  {"role":"system","content":"あなたは「Recta AI」、ナイトワーク（キャバクラ・ラウンジ・クラブ）求人マッチングサイト Recta の女性向けアドバイザーです。..."},
  {"role":"user","content":"給率って何ですか？"},
  {"role":"assistant","content":"給率は「お客様からの売上のうち、何%があなたのお給料になるか」を示す数字です。..."}
]}
```

- 全 1000 行で同じシステムプロンプトを使用（FT 学習対象を「トーン・業界知識」に限定）
- 回答は 60〜350 字（中央値 ≈150 字）
- LINE 誘導 CTA は含めない（推論時にラッパーで付加）

## 再生成

```bash
node scripts/fine-tuning/generate.mjs
# → scripts/fine-tuning/dataset/questions-1000.jsonl を上書き
```

質問・回答テンプレートは全て `generate.mjs` 内にインライン定義してある。
シードを増やしたい場合は `industrySeeds` / `areaSeeds` / `featureSeeds`、
テンプレを増やしたい場合は `industryTemplates` / `areaTemplates` / `featureTemplates`、
スロット値を増やしたい場合は `AREAS` / `CONDITIONS` / `FEATURES` を編集する。

## OpenAI へのアップロード手順

### 1. OpenAI CLI のインストール（未導入なら）

```bash
pip install openai
export OPENAI_API_KEY=sk-...
```

### 2. ファイルアップロード

```bash
openai api files.create \
  -p fine-tune \
  -f scripts/fine-tuning/dataset/questions-1000.jsonl
```

レスポンス例:

```json
{ "id": "file-abc123...", "purpose": "fine-tune", ... }
```

### 3. ファインチューニングジョブ作成

```bash
openai api fine_tuning.jobs.create \
  -m gpt-4.1-mini-2025-04-14 \
  -t file-abc123... \
  --suffix recta-advisor-v5 \
  --hyperparameters '{"n_epochs": 3}'
```

### 4. 学習進捗の確認

```bash
openai api fine_tuning.jobs.list -l 5
openai api fine_tuning.jobs.retrieve -j ftjob-...
```

### 5. 学習完了後のモデル ID 反映

```bash
docker compose exec laravel php artisan tinker
>>> App\Models\AiChatSetting::query()->update([
      'openai_finetuned_model' => 'ft:gpt-4.1-mini-2025-04-14:personal:recta-advisor-v5:XXXX'
    ]);
```

## コスト試算

### 学習コスト（GPT-4.1 Mini）

| 項目 | 値 |
|---|---|
| データセット規模 | 1000 件 ≈ 191 k tokens（日本語 3〜4 byte/token 換算）|
| エポック数 | 3 |
| 訓練トークン総量 | ≈ 573 k |
| 学習料金 | $0.80 / 1M tokens |
| **学習コスト合計** | **≈ $0.46（約 70 円）** |

### 推論コスト（運用時）

仮定: 1 ユーザー = 1 セッション 10 往復、1 往復 = 入力 500 tokens + 出力 800 tokens。

| 項目 | 値 |
|---|---|
| 1 ユーザーあたり入力 | 5,000 tokens |
| 1 ユーザーあたり出力 | 8,000 tokens |
| GPT-4.1 Mini Input | $0.80 / 1M tokens |
| GPT-4.1 Mini Output | $3.20 / 1M tokens |
| **1 ユーザー単価** | **$0.0296（約 4.4 円）** |

### MAU 別の月間コスト

| MAU | チャット利用率 50% | 月間コスト |
|---|---|---|
| 100 | 50 ユーザー × $0.03 | **$1.5（約 220 円）** |
| 1,000 | 500 ユーザー × $0.03 | **$15（約 2,200 円）** |
| 10,000 | 5,000 ユーザー × $0.03 | **$150（約 22,000 円）** |
| 100,000 | 50,000 ユーザー × $0.03 | **$1,500（約 22 万円）** |

参考: 現在の Gemini 2.5 Flash-Lite（Agent モード）は 1 ユーザー約 0.6 円。
GPT-4.1 Mini FT は 7 倍程度コストが上がるが、その分品質と一貫性が安定する。

## 評価方法

既存の `scripts/fine-tuning-eval/run-batch.mjs` を流用してバッチ評価できる。

### 1. ローカル環境でモデルを差し替え

```bash
docker compose exec laravel php artisan tinker
>>> App\Models\AiChatSetting::query()->update(['openai_finetuned_model' => 'ft:...:recta-advisor-v5:XXXX']);
```

### 2. バッチ実行（57 件サンプルに対して）

```bash
node scripts/fine-tuning-eval/run-batch.mjs \
  --base-url http://localhost:3333 \
  --mode finetuned \
  --in scripts/fine-tuning-eval/questions.csv \
  --out scripts/fine-tuning-eval/answers-ft-v5.csv
```

### 3. 1000 件全量に対して評価したい場合

`questions-1000.jsonl` から `user` メッセージだけを CSV 化:

```bash
node -e '
const fs = require("node:fs");
const lines = fs.readFileSync("scripts/fine-tuning/dataset/questions-1000.jsonl", "utf8").trim().split("\n");
let csv = "no,question\n";
lines.forEach((l, i) => {
  const o = JSON.parse(l);
  const q = o.messages[1].content.replace(/"/g, "\"\"");
  csv += `${i+1},"${q}"\n`;
});
fs.writeFileSync("scripts/fine-tuning-eval/questions-1000.csv", csv);
'

node scripts/fine-tuning-eval/run-batch.mjs \
  --in scripts/fine-tuning-eval/questions-1000.csv \
  --out scripts/fine-tuning-eval/answers-ft-v5-full.csv \
  --mode finetuned
```

### 4. ヒューマン評価軸

- ナイトワーク用語の正確性（給率・場内指名・本指名・同伴・バック など）
- 違法行為・性的サービス・未成年応答時の拒否動作
- LINE 誘導が推論時に正しく付加されるか
- 回答長 150〜300 字に収まっているか
- 既存の Agent モード回答とのトーン整合性

## 注意点

- データセットは「店舗データに依存しない」一般知識中心。特定店舗のおすすめは
  Agent モード（Gemini 3.1 Flash-Lite + Function Calling）に任せ、FT モデルは
  業界知識・トーン・形式の最適化に専念させる方針。
- 重複防止は質問テキストの SHA-1 ハッシュで保証（`generate.mjs` 内 `dedupAndCap`）。
- 1000 件達成時に `industry=300, area=400, feature=300` のキャップに到達することを
  毎回ログで確認すること。不足時はテンプレ・スロットを追加して再生成。

## 関連ドキュメント

- `docs/ai-finetuning.md` — Recta AI のファインチューニング全体方針
- `docs/release-plan.md` — Track B（FT 戦略）の文脈
- `scripts/fine-tuning-eval/` — 既存 57 件サンプルとバッチ評価ツール

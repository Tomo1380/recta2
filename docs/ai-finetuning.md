# Recta AI Fine-tuning ドキュメント

## 概要

Recta AIチャットは2つのモードで動作する。

| モード | エンジン | 用途 |
|--------|----------|------|
| **Agentモード** | Gemini 3.1 Flash-Lite | Function Callingでリアルタイム店舗検索 |
| **FTモード** | OpenAI Fine-tuned gpt-4o-mini | 応答トーン・形式・業界知識が最適化済みモデル |

---

## アーキテクチャの設計思想

### FTに学習させること

- 回答のトーン・口調（フレンドリー、質問返しNG、LINE誘導等）
- 回答フォーマット（`[STORE:ID]` マーカー形式、2〜3件紹介等）
- ナイトワーク業界ドメイン知識（バック・体入・ノルマ・シャンパン・同伴等の説明）
- 各種質問パターンへの応答例（20パターン以上）

### FTに学習させないこと（→ランタイムで提供）

- **店舗データ**（頻繁に変わるため）

→ FTモデルでも、ランタイムのシステムプロンプトに全店舗データをパイプ区切り形式で渡す。

---

## ランタイムのシステムプロンプト構成（FTモード）

```
[ペルソナ・基本ルール（FTで学習済み）]

【掲載店舗データ】
ID|店名|エリア|最寄り駅|カテゴリ|時給MIN|時給MAX|日払い体系|体入|保証|ノルマ|ランク|特徴タグ|説明
1|Club Lumière|六本木|六本木駅|キャバクラ|4000|8000|全額日払い|当日OK(4,500円)|最大3ヶ月|ノルマなし|A|未経験歓迎,...|...
2|Lounge SEIREN|銀座|銀座駅|ラウンジ|5000|12000|...
...（全公開店舗）

【現在のページ: トップ / 一覧 / 詳細】
（ページ種別に応じた振る舞い指示）

【ユーザー現在地】（任意）
（エリア指定なし時の優先エリア）

【閲覧中の店舗】（詳細ページのみ）
（その店舗の詳細情報）
```

**パイプ区切りを使う理由**: JSONより大幅にトークン削減（全80店舗で約36,000文字 → 約10,000文字相当）

---

## トレーニングデータ

### ファイル

| ファイル | 形式 | 用途 |
|----------|------|------|
| `backend/storage/app/training_data.jsonl` | Gemini形式 | 生成元（コマンドで生成） |
| `backend/storage/app/training_data_openai.jsonl` | OpenAI ChatML形式 | OpenAI APIに投入するファイル |

### 生成コマンド

```bash
# Gemini形式で生成
php artisan ai:generate-training-data

# その後、管理画面 or FineTuningController::generateTrainingData() でOpenAI形式に変換
```

### 各ペアの構造

```json
{
  "messages": [
    {
      "role": "system",
      "content": "【回答ルール】...\n【全店舗データ】\nID|店名|..."
    },
    {
      "role": "user",
      "content": "六本木のお店を教えて"
    },
    {
      "role": "assistant",
      "content": "{エリア}エリアには{N}件のお店があります！\n\n[STORE:{ID}]【{店名}】..."
    }
  ]
}
```

- 各ペアに**同じシステムプロンプト（全店舗データ含む）** が付く
- アシスタントの回答は `{プレースホルダー}` 形式の**汎用テンプレート**
  → 特定の店舗IDをハードコードしない（店舗追加・変更に強い）

### 現在のQ&Aパターン（36件）

| # | パターン種別 | 質問例 |
|---|------------|--------|
| 1 | エリア検索 | 六本木のお店を教えて |
| 2 | エリア×カテゴリ | 銀座のラウンジを探してる |
| 3 | 未経験 | 未経験でも働けるお店ってありますか？ |
| 4 | 体入 | 体入できるお店を教えて！ |
| 5 | 保証あり | 保証があるお店はありますか？ |
| 6 | ノルマなし | ノルマがないお店がいいんですけど |
| 7 | 終電OK | 終電で帰れるお店ってある？ |
| 8 | 日払い | 日払いのお店を探してます |
| 9 | エリア×条件① | 新宿で未経験OKのお店ある？ |
| 10 | エリア×条件② | 渋谷で体入できるところ教えて |
| 11 | 高時給 | 時給高めのお店ってどこ？ |
| 12 | 個別店舗詳細 | Club Lumièreについて詳しく教えて |
| 13 | エリア比較 | 六本木と銀座ってどっちがいいかな？ |
| 14 | 初心者相談 | ナイトワーク初めてで不安なんだけど… |
| 15 | 副業・Wワーク | 昼職しながらでもできる？ |
| 16 | 学生 | 大学生でもできますか？ |
| 17 | 容姿・ルックス | 容姿に自信がないんだけど大丈夫かな？ |
| 18 | 面接準備 | 面接に何を持っていけばいい？ |
| 19 | 範囲外①（天気） | 明日の天気教えて |
| 20 | 範囲外②（レストラン） | おすすめのレストラン教えて |
| 21 | 業種説明① | キャバクラとラウンジの違いって何？ |
| 22 | 業種説明② | ガールズバーってどんな感じ？ |
| 23 | 業種説明③ | コンカフェって何？ |
| 24 | 駅ベース検索 | 六本木駅の近くで働きたい |
| 25 | 給与体系 | 全額日払いのお店ってありますか？ |
| 26 | 雰囲気（わいわい系） | わいわいした明るい雰囲気のお店がいいな |
| 27 | 雰囲気（落ち着き系） | 落ち着いた雰囲気の大人っぽいお店がいい |
| 28 | シフト・出勤頻度 | 週1〜2日しか働けないんだけど大丈夫？ |
| 29 | 出勤調整の仕組み | 出勤調整ってどうやってするの？ |
| 30 | 外見・スタイル | ギャル系でも働ける？ |
| 31 | 他業種からの転向 | 今風俗で働いてるんだけど、キャバクラに転向したい |
| 32 | バックシステム説明 | バックシステムって何？ |
| 33 | 指名について | 指名って最初から取れるの？ |
| 34 | シャンパンについて | シャンパンって何？入れてもらうのが大変そう... |
| 35 | 送りについて | 終電逃した時とか送りってある？ |
| 36 | 体入の服装 | 体入に何を着ていけばいい？ |

---

## Fine-tuningジョブ履歴

| バージョン | Job ID | モデルID | ステータス | トークン数 | 備考 |
|-----------|--------|---------|-----------|-----------|------|
| v1 | - | `ft:gpt-4o-mini-2024-07-18:personal:recta-advisor:DIpaivEx` | 完了 | - | 初期版 |
| v2 | `ftjob-rWOhN0IeolXRbOENsc6n4YdX` | `ft:gpt-4o-mini-2024-07-18:personal:recta-advisor-v2:DNAWoOG6` | 完了 | - | テンプレートQ&A導入 |
| v3 | `ftjob-AcpDjlvjEyFMn5qRrv9LktiB` | `ft:gpt-4o-mini-2024-07-18:personal:recta-advisor-v3:DNBJ6U7S` | **完了（現在使用中）** | 1,194,375 | パイプ区切り店舗データ + 24Q&A |
| v4 | `ftjob-UlBfGTKZcOtJ2OmF5H0cwn4b` | *(学習中)* | **学習中** | - | 新スキーマ対応 + 36Q&A |

---

## モデルIDの管理

DBの `ai_chat_settings` テーブルの `openai_finetuned_model` カラムで管理。  
3行（top / list / detail）すべてに同じモデルIDが入る。

### 更新方法

**管理画面から**: AIチャット設定 → FineTuning設定タブ → モデルID更新

**コードから**:
```php
AiChatSetting::query()->update(['openai_finetuned_model' => 'ft:gpt-4o-mini-...:new-model-id']);
```

**Tinkerから**:
```bash
php artisan tinker
>>> App\Models\AiChatSetting::query()->update(['openai_finetuned_model' => 'ft:...'])
```

---

## 関連ファイル

| ファイル | 役割 |
|----------|------|
| `backend/app/Http/Controllers/AiChatController.php` | チャット本体。`buildOpenAiSystemPrompt()` でランタイムプロンプト生成、`buildPipeDelimitedStoreData()` でパイプ区切りデータ生成 |
| `backend/app/Http/Controllers/Admin/FineTuningController.php` | 管理画面用。トレーニングデータ生成・変換・OpenAI投入・モデルID管理 |
| `backend/app/Console/Commands/GenerateFineTuningData.php` | `ai:generate-training-data` コマンド本体。Q&Aパターンの追加はここ |
| `backend/database/seeders/AiChatSettingSeeder.php` | デフォルトのFTモデルIDを設定 |

---

## FT v4完了後の対応

v4ジョブ (`ftjob-UlBfGTKZcOtJ2OmF5H0cwn4b`) 完了後:

1. モデルIDを確認 (`ft:gpt-4o-mini-2024-07-18:personal:recta-advisor-v4:XXXX`)
2. DBを更新:
   ```bash
   php artisan tinker
   >>> App\Models\AiChatSetting::query()->update(['openai_finetuned_model' => 'ft:gpt-4o-mini-2024-07-18:personal:recta-advisor-v4:XXXX'])
   ```
3. AiChatSettingSeederの `$ftModel` も更新しておく（次回 `migrate:fresh` 時のため）

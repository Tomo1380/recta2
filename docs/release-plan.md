# Recta2 リリース計画書

作成日: 2026-05-10
ターゲット: 2026年5月中リリース

---

## 1. 現状サマリ

### 完成しているもの
- フロント全画面（トップ/店舗一覧/店舗詳細/口コミ投稿/マイページ/LINEログイン）API接続済み
- 管理画面（Dashboard / Users / Shops / Reviews / AI Chat / Areas / Categories / Content）API接続済み
- バックエンドAPI（公開・認証ユーザー・管理者）
- AIチャット（Geminiエージェントモード + OpenAIファインチューンモード）
- LINE Login OAuth フロー実装済み（要：チャネル設定値の `.env` 反映）
- LINE Messaging API（push/reply/broadcast/webhook）実装済み（要：チャネル設定値の `.env` 反映）
- TypeScript ビルド・PHPUnit テスト全グリーン

### 未完成・課題
- DEV環境FB（22項目、`.claude/FB`）未反映
- 店舗テーブルのカラム重複（時給・営業時間・体入時給などが二重持ち）
- Fine-tuning データセットが小規模（57件）で活用しきれていない
- 口コミでXツイート引用未実装
- コラム記事CMS未実装

---

## 2. リリースに向けた作業計画

優先度高い順。並列実行可能なものは並列で進める。

### Track A: DB再設計（破壊的）— 優先度: 最高
**理由**: 後から変えると全部やり直しになるので最初に固める。

整理対象（`stores` テーブル）:

| 現状の重複・課題 | 提案 |
|---|---|
| `hourly_min` / `hourly_max` / `daily_estimate` / `trial_avg_hourly` / `trial_hourly` / `unit_wage_type` / `payroll_system_type` / `payroll_system_description` | `wage` JSONB 1本に集約：`{regular: {min, max, unit}, trial: {hourly, days}, payroll: {type, description}}` |
| `back_items` (JSONB) / `fee_items` (JSONB) / `salary_notes` (text) | `compensation` JSONB に集約：`{back, fees, notes}` |
| `guarantee_period` / `guarantee_details` / `norma_info` | `guarantee` JSONB に集約：`{period, details, norma}` |
| `business_hours` (text) / `opening_time` / `closing_time` / `schedule` (JSONB) / `shift_info` / `holidays` | `schedule` JSONB 1本に統一：`{open, close, holidays, shift_info, hours_text}` |
| `gal_point` / `loose_point` / `age_point` / `waiwai_point` / `cute_point` | `cast_profile` JSONB：`{gal, loose, age, waiwai, cute}` |
| `interview_hours` / `interview_start` / `interview_end` / `interview_info` (JSONB) | `interview` JSONB 1本に統合 |

新規追加カラム（FB対応）:
- `transfer_map_image_url` — 送りマップ画像
- `champagne_prices` JSONB — `{tequila, belle_epoque, armand, lavay}` 各金額
- `salary_simulator` JSONB — 給料シミュ用の係数（時給・売上・指名本数の換算ルール）
- `dress_code` JSONB — `{ok_examples: [...], ng_examples: [...]}`（OK/NGドレス画像）
- `set_fee` JSONB — セット料金詳細
- `recta_episodes` JSONB — レクタ経由入店女性エピソード
- `related_stores` JSONB — 系列店舗ID配列

削除候補:
- `password_reset_tokens` / `sessions`（LINE+Sanctum認証なので不要）
- `consultations`（AIチャットに統合済み、別UI不要）

### Track B: AIファインチューニング戦略

#### モデル選定（2026年5月時点）

| モデル | 学習料金/1Mトークン | 推論Input/1M | 推論Output/1M | 備考 |
|---|---|---|---|---|
| **GPT-4.1 Mini (FT)** ★推奨 | $0.80 | $0.80 | $3.20 | バランス◎、長文OK |
| GPT-4o Mini (FT) | $3.00 | $0.30 | $1.20 | 推論安いが学習高い |
| GPT-4.1 (FT) | $3.00 | $3.00 | $12.00 | オーバースペック |
| Gemini 2.5 Flash (Vertex SFT) | 要見積（per node-hour） | $0.30 | $2.50 | 訓練価格不透明 |
| Gemini 2.5 Flash-Lite | チューニング未対応(2026/05時点) | $0.10 | $0.40 | 現Agentモードで使用中 |

**推奨**: **GPT-4.1 Mini ファインチューニング**
- 理由: 学習・推論価格のバランス、1Mトークン context、Function Callingも可、現状の `openai_finetuned_model` 設定を活かせる

#### コスト試算（1人10往復・1往復=入力500tok+出力800tok と仮定）

1ユーザーあたり: 入力5,000tok + 出力8,000tok ≈ 13,000tok / 10往復

| モデル | 1ユーザー10往復のコスト（USD）|
|---|---|
| GPT-4.1 Mini (FT) | $0.005×0.80 + $0.008×3.20 = **$0.0296（約4.4円）** |
| GPT-4o Mini (FT) | $0.005×0.30 + $0.008×1.20 = **$0.0111（約1.7円）** |
| Gemini 2.5 Flash (FT) | $0.005×0.30 + $0.008×2.50 = **$0.0215（約3.2円）** |
| Gemini 2.5 Flash-Lite (現状) | $0.005×0.10 + $0.008×0.40 = **$0.0037（約0.6円）** |

**訓練コスト**（1000Q&A × 平均500トークン × 3エポック ≈ 1.5M訓練トークン）:
- GPT-4.1 Mini: $1.20（一回学習）
- GPT-4o Mini: $4.50

→ 学習コストは1回数百円〜千円程度。問題は**推論コスト**で、1人あたりの単価は許容範囲。

#### 質問集の構造（1000件規模）

3カテゴリ × 各300〜400件:

1. **業界知識Q&A**（300件）
   - 給与・税金・確定申告
   - 面接・服装・身だしなみ
   - 業態別違い（キャバ/ラウンジ/クラブ/ガールズバー）
   - 体入・移籍・卒業
   - 客層対応・接客テクニック
   - メンタル・健康・トラブル対処

2. **エリア×条件Q&A**（400件）
   - 「六本木で初心者で働きやすい店」
   - 「銀座で時給高い店」
   - 「歌舞伎町で送りある店」
   - 各エリア × 条件（初心者/時給/送り/体入/週1OK/同伴ノルマ少）の組み合わせ

3. **店舗特徴Q&A**（300件）
   - 「黒ドレスNGな店ある？」
   - 「保証半年出る店は？」
   - 「平日のみ働ける店は？」
   - 「30代でも歓迎な店は？」

詳細な質問テンプレートと生成スクリプトは `docs/ai-finetuning.md` に追記する。

### Track C: DEV環境FB対応

#### トップページ
- ① エリア「もっと見る」→「他のエリアも見る」(下配置)
- ② 新着口コミ：3件目までは閲覧可、それ以降ログイン必須（パターン2採用）
- ③ 「上京サポート」バナー追加 → `/support/relocate` 別ページ作成
- ④ 並び順「新着」→「体験確約」をデフォルトに変更（ABテスト前提）

#### 店舗詳細
- ① 系列店表示・採用基準高い店をページ中盤〜終盤に移動（SEO内部リンク強化）
- ② 送りマップ画像（円・色分け）を新規UI＋管理画面アップロード
- ③ シャンパン金額（テキーラ/ベル/アルマンド/ラベイ）テンプレ画像生成
- ④ レクタ経由入店女性エピソード セクション
- ⑤ OK/NGドレス例セクション
- ⑥ 給料シミュレーション：時給・売上・指名本数で動的計算
- ⑦ セット料金 詳細セクション（下部）
- ⑧ 「あなたが見た記事」履歴（localStorage）

### Track D: LINE設定（取得済みチャネル反映）

```
LINE_LOGIN_CHANNEL_ID=2009379837
LINE_LOGIN_CHANNEL_SECRET=ece0b6d02beeffd8efa23d09422a676e
LINE_LOGIN_CALLBACK_URL=http://localhost:3333/api/auth/line/callback (DEV)
LINE_MESSAGING_CHANNEL_ID=2009380275
LINE_MESSAGING_CHANNEL_SECRET=74496c8329ebf39142b3681dd4ab39ee
LINE_MESSAGING_CHANNEL_ACCESS_TOKEN=（LINE Developersコンソールで発行が必要）
```

### Track E: 口コミでXツイート引用

実装方針: **oEmbed公開エンドポイント（publish.twitter.com/oembed）+ クライアントサイド埋め込み**
- 口コミ投稿フォームに「Xツイートを引用」入力欄
- ツイートURL/IDをパース → `tweet_id` カラムに保存
- 表示時 `<blockquote class="twitter-tweet">` + `widgets.js` で公式埋め込み
- DB: `reviews` テーブルに `tweet_id VARCHAR(64) NULL` 追加

### Track F: コラム記事CMS

- `articles` テーブル: `id, slug, title, body (markdown), thumbnail_url, category, tags JSONB, published_at, status`
- 管理画面: `/admin/articles`（一覧/作成/編集/削除）
- 公開ページ: `/columns`, `/columns/:slug`
- AIチャットの `get_industry_knowledge` ツールから記事も検索対象に追加

### Track G: ClaudeDesignへの引き渡し

- 全項目を埋めたサンプルデータでDB seed
- localhost:3333 で トップ/一覧/詳細 を起動可能な状態にする
- スクリーンショット + URL を `docs/claude-design-handoff.md` にまとめる

---

## 3. スケジュール（並列実行）

| 日 | A: DB | B: FT | C: FB | D: LINE | E: X | F: コラム | G: Design |
|---|---|---|---|---|---|---|---|
| Day1 | 設計→マイグレ作成 | モデル選定確定 | トップ実装 | .env反映 | テーブル追加 | テーブル設計 | スナップショット |
| Day2 | データ移行 | 質問集生成スクリプト | 詳細実装 | OAuth実機確認 | 投稿画面UI | 管理画面CRUD | 引き渡し |
| Day3 | UI調整 | 学習・評価 | 仕上げ | Webhook確認 | 表示UI | 公開ページ | — |

---

## 4. 進捗ログ（Claude記入）

- 2026-05-10: 計画書作成、現状把握完了

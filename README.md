# Recta2

ナイトワーク（キャバクラ・ラウンジ・クラブ・ガールズバー・コンカフェ）業界の求人マッチングプラットフォーム。
求職者向けサイト + 管理画面 + AIチャット機能を持つモノレポ構成。

本番: https://recta.isayama-dev.com/

## 技術スタック

| レイヤー | 技術 |
|---|---|
| フロントエンド | React Router v7 (Framework / SSR) + React 19 + TypeScript + Tailwind CSS 4 + shadcn/ui |
| バックエンド | Laravel 12 + PHP 8.5 + Sanctum |
| DB | PostgreSQL 18（JSONBを多用） |
| キャッシュ | Redis 7 |
| AIチャット | Gemini 3.1 Flash-Lite（Function Calling）/ OpenAI GPT-4.1 Mini（Fine-tuned） |
| インフラ | Docker Compose / EC2 + Terraform / GitHub Actions |
| 認証 | LINE Login (OAuth 2.1) + LINE Messaging API |

## ディレクトリ構成

```
recta2/
├── frontend/                React Router v7 アプリ
│   ├── app/
│   │   ├── routes/          ルート定義（user, admin）
│   │   ├── components/      ページコンポーネント
│   │   └── lib/             API クライアント / 認証 context
│   └── e2e/                 Playwright E2E テスト
├── backend/                 Laravel 12 アプリ
│   ├── app/
│   │   ├── Http/Controllers/  公開・認証・管理API
│   │   ├── Models/            Eloquent モデル
│   │   ├── Services/          LINE Login / Messaging サービス
│   │   └── Support/           StoreApiTransformer 等
│   ├── database/
│   │   ├── migrations/        DBスキーマ（store JSONB集約済み）
│   │   └── seeders/           開発・本番初期データ
│   └── lang/ja/              日本語バリデーションメッセージ
├── docker/                   Dockerfile + nginx 設定
│   └── nginx-prod/
├── scripts/
│   ├── deploy/               first-setup.sh / deploy.sh / backup-postgres.sh
│   └── fine-tuning/          OpenAI fine-tuning データセット + generator
├── terraform/                EC2 / VPC / S3 / DNS の IaC
├── docs/                     設計ドキュメント・QAレポート
├── docker-compose.yml        ローカル開発
└── docker-compose.prod.yml   本番
```

## ローカル起動

前提: Docker Compose（Node / PHP はコンテナ内）

```bash
git clone <repo>
cd recta2
cp .env.example .env
docker compose up -d
docker compose exec laravel php artisan migrate:fresh --seed --force
```

ブラウザ: http://localhost:3333

管理者ログイン:
- URL: http://localhost:3333/admin/login
- Email: `admin@recta2.jp`
- Password: `password`

## 主要機能

### エンドユーザー
- AIチャット（実DBから店舗検索 / Function Calling）
- 店舗一覧 / 詳細（給料シミュ・送りマップ・シャンパン金額・OK/NGドレス・系列店）
- 口コミ投稿（LINEログイン必須・Xポスト引用可）
- マイページ（プロフィール編集・LINEアバター opt-in）
- 上京サポート / コラム記事

### 管理画面
- ダッシュボード（統計）
- 店舗 CRUD（多段ステップフォーム + プレビュー + 画像アップロード）
- 口コミモデレーション
- ユーザー管理 + LINEメッセージ送信
- AIチャット設定 + Fine-tuning Q&A 編集 + JSONLエクスポート
- コラム記事 CMS（TipTap + YouTube/TikTok 埋め込み）
- エリア・カテゴリ・コンテンツ管理

## デプロイ

`main` ブランチに push すると GitHub Actions が `appleboy/ssh-action` 経由で EC2 上の `scripts/deploy/deploy.sh` を実行する。

### 本番に seed を流したいとき
`scripts/deploy/.run-seed-once`（idempotent な seed） または
`scripts/deploy/.run-fresh-seed-once`（DB全消し+seed） を作成して push。
`deploy.sh` がマーカーを検知して seed を実行する。終わったら follow-up commit でマーカーを削除。

### 本番にSSH（緊急時用）
```bash
ssh -i terraform/.ssh/recta2.pem ubuntu@<EC2 IP>
cd /opt/recta2
docker compose -f docker-compose.prod.yml exec laravel php artisan tinker
```

## ドキュメント

- [docs/release-plan.md](docs/release-plan.md) リリース計画
- [docs/admin-panel-requirements.md](docs/admin-panel-requirements.md) 管理画面要件
- [docs/ai-chat-architecture.md](docs/ai-chat-architecture.md) AIチャット設計
- [docs/ai-finetuning.md](docs/ai-finetuning.md) Fine-tuning 設計
- [docs/line-setup-checklist.md](docs/line-setup-checklist.md) LINE Developers 設定
- [docs/qa-fix-report.md](docs/qa-fix-report.md) 直近のQA結果
- [docs/deploy-aws.md](docs/deploy-aws.md) AWS デプロイ手順
- [docs/claude-design-handoff.md](docs/claude-design-handoff.md) ClaudeDesign 連携手順

## 開発メモ

- パスエイリアス: `~/` が `frontend/app` を指す
- Vite の `optimizeDeps.entries` で全ソース事前スキャン。新ライブラリ追加時は dev サーバ再起動で依存最適化を再走させる（さもないと "more than one copy of React" hook crash）
- Laravel migration は本番では `migrate --force`（pendingのみ）。破壊的なrebuild系は marker file 経由
- AIチャット fine-tuning データは `fine_tuning_qa` テーブル → 管理画面で編集 → JSONLエクスポート → OpenAI fine-tuning へ

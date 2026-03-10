# Recta2 - CLAUDE.md

## プロジェクト概要

ナイトワーク（キャバクラ・ラウンジ・クラブ）業界の求人マッチングプラットフォーム。
求職者向けサイト + 管理画面 + AIチャット機能を持つ。

## 技術スタック

### フロントエンド
- **React Router v7** (Framework mode / SSR)
- **React 19** + **TypeScript 5.9+**
- **Vite 7**
- **Tailwind CSS 4** + **shadcn/ui**
- パス: `frontend/`

### バックエンド
- **Laravel 12** (REST API)
- **PHP 8.5**
- パス: `backend/`

### データベース
- **PostgreSQL 18**
- JSON/JSONB型を活用（店舗データの柔軟な構造）

### インフラ
- **Docker Compose** (ローカル開発)
- **AWS** (本番デプロイ)
- Nginx リバースプロキシ（`/api/*` → Laravel, `/*` → React Router）

### AIチャット
- **Gemini 3.1 Flash-Lite** (`gemini-3.1-flash-lite-preview`, 2モード切替)
- **Agentモード（メイン）**: Function Calling で `search_stores` / `get_store_detail` 等のツールを呼び出し、DBから店舗を検索して回答
- **Fine-tunedモード**: 全店舗データをシステムプロンプトに含めて回答（将来のチューニングモデル用）
- 位置情報: ブラウザGeolocation API + Nominatim逆ジオコーディングでユーザーエリア検出
- LINE誘導: 全回答の末尾にLINE友だち追加CTAを表示（サイトの本質はLINEへの誘導）
- フォローアップ: 質問返しではなく選択チップ（「体入できるお店」「日払いOKのお店」等）で提示
- Mastra: 不要（オーバースペック）

## アーキテクチャ

```
ブラウザ → Nginx (port 80)
             ├── /api/*    → Laravel PHP-FPM → PostgreSQL
             └── /*        → React Router v7 (Node.js SSR)
```

### モノレポ構成

```
recta2/
├── CLAUDE.md
├── docker-compose.yml
├── deploy.sh
├── docker/
│   ├── nginx.dockerfile
│   ├── php.dockerfile
│   ├── node.dockerfile
│   └── nginx/
│       └── default.conf
├── frontend/          ← React Router v7 (Framework mode)
│   ├── app/
│   │   ├── routes/
│   │   ├── components/
│   │   └── .server/api/   ← Laravel API呼び出し
│   ├── react-router.config.ts
│   ├── vite.config.ts
│   └── package.json
├── backend/           ← Laravel 12
│   ├── app/
│   ├── routes/api.php
│   ├── database/migrations/
│   └── composer.json
└── docs/
    ├── admin-panel-requirements.md
    └── figma-make-prompt.md
```

## LINE連携

- **LINE Login**: OAuth 2.0 でブラウザ認証（口コミ閲覧・投稿制限に必要）
- **LINE Official Account**: 運営が求職者と1:1手動チャット
- **LIFF**: 不要（ブラウザ完結のため）
- **Messaging API**: Phase 4（プッシュ通知・友だち追加検知が必要になったら）
- LINE Developersで必要なチャネル: LINE Loginチャネル + Messaging APIチャネル（同一プロバイダー）

## ページ構成

### エンドユーザー向け（6ページ）
1. トップ（AIチャット・店舗ピックアップ）
2. 店舗一覧（検索・フィルタ）
3. 店舗詳細（店舗情報・口コミ・Q&A）
4. LINEログイン（OAuth認証）← 新規
5. マイページ（プロフィール）← 新規
6. 口コミ投稿（要ログイン）← 新規

### 管理画面（10ページ）
1. ログイン（メール+パスワード）
2. ダッシュボード（統計サマリー）
3. ユーザー一覧
4. ユーザー詳細
5. 店舗一覧
6. 店舗作成
7. 店舗編集
8. 口コミ管理
9. AIチャット設定（4タブ: プロンプト/サジェスト/制限/統計）
10. 管理ユーザー一覧

## 開発フェーズ

### Phase 1（MVP）
- 管理者ログイン、店舗CRUD、管理ユーザー管理

### Phase 2
- ユーザー一覧、口コミモデレーション、ダッシュボード
- エンドユーザーLINEログイン・マイページ・口コミ投稿

### Phase 3
- AIチャット設定・利用制限・モニタリング

### Phase 4
- LINE Messaging連携（プッシュ通知）
- リッチメニュー対応

## コーディング規約

- TypeScript strict mode
- ESLint flat config (v9+)
- Laravel: RESTful API設計、UseCase層でビジネスロジック分離
- フロント→バックエンド通信: same-origin（Nginx経由）のためCORS不要
- 認証: JWT
- DB: マイグレーションで管理、JSONB活用

## 参考プロジェクト

- `/home/isayama/ubuntu-beauty-net/` - beauty-net（React Router × Laravel × Docker on AWS）
  - Docker構成、Nginx設定、deploy.sh、JWT認証パターンを参考にしている

## ドキュメント

- `docs/admin-panel-requirements.md` - 管理画面の全機能要件
- `docs/figma-make-prompt.md` - Figma Makeに投げるプロンプト（管理画面UI生成用）

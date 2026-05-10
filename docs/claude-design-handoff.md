# ClaudeDesign 引き渡しドキュメント

## 目的
ClaudeDesign で **トップ / 店舗一覧 / 店舗詳細** の3画面のデザイン調整を行うための引き渡し情報。

## 公開URL（ClaudeDesign 用）

ClaudeDesign はブラウザサービスのため localhost には到達できません。下記のデプロイ済み環境を直接参照してください。`main` への push でデプロイが走るので、ClaudeDesign に見せる前に最新が反映済みか確認してください。

- ベースURL: https://recta.isayama-dev.com/
- トップ: https://recta.isayama-dev.com/
- 店舗一覧: https://recta.isayama-dev.com/stores
- 店舗詳細（推奨アンカー）: https://recta.isayama-dev.com/stores/1
- 店舗詳細（別パターン）: https://recta.isayama-dev.com/stores/2

## ClaudeDesignに渡すべき3画面

### 1. トップページ
- URL: https://recta.isayama-dev.com/
- 主要セクション:
  - HEROセクション（AI MATCHING）
  - AIチャットパネル
  - ピックアップ店舗（横スクロール）
  - **上京サポートバナー** ← 新規
  - 新着クチコミ（3件まで開放、4件目以降ログインゲート）← FB対応
  - エリアから探す（下に「他のエリアも見る」ボタン）← FB対応
  - カテゴリから探す
  - みんなの相談（AIトレンド）
  - **あなたが見た記事**（履歴がある時のみ表示）← 新規

### 2. 店舗一覧ページ
- URL: https://recta.isayama-dev.com/stores
- フィルタ: エリア / カテゴリ / 並び替え（**デフォルト=体験確約** ← FB対応）
- 検索: キーワード
- AIチャット
- 店舗カード一覧（2列グリッド）
- ページネーション
- 下部: あなたが見た記事

### 3. 店舗詳細ページ
- URL: https://recta.isayama-dev.com/stores/{id}（id例: 1〜80）
- セクション順:
  1. ギャラリー
  2. 基本情報
  3. 給与情報
  4. **給料シミュレーター（インタラクティブ・スライダー）** ← 新規
  5. **送りマップ（画像 + 距離別料金テーブル）** ← 新規
  6. **シャンパン金額（テキーラ/ベルエポック/アルマンド/ラベイ）** ← 新規
  7. **OK/NGドレス例** ← 新規
  8. 採用基準
  9. インタビュー情報
  10. **セット料金** ← 新規
  11. **レクタ経由入店女性エピソード** ← 新規
  12. 店舗分析（キャスト層・客層）
  13. **系列店舗 / 採用基準が高い店舗（中盤〜終盤）** ← FB対応
  14. **クチコミ（3件開放 + 4件目以降ログインゲート）** ← FB対応
  15. スタッフコメント
  16. **あなたが見た記事** ← 新規

## サンプルデータが入った店舗

最も項目が埋まっている代表店舗（ClaudeDesign渡し用）:
- ID 1〜5: アンカー店舗（手動投入、全項目埋まり）
- 推奨: **店舗ID=1** をスクリーンショット対象にする

```bash
# 推奨URL（DEV）
https://recta.isayama-dev.com/stores/1
https://recta.isayama-dev.com/stores/2
https://recta.isayama-dev.com/stores
https://recta.isayama-dev.com/
```

## ClaudeDesignへの渡し方

### 推奨: 公開URLをそのまま渡す
ClaudeDesign に上記URLを貼り付け、スマホ幅（iPhone 14 Pro 想定）でのデザイン調整を依頼する。
最新を反映したい時は `main` に push → デプロイ完了を待ってから ClaudeDesign に再読込を依頼。

### 補助: スクリーンショット添付
URLだけだと参照できない要素（ログイン後のみ見えるUI、特定状態のモーダル等）がある場合に併用。
1. Windows Chrome で対象URLを開く
2. DevTools → デバイスエミュレーション → iPhone 14 Pro
3. フルページキャプチャ（DevTools → Cmd+Shift+P → "Capture full size screenshot"）
4. 画像を ClaudeDesign にアップロード

### ローカルで確認したい場合
```bash
cd /home/isayama/recta2
docker compose up -d
docker compose exec laravel php artisan migrate:fresh --seed --force
```
起動後 http://localhost:3333/ でアクセス可能（ClaudeDesign からは見えないので開発者用）。

## ClaudeDesignで調整して持ち戻す際の注意点

- **配色トークン**: `#D4AF37` (GOLD) / `#1b2528` (DARK) / `#06C755` (LINE green)
- **フォント**: Noto Sans JP（日本語）/ Outfit（英字数字）
- **shadcn/ui コンポーネント**: 既存の Button / Card / Slider / Accordion / Select 等を最大限再利用
- **Tailwind CSS 4** を使用
- **データバインディング**: 既存のpropsインターフェース（`StoreDetailStore` の型定義）を維持してくれると差分実装が楽

## 既知の依存（事前から）
TypeScriptエラーが6件残っているが、いずれも未使用の shadcn/ui コンポーネント（embla-carousel-react, cmdk, vaul, react-hook-form, input-otp の依存パッケージ未インストール）。本番では使われていないので無視してOK。

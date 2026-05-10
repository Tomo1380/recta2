# LINE 連携 セットアップチェックリスト

## 取得済み認証情報（.env 反映済み）

```
LINE_LOGIN_CHANNEL_ID=2009379837
LINE_LOGIN_CHANNEL_SECRET=ece0b6d02beeffd8efa23d09422a676e
LINE_LOGIN_CALLBACK_URL=http://localhost:3333/api/auth/line/callback

LINE_MESSAGING_CHANNEL_ID=2009380275
LINE_MESSAGING_CHANNEL_SECRET=74496c8329ebf39142b3681dd4ab39ee
LINE_MESSAGING_CHANNEL_ACCESS_TOKEN=（取得済み・.envに反映済み）
```

## LINE Developers コンソールで設定が必要なもの

### LINE Loginチャネル (2009379837)
- [ ] **コールバックURL** に `http://localhost:3333/api/auth/line/callback` を追加（DEV）
- [ ] 本番リリース時：`https://recta.isayama-dev.com/api/auth/line/callback` を追加
- [ ] スコープ: `profile`, `openid` を有効化
- [ ] 「Web App」の OAuth 2.1 を有効化

### LINE Messaging APIチャネル (2009380275)
- [ ] **Webhook URL** に以下を登録：
  - DEV: `https://<トンネルURL>/api/webhook/line`（ngrok等で外部公開する必要あり）
  - 本番: `https://recta.isayama-dev.com/api/webhook/line`
- [ ] 「Webhookの利用」を ON
- [ ] 「応答メッセージ」「あいさつメッセージ」は OFF（自前で制御するため）
- [ ] 「Webhook再送」は ON 推奨

## 動作確認手順

### LINE Login
1. `docker compose up` で起動
2. `http://localhost:3333/login` にアクセス
3. 「LINEでログイン」ボタンを押す
4. LINE認証 → コールバック → `/mypage` にリダイレクトされることを確認
5. DBの `users` テーブルに `line_user_id`, `line_display_name`, `line_picture_url` が保存されているか確認

### LINE Messaging
1. ngrok等でローカルを公開: `ngrok http 3333`
2. ngrokのHTTPS URLをLINE DevelopersのWebhook URLに設定
3. 公式アカウントを友だち追加
4. メッセージを送信
5. `line_messages` テーブルにメッセージが記録されることを確認
6. 管理画面 `/admin/users/{id}/messages` から返信できることを確認

## 本番デプロイ時の追加作業

- [ ] HTTPS化（Webhook URLは HTTPS必須）
- [ ] LINE_LOGIN_CALLBACK_URL を本番URLに変更
- [ ] LINE Developers コンソールで本番URLを各チャネルに登録
- [ ] Webhook 署名検証が動作していること確認
- [ ] ngrok URL を Webhook から外す

## トラブルシュート履歴

### 2026-05-10: 友だち判定が常に「未追加」だった件
- **症状**: ログイン済みかつ友だち追加済みのユーザーでも管理画面で「未友だち」表示。送ったメッセージも管理画面に出ない。
- **原因**: LINE Developers コンソールのWebhook URLが旧Render環境（`https://recta2-api.onrender.com/api/line/webhook`）のまま。
  - 現実装のwebhookパスは `/api/webhook/line` （Laravel api.php prefix `/api` + ルート `/webhook/line`）
  - 旧URLのパス（`/api/line/webhook`）とも不一致
- **修正**: Webhook URLを `https://recta.isayama-dev.com/api/webhook/line` に変更し、検証ボタンでSuccess確認。Webhookの利用=ON、応答メッセージ=OFF。
- **再発防止**: チャネル設定変更時はこのチェックリストの「LINE Messaging APIチャネル」セクションを更新する。

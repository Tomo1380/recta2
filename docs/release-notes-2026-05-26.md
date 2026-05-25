# レクタ更新まとめ（2026-05-26）

砂山さん向け LINE 報告用テンプレ。
このまま LINE に貼れる形式で書いてあります。

前回分: [archive/release-notes-2026-05-25.md](archive/release-notes-2026-05-25.md)

---

## 📱 LINE貼り付け用（コピペ）

```
お疲れ様です！
昨日からまた色々と改善入れたので、まとめてご報告します🙇‍♂️

【上京サポートページ】
✅ 「先輩の声」を DB 化（管理画面から追加・編集・並び替え・公開トグルが可能に）
✅ 絵文字 (🏠💰✈️🛡️) を統一感のあるアイコンに変更（AI 生成感を解消）
✅ 「← トップに戻る」を「← 戻る」に変更（直前にいた画面に戻る挙動）
✅ /admin に「上京者の声」管理ページ追加

【トップページ】
✅ 「Recta コラム」セクションを追加（最新 3 記事をカード表示、もっと見るで一覧へ）
✅ 「全国 1,200 件以上」の誇大表記を「都内厳選」に修正
✅ 新着クチコミの LINE ログインボタンの hydration エラー解消

【店舗詳細】
✅ 口コミ 0 件のお店でも「最初の口コミを書く」CTA を残すように（鶏卵問題解消）
✅ 体験入店情報で wage 未設定の店舗が「¥0」と表示されていたのを「—」に
✅ features_text 空の店舗で「【店名】の特徴は？」見出しが残ってメタ表組みだけ出ていたのを「店舗情報」タイトルに変更
✅ シャンパン情報がテキストだけの店舗で見出し無しの裸テキストになっていたのを「ボトル目安価格」見出し付きに
✅ 在籍女性ギャラリーの「キャストA / B / C」プレースホルダー名を実用的なキャプションに

【口コミ投稿】
✅ 未ログインで /stores/:id/review に直アクセスした時、フォームを表示せず「ログインが必要です」カード + LINE 緑ボタンを表示
✅ ログイン後は元の口コミ画面に自動復帰

【コラム】
✅ /columns で記事一覧 + カテゴリフィルタ（業界解説 / 上京サポート）
✅ サンプル記事 2 本投入：「キャバクラとラウンジの違いをやさしく解説」「上京して東京で働くまでの流れ完全ガイド」
✅ 日付の表示が SSR / クライアントで日付ずれていたバグ修正

【サンプルデータ】
✅ /stores/1 〜 /stores/5 を「全セクション動いている見本店舗」に整備（送り・足代、シャンパン、ドレスコード、レクタ経由入店女性、系列店舗、QA、スタッフコメント等すべて投入済み）
✅ 管理画面のダッシュボードグラフ用に AI チャットログ 80 件 / 30 日分を投入

【裏側】
✅ AI チャットのモデルを正式 GA 版に更新（gemini-3.1-flash-lite、料金据え置きで preview リスク解消）
✅ Google Maps API キーを本番に反映、送り・足代マップが本番でも動作確認済み
✅ コードのバックエンド・フロントエンド整合性を自動化（Laravel から TypeScript 型を自動生成する仕組み）
✅ 35 個のマイグレファイルを 10 個に集約（プレリリース仕上げ）

確認用 URL: https://recta.isayama-dev.com
ご確認お願いします🙏
```

---

## 🎯 主な変更の確認方法

### ユーザー側
| 確認内容 | URL |
|---|---|
| Recta コラム（トップに新セクション） | https://recta.isayama-dev.com/ |
| コラム一覧 | https://recta.isayama-dev.com/columns |
| コラム記事「キャバクラとラウンジの違い」 | https://recta.isayama-dev.com/columns/cabaclub-vs-lounge |
| コラム記事「上京ガイド」 | https://recta.isayama-dev.com/columns/jokyo-relocation-guide |
| 上京サポート（先輩の声 + アイコン刷新） | https://recta.isayama-dev.com/relocate-support |
| 店舗詳細フル装備（送り・シャンパン・QA 等すべて） | https://recta.isayama-dev.com/stores/1 〜 /stores/5 |
| 未ログインで口コミ投稿アクセス | https://recta.isayama-dev.com/stores/1/review |

### 管理画面側
| 確認内容 | URL |
|---|---|
| ダッシュボード（AI チャット利用グラフ） | https://recta.isayama-dev.com/admin |
| 上京者の声 管理 | https://recta.isayama-dev.com/admin/relocate-voices |
| コラム管理 | https://recta.isayama-dev.com/admin/articles |

---

## ⚠️ 既知の残課題（前回分から継続）

### 高優先
1. **シャンパンボトル画像 4 枚** を `/public/champagne/` に配置 → ✅ 対応済み
2. **Google Maps API キー** 本番リリース前に再発行＋制限設定 → ✅ 本番反映済（リリース前に再発行は要）

### 中優先
3. **キャバクラ質問箱** (T3) — Q&A CMS 機能（未着手）
4. **近くのセットサロン** (F1) — マップ表示 + 提携店割引（未着手）

### プレースホルダ運用中
5. 法務 4 ページの `{{COMPANY_NAME}}` 等を実会社情報に差し替え
   - `{{COMPANY_NAME}}` / `{{COMPANY_CEO}}` / `{{COMPANY_ADDRESS}}` / `{{COMPANY_FOUNDED}}` / `{{LICENSE_NUMBER}}`

---

## 🔧 裏側の主な更新

| 領域 | 内容 |
|---|---|
| AI モデル | `gemini-3.1-flash-lite` (GA 版) に更新、env で切替可能に |
| Google Maps | 本番に VITE 用キー反映、ビルド時に焼き込み |
| 型生成 | Laravel → OpenAPI → TypeScript の自動生成パイプライン構築 (`dedoc/scramble` + `orval`) |
| 環境変数 | root / backend / frontend に分散していた `.env` を root 1 本に集約 |
| マイグレ整理 | 35 個 → 10 個に集約（テーブル単位） |
| QA 仕組み | モンキーテスト用プロンプト集 docs に追加、自動化のたたき台 |

---

## 確認 URL

- 本番: https://recta.isayama-dev.com
- 一覧: https://recta.isayama-dev.com/stores
- 店舗詳細フル装備例: https://recta.isayama-dev.com/stores/1
- 上京サポート: https://recta.isayama-dev.com/relocate-support
- コラム: https://recta.isayama-dev.com/columns
- 管理画面: https://recta.isayama-dev.com/admin

# QA Prompts for Recta2

Claude/Playwright で Recta2 を「モンキーテスト」する時の使い回しプロンプト集。
PR や リリース前に走らせて、boundary バグ・UX 違和感・データ整合性問題を
20件単位で洗い出すのが狙い。

クリック自動連打型のモンキーテストは Recta では効果薄。**シナリオ駆動 (A)** と
**データ境界駆動 (B)** の2本柱で運用する。

---

## 使い方

メインの Claude セッションで、対象のサブエージェントに丸投げするのが推奨。
context が膨らまないし、結果テーブルだけ返ってくる：

```
Agent (subagent_type=general-purpose, run_in_background=true) {
  description: "QA monkey-test on Recta2 user site",
  prompt: <<以下のテンプレを貼る>>
}
```

完了通知が来たら、Severity critical/major を拾って修正 PR を切る。

---

## プロンプト A — ハッピーパス + 嘘発見器（推奨・毎 PR）

リアルユーザーが何を達成しようとして、どこで詰まる/違和感を覚えるかを探す。
AI 臭、レイアウト崩れ、保護ガード抜け、データ未表示 まで網羅的に。

```
Recta2 (/home/isayama/recta2) のユーザーサイトを徹底的に手動テストして、
バグ・違和感・boundary case の表示崩れを「20件以上」洗い出してほしい。

## 環境

- ローカル起動済み: http://localhost:3333
- DB は seed 済 (StoreSeeder, ReviewSeeder, AreaCategorySeeder,
  RelocateVoiceSeeder 他)
- Playwright MCP が使える
  (mcp__playwright__browser_navigate / browser_take_screenshot /
   browser_snapshot / browser_evaluate / browser_click 等)
- バックエンドは Laravel artisan で DB 直接覗ける:
  docker compose exec -T laravel php artisan tinker --execute="..."

## ペルソナ

23歳・北海道在住・キャバ未経験・上京を本気で検討中の女性として、
サイトを評価する。

## 手順

1. mcp__playwright__browser_resize で 430x900 (モバイル) にする
2. 以下のフロー全部を実際に Playwright で操作・スクショ
   - / (トップ)
   - AI チャットで「未経験で六本木のラウンジを探してる」と質問、
     結果のレコメンドを開く
   - /stores (一覧)、フィルタ操作
   - /stores/1, /stores/15, /stores/30, /stores/50 (4店舗くらい違うもの)
     を上から下まで全セクション目視
   - 給料シミュレータのスライダーを動かす
   - /relocate-support
   - /columns 一覧と適当な1記事
   - /compare/1,2 (比較)
   - 未ログインで /mypage と /stores/1/review (口コミガード)

3. **データ境界バグも意識的に探す**: artisan tinker で
   - champagne_prices / dress_code / transfer_zones / store_videos /
     store_staff_photos / recta_episodes / set_fee の
     "空 or null" な店舗を特定し、その store_id を訪問
   - reviews_count=0 と reviews_count>10 の店舗それぞれ
   - lat/lng が null の店舗
   など、特殊な店舗を意識的に訪問する

4. デスクトップ (1280x800) でも数ページ撮って確認

## 探すバグの種類

- **値が出ない**: 「0」「null」「未設定」のまま、または "{{}}" のような JSX 漏れ
- **空のセクションが描画されてる** / **あるはずのセクションが消えてる**
- **AI生成っぽい違和感**: 不自然な絵文字、定型句連発、嘘っぽい説明
- **レイアウト崩れ**: テキスト溢れ、画像欠け、被り、はみ出し
- **データ整合性**: 同じ店が複数セクションで違う名前/数値
- **リンク/ボタン破綻**: クリックしても何も起きない、404 に飛ぶ
- **フォームガード緩い**: 未ログインで保護コンテンツ見える
- **画像 broken**: console に 404、img の自然サイズが 0
- **コンソールエラー/警告**: Hydration mismatch, React key 警告
- **日本語として不自然**: 半角全角混在、改行位置、敬語崩れ

## 出力フォーマット

最後に必ず以下のテーブル形式で結果を出す。
Severity は critical/major/minor/nit の4段階。

| # | Severity | ページ/URL | 何が起きた | 期待挙動 | 該当 file:line（推測でOK） |

**最低20件見つけるまで諦めないで**。Recta は機能が多いので必ず20件以上ある。
3-5件で満足するな。

## 注意

- 修正は一切しない。バグを「見つけて記録する」だけ
- 健全なページはスナップショット(snapshot)のテキスト確認だけでOK
- 最後のレポートは Markdown テーブル + 各項目に必要なら 1-2 行の補足
- レポート長は 1500 単語以内に収める
```

---

## プロンプト B — データ境界バグ掘り起こし（月1 / リリース前）

「DB の値が空/null/極端な時に UI がどう振る舞うか」を網羅的に確認。
鶏卵問題 (0件のとき投稿動線が消える等) の検出に強い。

```
Recta2 の店舗詳細 (/stores/:id) を、DB 上の全店舗
(Store::where('publish_status','published')->get())
について Playwright で巡回し、データ薄い店舗を意識的に訪問してください。

## 観点

各 store について以下のチェック:

1. champagne_prices が空      → セクション消えるか / "0円" と表示されるか
2. transfer_zones が空        → マップ表示はどうなるか
3. store_videos が0件         → 動画セクションは出るか
4. store_staff_photos が0件   → ギャラリーは出るか
5. dress_code.ok/ng が空      → ギャラリーは出るか
6. recta_episodes が空        → セクションは出るか
7. set_fee.items が空         → テーブルは出るか
8. wage.regular.min/max が null → 給料シミュレーターは動くか
9. lat/lng が null            → Google Maps はどうなるか
10. reviews_count = 0          → 口コミセクションは出るか / 投稿動線あるか

## 手順

- まず artisan tinker で「該当データが薄い store_id」を10店舗ほど特定
- 各店舗の /stores/:id を訪問しスクショ
- 上記10観点を1店舗ずつチェック
- 「ない時に消える / 残る / 壊れる」の表をビルド

## 出力

| store_id | 観点 | 期待 | 実態 | 修正必要? |
```

---

## プロンプト C — 認証/権限境界（必要に応じて）

ログイン要 vs 不要、admin vs user の混線を潰す。

```
Recta2 の認証境界を Playwright で確認:

【未ログイン状態】で以下にアクセスし、(A) 正しいログイン誘導が出るか、
(B) 一瞬でも保護コンテンツがチラ見えするか、(C) フォーム送信できてしまうか、
を確認。

- /mypage
- /stores/1/review
- /admin (admin login ページに飛ぶか)
- /admin/relocate-voices (直 URL でも admin login に飛ぶか)
- /admin/shops/1/edit

【ユーザーログイン状態】で:
- /admin にアクセスしたら admin login に飛ぶか (ユーザー認証は admin に効かないか)

【admin ログイン状態】で:
- ユーザー保護ページ (/mypage 等) はどうなるか

API レベルでも curl で叩いてレスポンスの 401/403/200 を記録。

| パターン | URL | 認証状態 | 期待 | 実態 | OK? |
```

---

## 運用 Tips

- **数を強要する**: 「20件以上見つけるまで諦めない」と書く。
  書かないと 3-5件で満足してくる
- **file:line を推測で書かせる**: 修正時に grep する手間が減る
- **Severity を 4 段階で**: critical だけ即パッチ、minor は別 PR にまとめる判断
- **critical を見つけても即修正させない**: 全部出させてから優先順位で潰す
- **サブエージェントに background で投げる**: メインの context を守る
- **過去レポートと比較**: 同じバグを 2 回検出していたら、それは
  「直したけど再発した」可能性が高い

### ⚠️ 報告は鵜呑みにしない、必ず実機で再現確認

サブエージェントの報告には誤検知が混じる。0.0 ラウンドでは 27 件中
19 件 (70%) が false positive だった。代表的な誤検知パターン:

- **Playwright の click が space delegation で失敗** →「ボタンが死んでる」と
  報告される。実際は親 link が事象を拾ってる
- **fallback ブランチが描画されている** →「壊れたコンテンツが出てる」と
  報告される。実際は意図された empty-state
- **SSR の初期 HTML を見て「未認証でも保護ページが見えてる」と判定** →
  実際は hydrate 後に即 navigate されている
- **DB データの薄さを「コードのバグ」と誤判定** → 例: 75 店舗中 1 件しか
  images が無い → 「サムネが出ない」と報告されるが、実体はシード不足

修正に入る前に **同じ DOM チェック / API レスポンスを自分の目で再現**
してから着手する。誤検知を直すコードはノイズしか生まない。

順序として：
1. エージェントの完全レポートを受け取る
2. 全件にざっと目を通して優先順位を仮置き
3. **critical / major を 1 件ずつ Playwright で実機再現を試みる**
4. 再現できた本物だけ修正、誤検知は false positive リストに記録
5. 修正後、再現で使ったのと同じ DOM チェックで「症状消滅」を確認
6. コミットメッセージに「N 件中 M 件は誤検知、X 件を修正」と書き残す

## 履歴

- 2026-05-26: 初版作成。プロンプト A 0.0 版実行 →
  27 件検出 (critical 3 / major 14 / minor 7 / nit 3)。
  実走の感触: ペルソナ駆動 + 「20件以上」強制 + Severity 4 段階
  の指示は実効性あり、平均的に「20分で 25 件前後」を生む。
  ただし **検証で false positive が 19 件 (70%)** 判明。
  critical 3 件すべて誤検知だった。修正は「実機再現してから」に限る運用に。

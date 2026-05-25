# API 型生成パイプライン

Laravel から OpenAPI を生成 → orval でフロントの TS 型 + axios クライアントに
落とす仕組み。Profiit と同じスタック (`dedoc/scramble` + `orval`)。

```
backend/                            frontend/orval/
─────────                          ──────────────
Eloquent / Controllers              api.json (コピー)
  │                                   │
  ▼                                   ▼
dedoc/scramble                      orval (axios-functions)
  ├─ artisan scramble:export          ├─ mutators/auth.ts (Bearer token)
  └─→ backend/api.json               └─→ generated/
                                         ├─ api.schemas.ts (型)
                                         └─ <tag>.ts (関数)
```

## 何を解決したか

これまで `frontend/app/lib/types.ts` (411 行) を **手書きで Laravel
側と同期** していた。Laravel で migration 追加 → controller 修正 →
TS 型追記の三重作業が必要で、最後を忘れると runtime まで気付かない。

scramble + orval にしてからは、Laravel 側でモデル・コントローラを
変えたら `npm run gen:api` だけで TS 側に反映される。

## セットアップ済み構成

- **`backend/composer.json`**: `dedoc/scramble`
- **`backend/api.json`**: `php artisan scramble:export` の出力 (git 管理)
- **`frontend/orval/orval.config.ts`**: orval 設定
- **`frontend/orval/mutators/auth.ts`**: axios mutator
  (Bearer token を localStorage の `admin_token` / `user_token` から)
- **`frontend/orval/generated/`**: orval 生成物
  - `api.schemas.ts`: 全 schema の TS interface
  - `<tag>.ts`: tag (= controller) ごとの axios 関数 + 型
- **`frontend/package.json`**:
  - `npm run gen:api:spec`: artisan で api.json 再生成 → frontend 側へコピー
  - `npm run gen:api`: spec 再生成 + orval 走らせて TS 出力

## 日々の使い方

### Laravel 側を変えたとき

```bash
cd frontend
npm run gen:api
```

これで `backend/api.json` が最新化され、`frontend/orval/generated/` の
TS が自動更新される。orval は `clean: true` 設定なので古いファイルは
消える。git diff を見て、想定通りの差分か確認してコミット。

### フロントから API を叩くとき

手書きの `~/lib/api.ts` ではなく、生成された関数を使う：

```tsx
// ❌ Before (手書き)
import { api } from "~/lib/api";
import type { RelocateVoice } from "~/lib/types";
const data = await api.get<RelocateVoice[]>("/admin/relocate-voices");

// ✅ After (生成)
import { relocateVoiceIndex } from "../../../orval/generated/relocate-voice";
import type { RelocateVoice } from "../../../orval/generated/api.schemas";
const data = await relocateVoiceIndex();
```

import パスが深いのが少し冷たいので、もし頻出するなら
`tsconfig.paths` で `~api/*` のような alias を切る案あり (未着手)。

## Scramble がカバーする/しない範囲

### ◯ 自動推論できる

- Eloquent モデルの $casts / $fillable / nullable 設定
- Controller 戻り値の型 (`response()->json($model)`, `$model->fresh()`, etc.)
- Route パラメータ (`{relocateVoice}`)
- `$request->validate([...])` のキー (簡易、型は string になりがち)

### △ 弱い / 手当てが要る

- `JsonResource` / Resource Collection の整形 → 出ない or 緩い
- 独自 Transformer (例: `StoreApiTransformer`) で組み立てる payload → 出ない
- `response()->json([...生配列...])` の各キーは型が落ちる
- 複雑な JSONB ネスト (champagne_prices 内の per-bottle スキーマ等)

これらは **段階的に Form Request + Resource 化** することで Scramble
が正しく推論できる形になる。今は手書き types.ts と並行運用。

## マイグレーション戦略

`frontend/app/lib/types.ts` は **段階的に縮小** していく。コンサルティング
1 endpoint ずつ:

1. **Resource 化**: Controller の `response()->json($store)` を
   `new StoreResource($store)` に書き換える
2. **FormRequest 化**: インライン `validate([...])` を `StoreUpdateRequest`
   に切り出す
3. **gen:api 走らせる**: 新しい型が `generated/` に降ってくる
4. **消費者を切り替える**: `lib/api.ts` 経由を生成関数に
5. **types.ts から該当 interface を削除**

実例: `relocate-voices` は既に生成 client に移行済 (admin 画面)。
RelocateVoice は最小フィールドだったので Resource 化なしで綺麗に出た。

## 注意点・既知の制約

- **node コンテナの再起動が要る場合あり**: axios を新規 install したら
  Vite optimizeDeps の再計算が必要で、放置すると React の二重ロードで
  "useContext is null" になる。`rm -rf node_modules/.vite && docker
  compose restart node` で復活。
- **api.json は git 管理する派**: PR diff で API 変更を可視化できる、
  CI で `gen:api` の差分が無いか検証できる、等の利点。Profiit と同方針。
- **生成ファイルは編集禁止**: `generated/` 配下に手を入れると次の
  `gen:api` で消える。挙動カスタマイズは mutator に。

## 履歴

- 2026-05-26: Phase 1 (パイプライン構築) + Phase 2 (relocate-voices を
  サンプルケースとして admin 画面まで移行) 完了。残りの endpoint は順次。

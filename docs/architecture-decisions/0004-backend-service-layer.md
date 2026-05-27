# 0004. Backend service layer extraction

- Status: accepted
- Date: 2026-05-27

## Context

`refactor/debt-cleanup` ブランチの Phase 2 で、fat になっていたコントローラを
Service 層に分割した。

Before:
- `AiChatController.php`: 1963 行 (tool 宣言 + tool 実装 + Gemini 呼び出し +
  プロンプト構築 + 利用上限 + チャットロジック + SSE が 1 ファイルに同居)
- `Admin/StoreController.php`: 551 行 (CRUD + 画像 upload/delete +
  videos/staffPhotos 同期 + legacy bridge + validation rules + payload
  normalize)
- `Admin/FineTuningController.php`: 597 行

具体的な痛み:
- 同じプロンプトを `chat()` と `chatStream()` で別々に持っている (sync の
  `handleAgentMode` と stream の `streamAgentMode` がほぼコピペ)
- Gemini API のキー、エンドポイント URL、リトライ、HTTP ファサードが
  controller に直接埋まっており、Unit テストが書けず Feature テスト
  (Http::fake) しか使えなかった
- プロンプト 1 文字変えるのに 1963 行のファイルを開く必要があった
- 認可は手書き判定で controller に散在

## Decision

責務単位で App\Services\ 配下に Service クラスを切り出す。Controller は
HTTP 層 (validation、Resource 化、認可) だけ持つ薄いラッパーにする。

### App\Services\AiChat\

- `StoreToolRegistry`: Gemini Function Calling の tool 宣言 +
  search_stores / get_store_detail / get_areas / get_categories /
  get_industry_knowledge の実装
- `GeminiClient`: Gemini API への HTTP 呼び出し (model/endpoint 解決 +
  503 retry + エラーログ + 例外化)
- `UsageLimitGuard::check($user, $ip)`: 利用上限を array で返す
  (controller / stream 側で必要に応じて 429 JsonResponse に包む)
- `PromptBuilder`: buildOpenAi / buildCore / buildAgent system prompt +
  buildStoreContext + buildPipeDelimitedStoreData (Cache) +
  getToneDescription + buildGeminiHistory

### App\Services\Store\

- `StoreImageService`: uploadImage / deleteImage (images JSONB),
  syncVideos / syncStaffPhotos (relation 全置換), bridgeLegacyVideoUrl
  (旧 video_url 単一 -> videos[] 形に request 整形)

### 保留した Service 分割

- AiChatController の `handleAgentMode` / `handleFinetunedMode` /
  `streamAgentMode` 本体: モード別の縦軸ロジックは controller に残しても
  意味が明確で、Service 化しても得るものが少ない。controller は
  1963 -> 1045 行に圧縮済み (-47%)。
- FineTuningController: フロント (FineTuningQaPage) が `if (!res.success)`
  形を直接読んでいるため、shape 統一なしの Service 切り出しはハーフメジャー
  にしかならない。Phase 4 のデッドコード削除タイミングで「本当に使われている
  機能か」を含めて再評価する。

## Consequences

### Good
- Service 単位で Unit テスト可能になった (Phase 2-5 で 40 件追加)。
- プロンプト変更が PromptBuilder.php だけで済む。Gemini API リトライ挙動の
  調整が GeminiClient.php だけで済む。
- chat / chatStream で同じ tool / prompt / API ロジックを共有 (旧 copy-paste
  解消)。

### Bad
- DI コンストラクタが大きくなる (AiChatController で 4 service)。Laravel の
  service container が自動解決するので呼び出し側は影響なし。
- Service 内で `config('services.gemini.api_key')` を直接読んでいる箇所が
  残る (テスト時は config() override で差し替え可能)。完全な DI 化は
  別タスクで検討。

### Neutral
- Phase 2-4 で予定していた Policy 導入はスキップ。アプリ内に role 別差別化
  (super_admin と admin で禁止される操作) が無いため、Policy を入れても効く
  ものが現状無い。機能追加として別途扱う。

## References

- 関連 commit (refactor/debt-cleanup):
  - 609ea03 StoreToolRegistry
  - 13cdb14 GeminiClient + UsageLimitGuard
  - b37a266 PromptBuilder
  - bb124ea StoreImageService + UploadStoreImageRequest
  - a29981a Service unit tests (40 tests)
- tag: `refactor-phase-2`

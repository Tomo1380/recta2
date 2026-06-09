<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

/**
 * LINE OAuth 交換コードのセキュリティ検証。
 *
 * 交換コードは URL クエリに載るため Referer / 履歴経由で漏れうる。callback で
 * 発行した HttpOnly cookie のシークレットと一致しない限り実トークンを返さないこと
 * (= コード単体では引き換え不能) を保証する。
 */
class LineAuthExchangeTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        // api ミドルウェアグループは Cookie 暗号化を通さない (callback/exchange とも
        // 平文 cookie でやり取りする) ため、テストでも暗号化を無効化して実挙動に合わせる。
        $this->disableCookieEncryption();
        // postJson 等の JSON リクエストは withCredentials() を付けないと Cookie を
        // 送らない (Laravel の仕様)。実ブラウザは same-origin で Cookie を送るので合わせる。
        $this->withCredentials();
    }

    private function seedExchange(string $code, string $secret): User
    {
        $user = User::create([
            'line_user_id' => 'U-test-123',
            'line_display_name' => 'Tester',
        ]);
        $token = $user->createToken('line-auth', ['user'])->plainTextToken;
        Cache::put("line_oauth_exchange:{$code}", [
            'token' => $token,
            'secret' => $secret,
        ], 60);

        return $user;
    }

    public function test_exchange_succeeds_with_matching_cookie(): void
    {
        $this->seedExchange('code-abc', 'secret-xyz');

        $response = $this->withUnencryptedCookie('line_oauth_exchange', 'secret-xyz')
            ->postJson('/api/auth/line/exchange', ['code' => 'code-abc']);

        $response->assertStatus(200)
            ->assertJsonStructure(['token']);
    }

    public function test_exchange_rejected_without_cookie(): void
    {
        $this->seedExchange('code-abc', 'secret-xyz');

        // コードは正しいが cookie が無い (URL 経由でコードだけ盗んだ攻撃者を想定)。
        $response = $this->postJson('/api/auth/line/exchange', ['code' => 'code-abc']);

        $response->assertStatus(422);
    }

    public function test_exchange_rejected_with_wrong_cookie(): void
    {
        $this->seedExchange('code-abc', 'secret-xyz');

        $response = $this->withUnencryptedCookie('line_oauth_exchange', 'wrong-secret')
            ->postJson('/api/auth/line/exchange', ['code' => 'code-abc']);

        $response->assertStatus(422);
    }

    public function test_exchange_code_is_single_use(): void
    {
        $this->seedExchange('code-abc', 'secret-xyz');

        $this->withUnencryptedCookie('line_oauth_exchange', 'secret-xyz')
            ->postJson('/api/auth/line/exchange', ['code' => 'code-abc'])
            ->assertStatus(200);

        // 2 回目は無効 (pull 済み)。
        $this->withUnencryptedCookie('line_oauth_exchange', 'secret-xyz')
            ->postJson('/api/auth/line/exchange', ['code' => 'code-abc'])
            ->assertStatus(422);
    }
}

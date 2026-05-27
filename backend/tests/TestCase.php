<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Routing\Middleware\ThrottleRequests;

abstract class TestCase extends BaseTestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        // throttle:30,1 / throttle:10,10 等のミドルウェアがテストで
        // 429 を返さないよう、テスト中だけ ThrottleRequests を bypass する。
        // 本番ルートの throttle 設定や制限値は変えない。
        $this->withoutMiddleware(ThrottleRequests::class);
    }
}

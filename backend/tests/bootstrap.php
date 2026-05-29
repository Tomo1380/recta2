<?php

require __DIR__ . '/../vendor/autoload.php';

/*
 * テストを「専用の Postgres テストDB (recta2_test)」に固定する。
 *
 * 背景: docker-compose が laravel コンテナに DB_CONNECTION=pgsql /
 * DB_DATABASE=recta2 を環境変数で渡し、それが $_SERVER に入る。Laravel 11 の
 * env() は $_SERVER / $_ENV を読むため、phpunit.xml の <env force="true">
 * (putenv 系) では上書きできず、RefreshDatabase が開発DB recta2 を
 * migrate:fresh で破壊してしまう (2026-05-29 に実際に発生)。
 *
 * 対策方針:
 *  - 接続は本番と同じ pgsql のまま（sqlite だと JSONB 等の方言差でテストが
 *    実態と乖離する）。
 *  - DB だけ recta2_test に切り替える。host/user/password は container env を
 *    そのまま使う。recta2_test は事前に CREATE DATABASE しておくこと。
 *  - Laravel がブートする前に $_SERVER / $_ENV / putenv を全て固定し、テストが
 *    開発DB recta2 へ接続することを物理的に不可能にする。
 */
$forced = [
    'DB_CONNECTION' => 'pgsql',
    'DB_DATABASE' => 'recta2_test',
];

foreach ($forced as $key => $value) {
    putenv("{$key}={$value}");
    $_ENV[$key] = $value;
    $_SERVER[$key] = $value;
}

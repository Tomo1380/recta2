<?php

namespace App\Http\Controllers;

/**
 * @OA\Info(
 *     title="Recta2 Admin API",
 *     version="1.0.0",
 *     description="Recta2 ナイトワーク求人マッチングプラットフォーム 管理画面API"
 * )
 * @OA\Server(
 *     url="/api",
 *     description="API Server"
 * )
 * @OA\SecurityScheme(
 *     securityScheme="bearerAuth",
 *     type="http",
 *     scheme="bearer",
 *     bearerFormat="Sanctum Token"
 * )
 */
abstract class Controller
{
    //
}

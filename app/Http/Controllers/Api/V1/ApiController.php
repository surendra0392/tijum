<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;

abstract class ApiController extends Controller
{
    /**
     * @param  array<string, mixed>  $meta
     */
    protected function success(mixed $data = [], string $message = 'Success', int $status = 200, array $meta = []): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => $data,
            'message' => $message,
            'meta' => array_merge([
                'request_id' => request()->header('X-Request-ID') ?? (string) str()->uuid(),
                'timestamp' => now()->toIso8601String(),
            ], $meta),
        ], $status);
    }

    /**
     * @param  array<string, mixed>  $errors
     */
    protected function error(string $message, string $errorCode = 'ERROR', int $status = 400, array $errors = []): JsonResponse
    {
        return response()->json([
            'success' => false,
            'message' => $message,
            'error_code' => $errorCode,
            'errors' => $errors,
            'meta' => [
                'request_id' => request()->header('X-Request-ID') ?? (string) str()->uuid(),
                'timestamp' => now()->toIso8601String(),
            ],
        ], $status);
    }
}

<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Models\Owner;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureOwnerToken
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $owner = $request->user();

        if (! $owner instanceof Owner) {
            return response()->json([
                'message' => 'Unauthorized account domain. A valid Partner/Owner token is required.',
                'error' => 'INVALID_ACCOUNT_TYPE',
            ], 403);
        }

        if (! $owner->canSignIn()) {
            return response()->json([
                'message' => $owner->status->accessDeniedMessage(),
                'status' => $owner->status->value,
                'error' => 'ACCOUNT_NOT_ACTIVE',
            ], 403);
        }

        return $next($request);
    }
}

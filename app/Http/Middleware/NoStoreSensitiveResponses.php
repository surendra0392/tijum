<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Prevent browser, proxy, or service worker caching on authenticated, checkout,
 * payment, portal, and account security responses.
 */
class NoStoreSensitiveResponses
{
    public function handle(Request $request, Closure $next): Response
    {
        /** @var Response $response */
        $response = $next($request);

        if ($this->isSensitiveRequest($request)) {
            $response->headers->set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0, private');
            $response->headers->set('Pragma', 'no-cache');
            $response->headers->set('Expires', '0');
        }

        return $response;
    }

    private function isSensitiveRequest(Request $request): bool
    {
        if (
            $request->user('web') !== null
            || $request->user('owner') !== null
            || $request->user('admin') !== null
        ) {
            return true;
        }

        return $request->is(
            'login',
            'register',
            'logout',
            'forgot-password',
            'reset-password*',
            'two-factor-challenge*',
            'email/verify*',
            'user/*',
            'dashboard',
            'settings*',
            'notifications*',
            'support*',
            'my-support*',
            'rewards*',
            'wishlist*',
            'reservations*',
            'payments*',
            'checkout*',
            'owner',
            'owner/*',
            'admin',
            'admin/*',
            'api/v1/customer/*',
            'api/v1/owner/*'
        );
    }
}

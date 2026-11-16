<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Models\SeoRedirect;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class HandleSeoRedirects
{
    public function handle(Request $request, Closure $next): Response
    {
        // Only inspect GET or HEAD requests
        if (! $request->isMethodSafe()) {
            return $next($request);
        }

        $path = '/'.ltrim($request->path(), '/');

        /** @var SeoRedirect|null $redirect */
        $redirect = SeoRedirect::cachedActiveForPath($path);

        if ($redirect !== null) {
            $destination = $redirect->destination_url;

            // Prevent redirect loop
            if ($destination === $path || $destination === $request->fullUrl()) {
                return $next($request);
            }

            // Prevent open redirect to arbitrary untrusted external host
            if (str_starts_with($destination, 'http://') || str_starts_with($destination, 'https://')) {
                $appHost = parse_url(config('app.url'), PHP_URL_HOST);
                $destHost = parse_url($destination, PHP_URL_HOST);
                if ($appHost && $destHost && ! hash_equals($appHost, $destHost)) {
                    return $next($request);
                }
            }

            // Increment hits count atomically with extra columns in a single query
            $redirect->increment('hits_count', 1, ['last_hit_at' => now()]);

            return redirect($destination, $redirect->http_status);
        }

        return $next($request);
    }
}

<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Models\Admin;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureAdminTwoFactorVerified
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $admin = $request->user('admin');

        if (! $admin instanceof Admin) {
            return redirect()->route('admin.login');
        }

        if (! $admin->hasTwoFactorEnabled()) {
            if ($request->routeIs('admin.two-factor.*', 'admin.logout')) {
                return $next($request);
            }

            if ($request->expectsJson() && ! $request->header('X-Inertia')) {
                abort(403, 'Two-factor authentication enrollment is required before accessing administrator routes.');
            }

            return redirect()
                ->route('admin.two-factor.setup')
                ->with('status', 'Please complete TOTP two-factor authentication setup before accessing the TIJUM admin portal.');
        }

        return $next($request);
    }
}

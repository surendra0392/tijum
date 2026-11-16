<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Models\Admin;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureAdminRole
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $admin = $request->user('admin');

        if (! $admin instanceof Admin || ! $admin->isActive()) {
            abort(403, 'Administrator access denied.');
        }

        if ($admin->role->isSuperAdmin()) {
            return $next($request);
        }

        if ($roles === [] || ! in_array($admin->role->value, $roles, true)) {
            abort(403, 'You do not have permission to access this administrator resource.');
        }

        return $next($request);
    }
}

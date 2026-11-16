<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Models\Admin;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class EnsureAdminActive
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

        if (! $admin->isActive()) {
            Auth::guard('admin')->logout();
            $request->session()->regenerate(true);

            return redirect()
                ->route('admin.login')
                ->withErrors([
                    'email' => 'Your administrator account is deactivated. Contact a Super Admin.',
                ]);
        }

        return $next($request);
    }
}

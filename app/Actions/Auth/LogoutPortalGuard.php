<?php

declare(strict_types=1);

namespace App\Actions\Auth;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

final class LogoutPortalGuard
{
    /**
     * Log out only the specified authentication guard without invalidating sibling portal guards.
     */
    public function execute(Request $request, string $guard): void
    {
        Auth::guard($guard)->logout();

        if ($guard === 'admin' && $request->hasSession()) {
            $request->session()->forget('admin_login');
        }

        if ($request->hasSession()) {
            $request->session()->regenerate(true);
        }
    }
}

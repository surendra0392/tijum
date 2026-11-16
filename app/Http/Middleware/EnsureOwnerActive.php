<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Models\Owner;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class EnsureOwnerActive
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $owner = $request->user('owner');

        if (! $owner instanceof Owner) {
            return redirect()->route('owner.login');
        }

        if (! $owner->canSignIn()) {
            $message = $owner->status->accessDeniedMessage();

            Auth::guard('owner')->logout();
            $request->session()->regenerate(true);

            return redirect()
                ->route('owner.login')
                ->withErrors(['email' => $message]);
        }

        return $next($request);
    }
}

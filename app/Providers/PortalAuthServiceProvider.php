<?php

declare(strict_types=1);

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Str;

class PortalAuthServiceProvider extends ServiceProvider
{
    /**
     * Bootstrap portal authentication rate limiters and configuration.
     */
    public function boot(): void
    {
        RateLimiter::for('owner-login', function (Request $request): Limit {
            $email = Str::transliterate(Str::lower($request->string('email')->toString()));

            return Limit::perMinute(5)->by($email.'|'.$request->ip());
        });

        RateLimiter::for('owner-register', function (Request $request): Limit {
            return Limit::perMinute(10)->by((string) $request->ip());
        });

        RateLimiter::for('owner-verification', function (Request $request): Limit {
            $key = $request->user('owner')?->getAuthIdentifier() ?? $request->ip();

            return Limit::perMinute(6)->by('owner-verify|'.$key);
        });

        RateLimiter::for('owner-password-reset', function (Request $request): Limit {
            $email = Str::transliterate(Str::lower($request->string('email')->toString()));

            return Limit::perMinute(5)->by('owner-reset|'.$email.'|'.$request->ip());
        });

        RateLimiter::for('admin-login', function (Request $request): Limit {
            $email = Str::transliterate(Str::lower($request->string('email')->toString()));

            return Limit::perMinute(5)->by('admin-login|'.$email.'|'.$request->ip());
        });

        RateLimiter::for('admin-two-factor', function (Request $request): Limit {
            $identifier = $request->session()->get('admin_login.id')
                ?? $request->user('admin')?->getAuthIdentifier()
                ?? $request->ip();

            return Limit::perMinute(5)->by('admin-2fa|'.$identifier.'|'.$request->ip());
        });

        RateLimiter::for('admin-password-reset', function (Request $request): Limit {
            $email = Str::transliterate(Str::lower($request->string('email')->toString()));

            return Limit::perMinute(5)->by('admin-reset|'.$email.'|'.$request->ip());
        });
    }
}

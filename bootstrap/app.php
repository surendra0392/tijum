<?php

use App\Http\Middleware\EnsureAdminActive;
use App\Http\Middleware\EnsureAdminRole;
use App\Http\Middleware\EnsureAdminTwoFactorVerified;
use App\Http\Middleware\EnsureCustomerToken;
use App\Http\Middleware\EnsureOwnerActive;
use App\Http\Middleware\EnsureOwnerToken;
use App\Http\Middleware\HandleAppearance;
use App\Http\Middleware\HandleInertiaRequests;
use App\Http\Middleware\HandleSeoRedirects;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: [
            __DIR__.'/../routes/web.php',
            __DIR__.'/../routes/owner.php',
            __DIR__.'/../routes/admin.php',
        ],
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->encryptCookies(except: ['appearance', 'sidebar_state']);

        $middleware->validateCsrfTokens(except: [
            'webhooks/razorpay',
            'webhooks/whatsapp',
            'webhooks/sms',
            'unsubscribe/*',
            'api/marketing/track',
        ]);

        $middleware->alias([
            'owner.active' => EnsureOwnerActive::class,
            'admin.active' => EnsureAdminActive::class,
            'admin.two-factor' => EnsureAdminTwoFactorVerified::class,
            'admin.role' => EnsureAdminRole::class,
            'auth.customer' => EnsureCustomerToken::class,
            'auth.owner' => EnsureOwnerToken::class,
        ]);

        $middleware->redirectGuestsTo(function (Request $request): ?string {
            if ($request->expectsJson() && ! $request->header('X-Inertia')) {
                return null;
            }

            if ($request->is('owner', 'owner/*') || $request->routeIs('owner.*')) {
                return route('owner.login');
            }

            if ($request->is('admin', 'admin/*') || $request->routeIs('admin.*')) {
                return route('admin.login');
            }

            return route('login');
        });

        $middleware->redirectUsersTo(function (Request $request): string {
            if ($request->is('owner', 'owner/*') || $request->routeIs('owner.*')) {
                return route('owner.dashboard');
            }

            if ($request->is('admin', 'admin/*') || $request->routeIs('admin.*')) {
                return route('admin.dashboard');
            }

            return route('dashboard');
        });

        $middleware->throttleApi();

        $middleware->append(HandleSeoRedirects::class);

        $middleware->web(append: [
            HandleAppearance::class,
            HandleInertiaRequests::class,
            AddLinkHeadersForPreloadedAssets::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );
    })->create();

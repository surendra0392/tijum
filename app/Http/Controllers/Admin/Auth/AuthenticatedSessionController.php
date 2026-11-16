<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin\Auth;

use App\Actions\Admin\Auth\AttemptAdminLogin;
use App\Actions\Auth\LogoutPortalGuard;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\Auth\LoginRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Inertia\Response;

class AuthenticatedSessionController extends Controller
{
    public function create(Request $request): Response
    {
        return Inertia::render('admin/auth/login', [
            'canResetPassword' => Route::has('admin.password.request'),
            'status' => $request->session()->get('status'),
        ]);
    }

    public function store(
        LoginRequest $request,
        AttemptAdminLogin $attemptAdminLogin,
    ): RedirectResponse {
        $admin = $attemptAdminLogin->execute(
            $request->string('email')->toString(),
            $request->string('password')->toString(),
        );

        $remember = $request->boolean('remember');

        if ($admin->hasTwoFactorEnabled()) {
            $request->session()->regenerate(true);
            $request->session()->put('admin_login', [
                'id' => $admin->id,
                'remember' => $remember,
            ]);

            return redirect()->route('admin.two-factor.challenge');
        }

        Auth::guard('admin')->login($admin, $remember);
        $request->session()->regenerate(true);

        return redirect()
            ->route('admin.two-factor.setup')
            ->with('status', 'Please enroll and confirm TOTP two-factor authentication before accessing the admin portal.');
    }

    public function destroy(Request $request, LogoutPortalGuard $logoutPortalGuard): RedirectResponse
    {
        $logoutPortalGuard->execute($request, 'admin');

        return redirect()->route('admin.login');
    }
}

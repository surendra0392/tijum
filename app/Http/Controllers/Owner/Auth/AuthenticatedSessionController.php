<?php

declare(strict_types=1);

namespace App\Http\Controllers\Owner\Auth;

use App\Actions\Auth\LogoutPortalGuard;
use App\Actions\Auth\RedirectToPortalIntended;
use App\Actions\Owner\Auth\AttemptOwnerLogin;
use App\Http\Controllers\Controller;
use App\Http\Requests\Owner\Auth\LoginRequest;
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
        return Inertia::render('owner/auth/login', [
            'canResetPassword' => Route::has('owner.password.request'),
            'status' => $request->session()->get('status'),
        ]);
    }

    public function store(
        LoginRequest $request,
        AttemptOwnerLogin $attemptOwnerLogin,
        RedirectToPortalIntended $redirectToPortalIntended,
    ): RedirectResponse {
        $owner = $attemptOwnerLogin->execute(
            $request->string('email')->toString(),
            $request->string('password')->toString(),
        );

        Auth::guard('owner')->login($owner, $request->boolean('remember'));
        $request->session()->regenerate(true);

        return $redirectToPortalIntended->execute($request, '/owner', 'owner.dashboard');
    }

    public function destroy(Request $request, LogoutPortalGuard $logoutPortalGuard): RedirectResponse
    {
        $logoutPortalGuard->execute($request, 'owner');

        return redirect()->route('owner.login');
    }
}

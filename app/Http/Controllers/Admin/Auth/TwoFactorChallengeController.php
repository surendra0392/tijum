<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin\Auth;

use App\Actions\Admin\Security\ManageAdminTwoFactor;
use App\Actions\Auth\RedirectToPortalIntended;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\Auth\TwoFactorChallengeRequest;
use App\Models\Admin;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class TwoFactorChallengeController extends Controller
{
    public function create(Request $request): RedirectResponse|Response
    {
        if (! $request->session()->has('admin_login.id')) {
            return redirect()->route('admin.login');
        }

        return Inertia::render('admin/auth/two-factor-challenge', [
            'status' => $request->session()->get('status'),
        ]);
    }

    public function store(
        TwoFactorChallengeRequest $request,
        ManageAdminTwoFactor $manageTwoFactor,
        RedirectToPortalIntended $redirectToPortalIntended,
    ): RedirectResponse {
        $adminId = $request->session()->get('admin_login.id');

        if (! is_int($adminId) && ! is_string($adminId)) {
            return redirect()->route('admin.login');
        }

        $admin = Admin::query()->find($adminId);

        if (! $admin instanceof Admin || ! $admin->isActive() || ! $admin->hasTwoFactorEnabled()) {
            $request->session()->forget('admin_login');

            return redirect()
                ->route('admin.login')
                ->withErrors(['email' => 'Administrator challenge session expired or account is unavailable.']);
        }

        $recoveryCode = $request->string('recovery_code')->toString();
        $code = $request->string('code')->toString();

        if (! $manageTwoFactor->verifyChallenge($admin, $code, $recoveryCode)) {
            $errorField = trim($recoveryCode) !== '' ? 'recovery_code' : 'code';

            throw ValidationException::withMessages([
                $errorField => $errorField === 'recovery_code'
                    ? 'The provided recovery code is invalid or has already been used.'
                    : 'The provided two-factor authentication code is invalid.',
            ]);
        }

        $remember = (bool) $request->session()->pull('admin_login.remember', false);
        $request->session()->forget('admin_login');

        Auth::guard('admin')->login($admin, $remember);
        $request->session()->regenerate(true);

        return $redirectToPortalIntended->execute($request, '/admin', 'admin.dashboard');
    }
}

<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin\Security;

use App\Actions\Admin\Security\ManageAdminTwoFactor;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\Security\ConfirmTwoFactorRequest;
use App\Models\Admin;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class TwoFactorSetupController extends Controller
{
    public function show(Request $request, ManageAdminTwoFactor $manageTwoFactor): Response
    {
        /** @var Admin $admin */
        $admin = $request->user('admin');
        $twoFactorEnabled = $admin->hasTwoFactorEnabled();
        $hasSecret = is_string($admin->two_factor_secret) && $admin->two_factor_secret !== '';
        $pendingEnrollment = ! $twoFactorEnabled && $hasSecret;

        return Inertia::render('admin/security/two-factor', [
            'twoFactorEnabled' => $twoFactorEnabled,
            'pendingEnrollment' => $pendingEnrollment,
            'qrCodeSvg' => $pendingEnrollment ? $manageTwoFactor->qrCodeSvg($admin) : null,
            'setupKey' => $pendingEnrollment ? $admin->two_factor_secret : null,
            'recoveryCodes' => $request->session()->get('recoveryCodes'),
            'recoveryCodesRemaining' => count($admin->recoveryCodes()),
            'status' => $request->session()->get('status'),
        ]);
    }

    public function enable(Request $request, ManageAdminTwoFactor $manageTwoFactor): RedirectResponse
    {
        /** @var Admin $admin */
        $admin = $request->user('admin');

        if ($admin->hasTwoFactorEnabled()) {
            return redirect()->route('admin.two-factor.setup');
        }

        $manageTwoFactor->beginEnrollment($admin);

        return redirect()
            ->route('admin.two-factor.setup')
            ->with('status', 'two-factor-enrollment-started');
    }

    public function confirm(
        ConfirmTwoFactorRequest $request,
        ManageAdminTwoFactor $manageTwoFactor,
    ): RedirectResponse {
        /** @var Admin $admin */
        $admin = $request->user('admin');

        $recoveryCodes = $manageTwoFactor->confirmEnrollment(
            $admin,
            $request->string('code')->toString(),
        );

        return redirect()
            ->route('admin.two-factor.setup')
            ->with('recoveryCodes', $recoveryCodes)
            ->with('status', 'two-factor-confirmed');
    }

    public function regenerateRecoveryCodes(
        Request $request,
        ManageAdminTwoFactor $manageTwoFactor,
    ): RedirectResponse {
        /** @var Admin $admin */
        $admin = $request->user('admin');

        if (! $admin->hasTwoFactorEnabled()) {
            return redirect()->route('admin.two-factor.setup');
        }

        $recoveryCodes = $manageTwoFactor->regenerateRecoveryCodes($admin);

        return redirect()
            ->route('admin.two-factor.setup')
            ->with('recoveryCodes', $recoveryCodes)
            ->with('status', 'recovery-codes-regenerated');
    }
}

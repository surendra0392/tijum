<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\PasswordUpdateRequest;
use App\Http\Requests\Settings\TwoFactorAuthenticationRequest;
use App\Models\User;
use App\Services\Notifications\NotificationDispatcher;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;
use Inertia\Response;
use Laravel\Fortify\Features;

class SecurityController extends Controller
{
    /**
     * Show the user's security settings page.
     */
    public function edit(TwoFactorAuthenticationRequest $request): Response
    {
        $user = $request->user('web');

        if (! $user instanceof User) {
            abort(403);
        }

        $props = [
            'canManageTwoFactor' => Features::canManageTwoFactorAuthentication(),
            'canManagePasskeys' => Features::canManagePasskeys(),
            'passkeys' => Features::canManagePasskeys()
                ? $user
                    ->passkeys()
                    ->select(['id', 'name', 'credential', 'created_at', 'last_used_at'])
                    ->latest()
                    ->get()
                    ->map(fn ($passkey) => [
                        'id' => $passkey->id,
                        'name' => $passkey->name,
                        'authenticator' => $passkey->authenticator,
                        'created_at_diff' => $passkey->created_at->diffForHumans(),
                        'last_used_at_diff' => $passkey->last_used_at?->diffForHumans(),
                    ])
                    ->values()
                    ->all()
                : [],
            'passwordRules' => Password::defaults()->toPasswordRulesString(),
            'passwordConfigured' => $user->password !== '',
        ];

        if (Features::canManageTwoFactorAuthentication()) {
            $request->ensureStateIsValid();

            $props['twoFactorEnabled'] = $user->hasEnabledTwoFactorAuthentication();
            $props['twoFactorConfirmed'] = $user->two_factor_confirmed_at !== null;
            $props['requiresConfirmation'] = Features::optionEnabled(Features::twoFactorAuthentication(), 'confirm');
        }

        return Inertia::render('settings/security', $props);
    }

    /**
     * Update the user's password.
     */
    public function update(PasswordUpdateRequest $request): RedirectResponse
    {
        $user = $request->user('web');

        if (! $user instanceof User) {
            abort(403);
        }

        $user->update([
            'password' => $request->password,
        ]);

        try {
            app(NotificationDispatcher::class)->dispatch(
                eventType: 'auth.security_alert',
                recipients: $user,
                variables: [
                    'customer_name' => $user->name,
                    'reason' => 'Your TIJUM account password was updated.',
                    'created_at' => now()->setTimezone('Asia/Kolkata')->format('d M Y, H:i').' IST',
                    'action_url' => url('/settings/security'),
                ],
                related: $user,
                relatedReference: 'SEC-PWD-'.$user->id,
                idempotencySeed: 'auth_pwd_changed_'.$user->id.'_'.now()->timestamp
            );
        } catch (\Throwable $e) {
            Log::warning('Failed to dispatch auth.security_alert notification: '.$e->getMessage(), [
                'user_id' => $user->id,
            ]);
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Password updated.')]);

        return back();
    }
}

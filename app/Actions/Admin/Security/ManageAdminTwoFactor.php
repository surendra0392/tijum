<?php

declare(strict_types=1);

namespace App\Actions\Admin\Security;

use App\Models\Admin;
use App\Services\Notifications\NotificationDispatcher;
use BaconQrCode\Renderer\Image\SvgImageBackEnd;
use BaconQrCode\Renderer\ImageRenderer;
use BaconQrCode\Renderer\RendererStyle\RendererStyle;
use BaconQrCode\Writer;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;
use Laravel\Fortify\Contracts\TwoFactorAuthenticationProvider;
use Laravel\Fortify\RecoveryCode;

final class ManageAdminTwoFactor
{
    public function __construct(
        private TwoFactorAuthenticationProvider $provider,
    ) {}

    public function beginEnrollment(Admin $admin): void
    {
        $admin->forceFill([
            'two_factor_secret' => $this->provider->generateSecretKey(),
            'two_factor_recovery_codes' => $this->generateRecoveryCodeList(),
            'two_factor_confirmed_at' => null,
        ])->save();
    }

    /**
     * Confirm pending TOTP enrollment using an authenticator code and return recovery codes.
     *
     * @return list<string>
     *
     * @throws ValidationException
     */
    public function confirmEnrollment(Admin $admin, string $code): array
    {
        $secret = $admin->two_factor_secret;

        if (! is_string($secret) || $secret === '') {
            throw ValidationException::withMessages([
                'code' => 'Two-factor setup has not been started yet.',
            ]);
        }

        if (! $this->provider->verify($secret, trim($code))) {
            throw ValidationException::withMessages([
                'code' => 'The provided two-factor authentication code could not be verified.',
            ]);
        }

        $codes = $admin->recoveryCodes();

        if ($codes === []) {
            $codes = $this->generateRecoveryCodeList();
        }

        $admin->forceFill([
            'two_factor_recovery_codes' => $codes,
            'two_factor_confirmed_at' => now(),
        ])->save();

        try {
            app(NotificationDispatcher::class)->dispatch(
                eventType: 'admin.security_alert',
                recipients: $admin,
                variables: [
                    'reason' => 'Two-factor authentication (TOTP) was enabled on your administrator account.',
                    'admin_reference' => $admin->email,
                    'created_at' => now()->setTimezone('Asia/Kolkata')->format('d M Y, H:i').' IST',
                    'severity' => 'Medium',
                    'action_url' => url('/admin'),
                ],
                related: $admin,
                relatedReference: 'ADM-2FA-'.$admin->id,
                idempotencySeed: 'admin_2fa_enabled_'.$admin->id.'_'.now()->timestamp
            );
        } catch (\Throwable $e) {
            Log::warning('Failed to dispatch admin.security_alert notification: '.$e->getMessage());
        }

        return $codes;
    }

    public function verifyChallenge(Admin $admin, ?string $code, ?string $recoveryCode): bool
    {
        $trimmedRecovery = is_string($recoveryCode) ? trim($recoveryCode) : '';

        if ($trimmedRecovery !== '') {
            return $admin->consumeRecoveryCode($trimmedRecovery);
        }

        $trimmedCode = is_string($code) ? trim($code) : '';
        $secret = $admin->two_factor_secret;

        if ($trimmedCode === '' || ! is_string($secret) || $secret === '') {
            return false;
        }

        return $this->provider->verify($secret, $trimmedCode);
    }

    /**
     * @return list<string>
     */
    public function regenerateRecoveryCodes(Admin $admin): array
    {
        $codes = $this->generateRecoveryCodeList();

        $admin->forceFill([
            'two_factor_recovery_codes' => $codes,
        ])->save();

        try {
            app(NotificationDispatcher::class)->dispatch(
                eventType: 'admin.security_alert',
                recipients: $admin,
                variables: [
                    'reason' => 'Two-factor recovery codes were regenerated for your administrator account.',
                    'admin_reference' => $admin->email,
                    'created_at' => now()->setTimezone('Asia/Kolkata')->format('d M Y, H:i').' IST',
                    'severity' => 'High',
                    'action_url' => url('/admin'),
                ],
                related: $admin,
                relatedReference: 'ADM-2FA-RC-'.$admin->id,
                idempotencySeed: 'admin_2fa_recovery_'.$admin->id.'_'.now()->timestamp
            );
        } catch (\Throwable $e) {
            Log::warning('Failed to dispatch admin.security_alert notification: '.$e->getMessage());
        }

        return $codes;
    }

    public function qrCodeSvg(Admin $admin): string
    {
        $secret = $admin->two_factor_secret;

        if (! is_string($secret) || $secret === '') {
            return '';
        }

        $issuer = (string) config('app.name', 'TIJUM').' Admin';
        $qrUrl = $this->provider->qrCodeUrl($issuer, $admin->email, $secret);

        $svg = (new Writer(
            new ImageRenderer(
                new RendererStyle(192, 1),
                new SvgImageBackEnd,
            ),
        ))->writeString($qrUrl);

        return trim(substr($svg, (int) strpos($svg, "\n") + 1));
    }

    /**
     * @return list<string>
     */
    private function generateRecoveryCodeList(): array
    {
        return array_values(
            Collection::times(
                8,
                static fn (): string => RecoveryCode::generate(),
            )->all(),
        );
    }
}

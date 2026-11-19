<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Auth;

use App\Http\Controllers\Api\V1\ApiController;
use App\Models\Owner;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;

class ForgotPasswordController extends ApiController
{
    /**
     * Send customer password reset email.
     */
    public function customerForgotPassword(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'string'],
        ]);

        $input = trim((string) $validated['email']);
        $targetEmail = null;

        if (filter_var($input, FILTER_VALIDATE_EMAIL)) {
            $targetEmail = Str::lower($input);
        } else {
            $phoneDigits = preg_replace('/[^0-9]/', '', $input);
            if (is_string($phoneDigits) && strlen($phoneDigits) === 12 && str_starts_with($phoneDigits, '91')) {
                $phoneDigits = substr($phoneDigits, 2);
            }

            $user = User::query()
                ->where('email', Str::lower($input))
                ->orWhere(function ($query) use ($input, $phoneDigits): void {
                    $query->where('phone', $input);
                    if (is_string($phoneDigits) && $phoneDigits !== '') {
                        $query->orWhere('phone', $phoneDigits);
                    }
                })
                ->first();

            if ($user instanceof User && $user->email) {
                $targetEmail = $user->email;
            }
        }

        if ($targetEmail !== null) {
            Password::broker('users')->sendResetLink([
                'email' => $targetEmail,
            ]);
        }

        return $this->success(
            ['sent' => true],
            'If an account exists for this email address, we have sent a password reset link.'
        );
    }

    /**
     * Send owner/partner password reset email.
     */
    public function ownerForgotPassword(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'string'],
        ]);

        $input = trim((string) $validated['email']);
        $targetEmail = null;

        if (filter_var($input, FILTER_VALIDATE_EMAIL)) {
            $targetEmail = Str::lower($input);
        } else {
            $phoneDigits = preg_replace('/[^0-9]/', '', $input);
            if (is_string($phoneDigits) && strlen($phoneDigits) === 12 && str_starts_with($phoneDigits, '91')) {
                $phoneDigits = substr($phoneDigits, 2);
            }

            $owner = Owner::query()
                ->where('email', Str::lower($input))
                ->orWhere(function ($query) use ($input, $phoneDigits): void {
                    $query->where('phone', $input);
                    if (is_string($phoneDigits) && $phoneDigits !== '') {
                        $query->orWhere('phone', $phoneDigits);
                    }
                })
                ->first();

            if ($owner instanceof Owner && $owner->email) {
                $targetEmail = $owner->email;
            }
        }

        if ($targetEmail !== null) {
            Password::broker('owners')->sendResetLink([
                'email' => $targetEmail,
            ]);
        }

        return $this->success(
            ['sent' => true],
            'If a partner account exists for this email address, we have sent a password reset link.'
        );
    }
}

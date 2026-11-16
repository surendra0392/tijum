<?php

declare(strict_types=1);

namespace App\Actions\Owner\Auth;

use App\Models\Owner;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

final class AttemptOwnerLogin
{
    /**
     * Validate owner credentials and account eligibility for login by email or phone.
     *
     * @throws ValidationException
     */
    public function execute(string $email, string $password): Owner
    {
        $normalizedLogin = trim($email);
        $normalizedEmail = Str::lower($normalizedLogin);

        $phoneDigits = preg_replace('/[^0-9]/', '', $normalizedLogin);
        if (strlen($phoneDigits) === 12 && str_starts_with($phoneDigits, '91')) {
            $phoneDigits = substr($phoneDigits, 2);
        }

        $owner = Owner::query()
            ->where('email', $normalizedEmail)
            ->orWhere(function ($q) use ($normalizedLogin, $phoneDigits): void {
                $q->where('phone', $normalizedLogin);
                if ($phoneDigits !== '') {
                    $q->orWhere('phone', $phoneDigits);
                }
            })
            ->first();

        if (! $owner instanceof Owner || ! Hash::check($password, $owner->password)) {
            throw ValidationException::withMessages([
                'email' => __('auth.failed'),
            ]);
        }

        if (! $owner->canSignIn()) {
            throw ValidationException::withMessages([
                'email' => $owner->status->accessDeniedMessage(),
            ]);
        }

        return $owner;
    }
}

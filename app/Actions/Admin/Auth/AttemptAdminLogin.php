<?php

declare(strict_types=1);

namespace App\Actions\Admin\Auth;

use App\Models\Admin;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

final class AttemptAdminLogin
{
    /**
     * Validate administrator credentials and active account status against the admins table.
     *
     * @throws ValidationException
     */
    public function execute(string $email, string $password): Admin
    {
        $normalizedEmail = Str::lower(trim($email));

        $admin = Admin::query()
            ->where('email', $normalizedEmail)
            ->first();

        if (! $admin instanceof Admin || ! Hash::check($password, $admin->password)) {
            throw ValidationException::withMessages([
                'email' => __('auth.failed'),
            ]);
        }

        if (! $admin->isActive()) {
            throw ValidationException::withMessages([
                'email' => 'Your administrator account is deactivated. Contact a Super Admin.',
            ]);
        }

        return $admin;
    }
}

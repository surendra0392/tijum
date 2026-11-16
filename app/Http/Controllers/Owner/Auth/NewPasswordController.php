<?php

declare(strict_types=1);

namespace App\Http\Controllers\Owner\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Owner\Auth\ResetPasswordRequest;
use App\Models\Owner;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class NewPasswordController extends Controller
{
    public function create(Request $request, string $token): Response
    {
        return Inertia::render('owner/auth/reset-password', [
            'email' => $request->string('email')->toString(),
            'token' => $token,
        ]);
    }

    public function store(ResetPasswordRequest $request): RedirectResponse
    {
        $credentials = [
            'token' => $request->string('token')->toString(),
            'email' => Str::lower(trim($request->string('email')->toString())),
            'password' => $request->string('password')->toString(),
            'password_confirmation' => $request->string('password_confirmation')->toString(),
        ];

        $status = Password::broker('owners')->reset(
            $credentials,
            static function (Owner $owner, string $password): void {
                $owner->forceFill([
                    'password' => $password,
                    'remember_token' => Str::random(60),
                ])->save();

                event(new PasswordReset($owner));
            },
        );

        if ($status === Password::PASSWORD_RESET) {
            return redirect()
                ->route('owner.login')
                ->with('status', __($status));
        }

        throw ValidationException::withMessages([
            'email' => [__($status)],
        ]);
    }
}

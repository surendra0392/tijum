<?php

declare(strict_types=1);

namespace App\Http\Controllers\Owner\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Owner\Auth\ForgotPasswordRequest;
use App\Models\Owner;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class PasswordResetLinkController extends Controller
{
    public function create(Request $request): Response
    {
        return Inertia::render('owner/auth/forgot-password', [
            'status' => $request->session()->get('status'),
        ]);
    }

    public function store(ForgotPasswordRequest $request): RedirectResponse
    {
        $input = trim((string) $request->input('email'));
        $targetEmail = null;

        if (filter_var($input, FILTER_VALIDATE_EMAIL)) {
            $targetEmail = Str::lower($input);
        } else {
            $owner = Owner::query()->where('phone', $input)->first();
            if ($owner instanceof Owner) {
                $targetEmail = $owner->email;
            }
        }

        if ($targetEmail !== null) {
            Password::broker('owners')->sendResetLink([
                'email' => $targetEmail,
            ]);
        }

        return back()->with('status', __('A partner password reset link will be sent if the email address or phone exists in our records.'));
    }
}

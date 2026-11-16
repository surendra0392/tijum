<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\Auth\ForgotPasswordRequest;
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
        return Inertia::render('admin/auth/forgot-password', [
            'status' => $request->session()->get('status'),
        ]);
    }

    public function store(ForgotPasswordRequest $request): RedirectResponse
    {
        Password::broker('admins')->sendResetLink([
            'email' => Str::lower(trim($request->string('email')->toString())),
        ]);

        return back()->with('status', __('An administrator password reset link will be sent if the email address exists in our records.'));
    }
}

<?php

declare(strict_types=1);

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;

class CustomerPasswordResetLinkController extends Controller
{
    public function store(Request $request): RedirectResponse
    {
        $input = trim((string) ($request->input('email') ?? $request->input('phone') ?? $request->input('login') ?? ''));

        if ($input === '') {
            return back()->withErrors(['email' => 'Please enter your registered email address or mobile number.']);
        }

        $phoneDigits = preg_replace('/[^0-9]/', '', $input);
        if (strlen($phoneDigits) === 12 && str_starts_with($phoneDigits, '91')) {
            $phoneDigits = substr($phoneDigits, 2);
        }

        $user = User::query()
            ->where('email', Str::lower($input))
            ->orWhere(function ($query) use ($input, $phoneDigits): void {
                $query->where('phone', $input);
                if ($phoneDigits !== '') {
                    $query->orWhere('phone', $phoneDigits);
                }
            })
            ->first();

        if ($user instanceof User && $user->email) {
            Password::broker('users')->sendResetLink([
                'email' => $user->email,
            ]);
        }

        return back()->with('status', 'If an account exists for this email or mobile number, we have sent a password reset link to the registered email address.');
    }
}

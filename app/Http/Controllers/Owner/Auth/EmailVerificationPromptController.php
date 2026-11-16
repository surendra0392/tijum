<?php

declare(strict_types=1);

namespace App\Http\Controllers\Owner\Auth;

use App\Http\Controllers\Controller;
use App\Models\Owner;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class EmailVerificationPromptController extends Controller
{
    public function __invoke(Request $request): RedirectResponse|Response
    {
        $owner = $request->user('owner');

        if ($owner instanceof Owner && $owner->hasVerifiedEmail()) {
            return redirect()->route('owner.dashboard');
        }

        return Inertia::render('owner/auth/verify-email', [
            'status' => $request->session()->get('status'),
        ]);
    }
}

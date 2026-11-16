<?php

declare(strict_types=1);

namespace App\Http\Controllers\Owner\Auth;

use App\Http\Controllers\Controller;
use App\Models\Owner;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class EmailVerificationNotificationController extends Controller
{
    public function store(Request $request): RedirectResponse
    {
        /** @var Owner $owner */
        $owner = $request->user('owner');

        if ($owner->hasVerifiedEmail()) {
            return redirect()->route('owner.dashboard');
        }

        $owner->sendEmailVerificationNotification();

        return back()->with('status', 'verification-link-sent');
    }
}

<?php

declare(strict_types=1);

namespace App\Http\Controllers\Owner\Auth;

use App\Http\Controllers\Controller;
use App\Models\Owner;
use Illuminate\Auth\Events\Verified;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class VerifyEmailController extends Controller
{
    public function __invoke(Request $request, string $id, string $hash): RedirectResponse
    {
        /** @var Owner $owner */
        $owner = $request->user('owner');

        if ((string) $owner->getKey() !== $id || ! hash_equals(sha1($owner->getEmailForVerification()), $hash)) {
            abort(403, 'Invalid partner email verification link.');
        }

        if ($owner->hasVerifiedEmail()) {
            return redirect()
                ->route('owner.dashboard')
                ->with('status', 'email-already-verified');
        }

        if ($owner->markEmailAsVerified()) {
            event(new Verified($owner));
        }

        return redirect()
            ->route('owner.dashboard')
            ->with('status', 'email-verified');
    }
}

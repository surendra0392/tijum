<?php

declare(strict_types=1);

namespace App\Http\Controllers\Owner\Auth;

use App\Actions\Owner\Auth\RegisterOwner;
use App\Http\Controllers\Controller;
use App\Http\Requests\Owner\Auth\RegisterRequest;
use App\Models\City;
use App\Models\PropertyCategory;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class RegisteredOwnerController extends Controller
{
    public function create(): Response
    {
        return Inertia::render('owner/auth/register', [
            'cities' => City::query()->active()->ordered()->get(['id', 'name', 'slug']),
            'categories' => PropertyCategory::query()->where('is_active', true)->ordered()->get(['id', 'name', 'slug', 'code']),
        ]);
    }

    public function store(RegisterRequest $request, RegisterOwner $registerOwner): RedirectResponse
    {
        /** @var array{name: string, email: string, phone: string|null, password: string} $validated */
        $validated = $request->validated();

        $owner = $registerOwner->execute($validated);

        Auth::guard('owner')->login($owner);
        $request->session()->regenerate(true);

        return redirect()->route('owner.dashboard');
    }
}

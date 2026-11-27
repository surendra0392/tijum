<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin\Seo;

use App\Http\Controllers\Controller;
use App\Models\SeoRedirect;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AdminSeoRedirectController extends Controller
{
    public function index(Request $request): Response
    {
        $query = SeoRedirect::query()->with('admin')->latest();

        if ($request->filled('search')) {
            $search = (string) $request->query('search');
            $query->where(function ($q) use ($search): void {
                $q->where('source_path', 'like', "%{$search}%")
                    ->orWhere('destination_url', 'like', "%{$search}%");
            });
        }

        $redirects = $query->paginate(20)->withQueryString();

        return Inertia::render('admin/seo/redirects/index', [
            'redirects' => $redirects,
            'filters' => [
                'search' => $request->query('search'),
            ],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'source_path' => ['required', 'string', 'max:500'],
            'destination_url' => ['required', 'string', 'max:500'],
            'http_status' => ['required', 'integer', 'in:301,302'],
            'is_active' => ['boolean'],
        ]);

        $source = '/'.ltrim(trim($validated['source_path']), '/');
        $destination = trim($validated['destination_url']);

        if ($source === $destination) {
            return back()->with('error', 'Source path and destination URL cannot be identical (prevents redirect loop).');
        }

        if (! $this->isSafeRedirectDestination($destination)) {
            return back()->with('error', 'Redirecting to external arbitrary domains or unsafe URLs is prohibited to protect marketplace users.');
        }

        if (SeoRedirect::query()->where('source_path', $source)->exists()) {
            return back()->with('error', 'A redirect for this source path already exists.');
        }

        SeoRedirect::query()->create([
            'source_path' => $source,
            'destination_url' => $destination,
            'http_status' => (int) $validated['http_status'],
            'is_active' => (bool) ($validated['is_active'] ?? true),
            'admin_id' => auth('admin')->id(),
        ]);

        return back()->with('success', 'Redirect rule created successfully.');
    }

    public function update(Request $request, SeoRedirect $redirect): RedirectResponse
    {
        $validated = $request->validate([
            'destination_url' => ['required', 'string', 'max:500'],
            'http_status' => ['required', 'integer', 'in:301,302'],
            'is_active' => ['boolean'],
        ]);

        $destination = trim($validated['destination_url']);

        if ($redirect->source_path === $destination) {
            return back()->with('error', 'Source path and destination cannot be identical.');
        }

        if (! $this->isSafeRedirectDestination($destination)) {
            return back()->with('error', 'Redirecting to external arbitrary domains or unsafe URLs is prohibited to protect marketplace users.');
        }

        $redirect->update([
            'destination_url' => $destination,
            'http_status' => (int) $validated['http_status'],
            'is_active' => (bool) ($validated['is_active'] ?? true),
        ]);

        return back()->with('success', 'Redirect rule updated.');
    }

    public function destroy(SeoRedirect $redirect): RedirectResponse
    {
        $redirect->delete();

        return back()->with('success', 'Redirect rule deleted.');
    }

    private function isSafeRedirectDestination(string $destination): bool
    {
        if ($destination === '' || str_contains($destination, "\r") || str_contains($destination, "\n")) {
            return false;
        }

        // Allow strictly single-leading-slash relative paths (reject protocol-relative //evil.com or /\)
        if (str_starts_with($destination, '/')) {
            return ! str_starts_with($destination, '//') && ! str_starts_with($destination, '/\\');
        }

        $scheme = strtolower((string) parse_url($destination, PHP_URL_SCHEME));
        if (! in_array($scheme, ['http', 'https'], true)) {
            return false;
        }

        $appHost = strtolower((string) parse_url((string) config('app.url'), PHP_URL_HOST));
        $destHost = strtolower((string) parse_url($destination, PHP_URL_HOST));

        return $appHost !== '' && $destHost !== '' && hash_equals($appHost, $destHost);
    }
}

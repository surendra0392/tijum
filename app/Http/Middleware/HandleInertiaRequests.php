<?php

namespace App\Http\Middleware;

use App\Models\Admin;
use App\Models\Owner;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        return [
            ...parent::share($request),
            'name' => config('app.name'),
            'appearance' => $request->cookie('appearance') ?? 'light',
            'auth' => $this->resolvePortalAuth($request),
            'sidebarOpen' => ! $request->hasCookie('sidebar_state') || $request->cookie('sidebar_state') === 'true',
            'googleMapsApiKey' => config('services.google.maps_api_key'),
        ];
    }

    /**
     * Resolve authentication props strictly for the active portal guard.
     *
     * @return array<string, mixed>
     */
    private function resolvePortalAuth(Request $request): array
    {
        if ($request->is('owner', 'owner/*') || $request->routeIs('owner.*')) {
            $owner = $request->user('owner');

            return [
                'owner' => $owner instanceof Owner ? $owner->toPortalArray() : null,
            ];
        }

        if ($request->is('admin', 'admin/*') || $request->routeIs('admin.*')) {
            $admin = $request->user('admin');

            return [
                'admin' => $admin instanceof Admin ? $admin->toPortalArray() : null,
            ];
        }

        $user = $request->user('web');

        return [
            'user' => $user instanceof User ? $user->toSharedAuthArray() : null,
        ];
    }
}

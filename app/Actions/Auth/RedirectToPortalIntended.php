<?php

declare(strict_types=1);

namespace App\Actions\Auth;

use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

final class RedirectToPortalIntended
{
    /**
     * Redirect to the stored intended URL only when it belongs to the active portal namespace.
     */
    public function execute(Request $request, string $portalPrefix, string $fallbackRoute): RedirectResponse
    {
        $intended = $request->session()->pull('url.intended');

        if (is_string($intended) && $intended !== '') {
            $path = parse_url($intended, PHP_URL_PATH);

            if (is_string($path) && ($path === $portalPrefix || Str::startsWith($path, $portalPrefix.'/'))) {
                return redirect()->to($intended);
            }
        }

        return redirect()->route($fallbackRoute);
    }
}

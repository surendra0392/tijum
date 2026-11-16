<?php

declare(strict_types=1);

namespace App\Http\Responses;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Laravel\Fortify\Contracts\LoginResponse as LoginResponseContract;
use Laravel\Fortify\Contracts\TwoFactorLoginResponse as TwoFactorLoginResponseContract;
use Symfony\Component\HttpFoundation\Response;

class CustomerLoginResponse implements LoginResponseContract, TwoFactorLoginResponseContract
{
    /**
     * Create an HTTP response that represents the object.
     *
     * @param  Request  $request
     * @return Response
     */
    public function toResponse($request)
    {
        if ($request->wantsJson()) {
            return new JsonResponse(['two_factor' => false]);
        }

        $intended = $request->session()->pull('url.intended');

        if (is_string($intended) && $intended !== '') {
            $path = parse_url($intended, PHP_URL_PATH);

            if (is_string($path)) {
                $isDisallowed = Str::startsWith($path, [
                    '/admin',
                    'admin',
                    '/owner',
                    'owner',
                    '/login',
                    '/register',
                    '/forgot-password',
                    '/reset-password',
                    '/two-factor-challenge',
                ]);

                if (! $isDisallowed) {
                    return redirect()->to($intended);
                }
            }
        }

        return redirect()->route('dashboard');
    }
}

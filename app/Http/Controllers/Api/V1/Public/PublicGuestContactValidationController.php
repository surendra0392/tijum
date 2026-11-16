<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Public;

use App\Http\Controllers\Api\V1\ApiController;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PublicGuestContactValidationController extends ApiController
{
    /**
     * Common email domain typos to catch during live AJAX validation.
     *
     * @var array<string, string>
     */
    private const TYPO_DOMAINS = [
        'gmial.com' => 'gmail.com',
        'gamil.com' => 'gmail.com',
        'gmal.com' => 'gmail.com',
        'gnail.com' => 'gmail.com',
        'gmail.con' => 'gmail.com',
        'gmail.co' => 'gmail.com',
        'yaho.com' => 'yahoo.com',
        'yahooo.com' => 'yahoo.com',
        'yahoo.con' => 'yahoo.com',
        'outlok.com' => 'outlook.com',
        'hotmial.com' => 'hotmail.com',
    ];

    public function __invoke(Request $request): JsonResponse
    {
        $field = (string) $request->input('field', '');
        $response = [];

        if ($field === 'phone' || $request->has('phone')) {
            $rawPhone = (string) $request->input('phone', '');
            $digits = preg_replace('/\D+/', '', $rawPhone) ?? '';

            if ($digits === '') {
                $response['phone'] = [
                    'valid' => false,
                    'message' => 'Contact phone number is required.',
                ];
            } elseif (strlen($digits) !== 10) {
                $response['phone'] = [
                    'valid' => false,
                    'message' => sprintf('Phone number must be exactly 10 digits (%d/10 entered).', strlen($digits)),
                ];
            } elseif (preg_match('/^[6-9]\d{9}$/', $digits) !== 1) {
                $response['phone'] = [
                    'valid' => false,
                    'message' => 'Enter a valid 10-digit mobile number starting with 6, 7, 8, or 9.',
                ];
            } elseif (preg_match('/^(\d)\1{9}$/', $digits) === 1) {
                $response['phone'] = [
                    'valid' => false,
                    'message' => 'Please enter a real 10-digit mobile number.',
                ];
            } else {
                $response['phone'] = [
                    'valid' => true,
                    'normalized' => $digits,
                    'message' => 'Valid 10-digit mobile number.',
                ];
            }
        }

        if ($field === 'email' || $request->has('email')) {
            $email = trim((string) $request->input('email', ''));

            if ($email === '') {
                $response['email'] = [
                    'valid' => false,
                    'message' => 'Contact email address is required.',
                ];
            } elseif (
                filter_var($email, FILTER_VALIDATE_EMAIL) === false
                || preg_match('/^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/', $email) !== 1
            ) {
                $response['email'] = [
                    'valid' => false,
                    'message' => 'Enter a valid email address (e.g. guest@example.com).',
                ];
            } else {
                $parts = explode('@', strtolower($email));
                $domain = $parts[1] ?? '';
                $tld = substr((string) strrchr($domain, '.'), 1);

                if (isset(self::TYPO_DOMAINS[$domain])) {
                    $suggestion = $parts[0].'@'.self::TYPO_DOMAINS[$domain];
                    $response['email'] = [
                        'valid' => false,
                        'message' => "Did you mean {$suggestion}? Please check the email domain.",
                    ];
                } elseif ($domain === '' || str_contains($domain, '..') || in_array($tld, ['con', 'c', 'cm'], true)) {
                    $response['email'] = [
                        'valid' => false,
                        'message' => 'Please enter a valid email domain.',
                    ];
                } else {
                    $response['email'] = [
                        'valid' => true,
                        'normalized' => strtolower($email),
                        'message' => 'Valid email address.',
                    ];
                }
            }
        }

        if ($field === 'name' || $request->has('name')) {
            $name = trim((string) $request->input('name', ''));

            if ($name === '') {
                $response['name'] = [
                    'valid' => false,
                    'message' => 'Contact name is required.',
                ];
            } elseif (mb_strlen($name) < 2) {
                $response['name'] = [
                    'valid' => false,
                    'message' => 'Contact name must be at least 2 characters.',
                ];
            } elseif (preg_match('/^[a-zA-Z\s.\'-]{2,100}$/u', $name) !== 1) {
                $response['name'] = [
                    'valid' => false,
                    'message' => 'Contact name may only contain letters and spaces.',
                ];
            } else {
                $response['name'] = [
                    'valid' => true,
                    'message' => 'Valid guest name.',
                ];
            }
        }

        return $this->success($response);
    }
}

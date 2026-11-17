<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Public;

use App\Enums\PropertyGuestComposition;
use App\Http\Controllers\Api\V1\ApiController;
use App\Http\Resources\Api\V1\PropertyCategoryResource;
use App\Models\City;
use App\Models\PlatformSetting;
use App\Models\PropertyCategory;
use App\Services\StayTimingPolicy;
use Illuminate\Http\JsonResponse;

class PublicConfigController extends ApiController
{
    public function __invoke(StayTimingPolicy $timingPolicy): JsonResponse
    {
        $cities = City::query()
            ->where('is_active', true)
            ->get(['id', 'name', 'slug', 'state']);

        $categories = PropertyCategory::query()
            ->active()
            ->ordered()
            ->get();

        $platformConfig = PlatformSetting::getPublicConfig();

        return $this->success(array_merge($platformConfig, [
            'currency' => [
                'code' => $platformConfig['currency'] ?? 'INR',
                'symbol' => $platformConfig['currency_symbol'] ?? '₹',
                'minor_unit' => 2,
            ],
            'launch_cities' => $cities,
            'categories' => PropertyCategoryResource::collection($categories),
            'timing_policy' => $timingPolicy->timingSummary(),
            'stay_timing_policy' => [
                'check_in_time' => ($platformConfig['timings']['check_in'] ?? '09:00').':00',
                'check_out_time' => ($platformConfig['timings']['check_out'] ?? '08:00').':00',
                'description' => 'Check-in from '.($platformConfig['timings']['check_in'] ?? '09:00').' • Checkout by '.($platformConfig['timings']['check_out'] ?? '08:00'),
            ],
            'payment_gateways' => [
                'primary' => 'razorpay',
                'supported' => ['razorpay'],
            ],
            'durations' => config('tijum.pricing.durations', []),
            'booking_options' => [
                'guest_genders' => [
                    ['value' => 'male', 'label' => 'Male'],
                    ['value' => 'female', 'label' => 'Female'],
                    ['value' => 'mixed', 'label' => 'Both'],
                ],
                'guest_compositions' => [
                    [
                        'value' => PropertyGuestComposition::Individuals->value,
                        'label' => PropertyGuestComposition::Individuals->label(),
                    ],
                ],
                'default_guest_composition' => PropertyGuestComposition::Individuals->value,
                'booking_for_options' => [
                    ['value' => 'self', 'label' => 'Booking for myself'],
                    ['value' => 'other', 'label' => 'Booking for another person'],
                ],
                'contact_phone_rules' => [
                    'digits' => 10,
                    'pattern' => '^[6-9]\\d{9}$',
                    'description' => '10-digit Indian mobile number starting with 6, 7, 8, or 9.',
                ],
            ],
            'support' => [
                'email' => $platformConfig['support_email'] ?? 'support@tijum.com',
                'phone' => $platformConfig['support_phone'] ?? '+91 40 6828 0000',
                'help_url' => url('/faqs'),
            ],
        ]));
    }
}

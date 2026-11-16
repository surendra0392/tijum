<?php

declare(strict_types=1);

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Services\Marketing\MarketingTrackingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MarketingTrackingController extends Controller
{
    public function __construct(
        private readonly MarketingTrackingService $trackingService,
    ) {}

    public function track(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'event_type' => ['required', 'string', 'max:64'],
            'event_key' => ['nullable', 'string', 'max:128'],
            'page_url' => ['nullable', 'string', 'max:500'],
            'utm_source' => ['nullable', 'string', 'max:64'],
            'utm_medium' => ['nullable', 'string', 'max:64'],
            'utm_campaign' => ['nullable', 'string', 'max:64'],
            'utm_content' => ['nullable', 'string', 'max:64'],
        ]);

        $this->trackingService->recordEvent($request, $validated);

        return response()->json([
            'success' => true,
        ]);
    }
}

<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Public;

use App\Http\Controllers\Api\V1\ApiController;
use App\Services\LocationAutocompleteService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PublicLocationController extends ApiController
{
    public function __invoke(Request $request, LocationAutocompleteService $service): JsonResponse
    {
        $validated = $request->validate([
            'q' => ['nullable', 'string', 'max:120'],
            'limit' => ['nullable', 'integer', 'between:1,10'],
            'lat' => ['nullable', 'numeric', 'between:-90,90'],
            'lng' => ['nullable', 'numeric', 'between:-180,180'],
        ]);

        $query = trim((string) ($validated['q'] ?? ''));
        $limit = (int) ($validated['limit'] ?? 8);
        $latitude = isset($validated['lat']) ? (float) $validated['lat'] : null;
        $longitude = isset($validated['lng']) ? (float) $validated['lng'] : null;
        $results = $service->autocomplete($query, $limit, $latitude, $longitude);

        return $this->success($results, meta: [
            'query' => $query,
            'total' => count($results),
            'provider' => 'photon',
        ]);
    }
}

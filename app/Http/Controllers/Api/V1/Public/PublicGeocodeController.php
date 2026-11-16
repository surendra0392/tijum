<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Public;

use App\Http\Controllers\Api\V1\ApiController;
use App\Models\City;
use App\Models\PlatformSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class PublicGeocodeController extends ApiController
{
    /**
     * Launch city reference coordinates for distance calculations and mapping.
     */
    private const LAUNCH_CITIES = [
        'hyderabad' => ['name' => 'Hyderabad', 'slug' => 'hyderabad', 'lat' => 17.3850, 'lng' => 78.4867],
        'vijayawada' => ['name' => 'Vijayawada', 'slug' => 'vijayawada', 'lat' => 16.5062, 'lng' => 80.6480],
        'guntur' => ['name' => 'Guntur', 'slug' => 'guntur', 'lat' => 16.3067, 'lng' => 80.4365],
        'visakhapatnam' => ['name' => 'Visakhapatnam', 'slug' => 'visakhapatnam', 'lat' => 17.6868, 'lng' => 83.2185],
    ];

    /**
     * Reverse geocode a latitude/longitude coordinate to a human-readable location and city.
     */
    public function reverse(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'lat' => ['required', 'numeric', 'between:-90,90'],
            'lng' => ['required', 'numeric', 'between:-180,180'],
        ]);

        $lat = (float) $validated['lat'];
        $lng = (float) $validated['lng'];

        // Cache 4 decimal places (~11 meters) for 24 hours to reduce external API requests
        $cacheKey = sprintf('geocode:reverse:%.4f:%.4f', $lat, $lng);

        $result = Cache::remember($cacheKey, 86400, fn (): array => $this->performReverseGeocode($lat, $lng));

        return $this->success($result);
    }

    /**
     * Resolve location details using available geocoding providers.
     *
     * @return array<string, mixed>
     */
    private function performReverseGeocode(float $lat, float $lng): array
    {
        // 1. Try Google Maps Geocoding if API key is configured
        $googleResult = $this->tryGoogleGeocoding($lat, $lng);
        if ($googleResult !== null) {
            return $googleResult;
        }

        // 2. Try OpenStreetMap Nominatim
        $nominatimResult = $this->tryNominatim($lat, $lng);
        if ($nominatimResult !== null) {
            return $nominatimResult;
        }

        // 3. Try BigDataCloud Free Reverse Geocode Client API
        $bigDataCloudResult = $this->tryBigDataCloud($lat, $lng);
        if ($bigDataCloudResult !== null) {
            return $bigDataCloudResult;
        }

        // 4. Fall back to closest launch city
        return $this->fallbackClosestCity($lat, $lng);
    }

    /**
     * Reverse geocode using Google Maps API.
     *
     * @return array<string, mixed>|null
     */
    private function tryGoogleGeocoding(float $lat, float $lng): ?array
    {
        $apiKey = (string) config('services.google.maps_api_key');
        if ($apiKey === '') {
            $setting = PlatformSetting::query()->where('key', 'integrations.google_maps_api_key')->value('value');
            $apiKey = is_array($setting) ? (string) ($setting['v'] ?? '') : (string) $setting;
        }

        if ($apiKey === '') {
            return null;
        }

        try {
            $response = Http::timeout(4)->get('https://maps.googleapis.com/maps/api/geocode/json', [
                'latlng' => "{$lat},{$lng}",
                'key' => $apiKey,
            ]);

            if ($response->successful()) {
                $data = $response->json();
                if (($data['status'] ?? '') === 'OK' && ! empty($data['results'])) {
                    $results = $data['results'];
                    $locality = '';
                    $sublocality = '';
                    $neighborhood = '';
                    $city = '';

                    foreach ($results as $res) {
                        foreach ($res['address_components'] ?? [] as $component) {
                            $types = $component['types'] ?? [];
                            if ($neighborhood === '' && in_array('neighborhood', $types, true)) {
                                $neighborhood = (string) $component['long_name'];
                            }
                            if ($sublocality === '' && (in_array('sublocality_level_1', $types, true) || in_array('sublocality', $types, true))) {
                                $sublocality = (string) $component['long_name'];
                            }
                            if ($locality === '' && in_array('locality', $types, true)) {
                                $locality = (string) $component['long_name'];
                            }
                            if ($city === '' && in_array('administrative_area_level_2', $types, true)) {
                                $city = (string) $component['long_name'];
                            }
                        }
                        if ($sublocality !== '' && $locality !== '') {
                            break;
                        }
                    }

                    $resolvedLocality = $neighborhood !== '' ? $neighborhood : ($sublocality !== '' ? $sublocality : $locality);
                    $resolvedCityName = $locality !== '' ? $locality : ($city !== '' ? $city : 'Hyderabad');
                    $citySlug = $this->matchCitySlug($resolvedCityName, $lat, $lng);

                    $display = $resolvedLocality !== '' && strtolower($resolvedLocality) !== strtolower($resolvedCityName)
                        ? "{$resolvedLocality}, {$resolvedCityName}"
                        : $resolvedCityName;

                    return [
                        'display' => $display,
                        'locality' => $resolvedLocality,
                        'city' => $resolvedCityName,
                        'city_slug' => $citySlug,
                        'formatted_address' => (string) ($results[0]['formatted_address'] ?? $display),
                        'lat' => $lat,
                        'lng' => $lng,
                        'provider' => 'google',
                    ];
                }
            }
        } catch (\Throwable $e) {
            Log::warning('Google Geocoding API failed', ['error' => $e->getMessage()]);
        }

        return null;
    }

    /**
     * Reverse geocode using OpenStreetMap Nominatim.
     *
     * @return array<string, mixed>|null
     */
    private function tryNominatim(float $lat, float $lng): ?array
    {
        try {
            $response = Http::withHeaders([
                'User-Agent' => 'TIJUM-Platform/1.0 (contact@tijum.com)',
                'Accept' => 'application/json',
            ])->timeout(4)->get('https://nominatim.openstreetmap.org/reverse', [
                'lat' => $lat,
                'lon' => $lng,
                'format' => 'json',
                'addressdetails' => 1,
            ]);

            if ($response->successful()) {
                $data = $response->json();
                $addr = $data['address'] ?? [];

                $locality = (string) ($addr['suburb'] ?? $addr['neighbourhood'] ?? $addr['residential'] ?? $addr['commercial'] ?? '');
                $cityName = (string) ($addr['city'] ?? $addr['town'] ?? $addr['village'] ?? $addr['county'] ?? '');

                if ($locality === '' && isset($addr['road'])) {
                    $locality = (string) $addr['road'];
                }

                if ($cityName !== '' || $locality !== '') {
                    $citySlug = $this->matchCitySlug($cityName !== '' ? $cityName : $locality, $lat, $lng);
                    $displayCity = $cityName !== '' ? $cityName : ucfirst($citySlug);

                    $display = $locality !== '' && strtolower($locality) !== strtolower($displayCity)
                        ? "{$locality}, {$displayCity}"
                        : ($locality !== '' ? $locality : $displayCity);

                    return [
                        'display' => $display,
                        'locality' => $locality,
                        'city' => $displayCity,
                        'city_slug' => $citySlug,
                        'formatted_address' => (string) ($data['display_name'] ?? $display),
                        'lat' => $lat,
                        'lng' => $lng,
                        'provider' => 'nominatim',
                    ];
                }
            }
        } catch (\Throwable $e) {
            Log::info('Nominatim reverse geocode attempt skipped or failed', ['error' => $e->getMessage()]);
        }

        return null;
    }

    /**
     * Reverse geocode using BigDataCloud free client API.
     *
     * @return array<string, mixed>|null
     */
    private function tryBigDataCloud(float $lat, float $lng): ?array
    {
        try {
            $response = Http::timeout(4)->get('https://api.bigdatacloud.net/data/reverse-geocode-client', [
                'latitude' => $lat,
                'longitude' => $lng,
                'localityLanguage' => 'en',
            ]);

            if ($response->successful()) {
                $data = $response->json();
                $cityName = (string) ($data['city'] ?? $data['principalSubdivision'] ?? '');
                $locality = (string) ($data['locality'] ?? '');

                // Check administrative levels for deeper locality (e.g. Ward / Suburb)
                $admin = $data['localityInfo']['administrative'] ?? [];
                if (is_array($admin)) {
                    for ($i = count($admin) - 1; $i >= 0; $i--) {
                        $name = (string) ($admin[$i]['name'] ?? '');
                        $level = (int) ($admin[$i]['adminLevel'] ?? 0);
                        $clean = preg_replace('/^Ward\s+\d+\s+/i', '', $name);
                        $clean = preg_replace('/\s+(Mandal|Zone|District|Corporation|Metropolitan Region)$/i', '', (string) $clean);
                        $clean = trim((string) $clean);

                        if ($level >= 8 && $clean !== '' && ! str_contains(strtolower($clean), 'greater')) {
                            $locality = $clean;
                            break;
                        }
                    }
                }

                $citySlug = $this->matchCitySlug($cityName, $lat, $lng);
                $displayCity = $cityName !== '' ? $cityName : ucfirst($citySlug);

                $display = $locality !== '' && strtolower($locality) !== strtolower($displayCity)
                    ? "{$locality}, {$displayCity}"
                    : ($locality !== '' ? $locality : $displayCity);

                return [
                    'display' => $display,
                    'locality' => $locality,
                    'city' => $displayCity,
                    'city_slug' => $citySlug,
                    'formatted_address' => $display,
                    'lat' => $lat,
                    'lng' => $lng,
                    'provider' => 'bigdatacloud',
                ];
            }
        } catch (\Throwable $e) {
            Log::info('BigDataCloud reverse geocode failed', ['error' => $e->getMessage()]);
        }

        return null;
    }

    /**
     * Fallback to closest launch city when no provider succeeds.
     *
     * @return array<string, mixed>
     */
    private function fallbackClosestCity(float $lat, float $lng): array
    {
        $closest = self::LAUNCH_CITIES['hyderabad'];
        $minDist = INF;

        foreach (self::LAUNCH_CITIES as $city) {
            $dist = hypot($city['lat'] - $lat, $city['lng'] - $lng);
            if ($dist < $minDist) {
                $minDist = $dist;
                $closest = $city;
            }
        }

        return [
            'display' => $closest['name'],
            'locality' => '',
            'city' => $closest['name'],
            'city_slug' => $closest['slug'],
            'formatted_address' => $closest['name'],
            'lat' => $lat,
            'lng' => $lng,
            'provider' => 'fallback',
        ];
    }

    /**
     * Map a location/city name or coordinate to an active TIJUM city slug.
     */
    private function matchCitySlug(string $name, float $lat, float $lng): string
    {
        $lower = strtolower(trim($name));

        if (str_contains($lower, 'hyderabad') || str_contains($lower, 'secunderabad') || str_contains($lower, 'cyberabad') || str_contains($lower, 'ranga reddy')) {
            return 'hyderabad';
        }

        if (str_contains($lower, 'visakhapatnam') || str_contains($lower, 'vizag') || str_contains($lower, 'vishakhapatnam')) {
            return 'visakhapatnam';
        }

        if (str_contains($lower, 'vijayawada') || str_contains($lower, 'ntr')) {
            return 'vijayawada';
        }

        if (str_contains($lower, 'guntur')) {
            return 'guntur';
        }

        // Try database slug
        $matchedCity = City::query()
            ->where('is_active', true)
            ->where(static function ($q) use ($lower): void {
                $q->where('slug', $lower)
                    ->orWhereRaw('LOWER(name) = ?', [$lower]);
            })
            ->value('slug');

        if ($matchedCity !== null) {
            return (string) $matchedCity;
        }

        // Fallback by distance to closest launch city
        return $this->fallbackClosestCity($lat, $lng)['city_slug'];
    }
}

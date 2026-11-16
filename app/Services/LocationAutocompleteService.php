<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\City;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class LocationAutocompleteService
{
    private const PHOTON_ENDPOINT = 'https://photon.komoot.io/api/';

    /**
     * @var array<string, array{lat:float,lng:float}>
     */
    private const CITY_CENTERS = [
        'hyderabad' => ['lat' => 17.3850, 'lng' => 78.4867],
        'guntur' => ['lat' => 16.3067, 'lng' => 80.4365],
        'vijayawada' => ['lat' => 16.5062, 'lng' => 80.6480],
        'visakhapatnam' => ['lat' => 17.6868, 'lng' => 83.2185],
    ];

    /**
     * @var array<string, list<string>>
     */
    private const CITY_ALIASES = [
        'hyderabad' => ['hyderabad', 'secunderabad', 'cyberabad', 'ranga reddy', 'rangareddy'],
        'guntur' => ['guntur'],
        'vijayawada' => ['vijayawada', 'bezawada', 'ntr district'],
        'visakhapatnam' => ['visakhapatnam', 'vishakhapatnam', 'vizag'],
    ];

    /**
     * @return list<array{
     *     id:string,
     *     name:string,
     *     type:'city'|'locality'|'landmark',
     *     secondary_text:string,
     *     label:string,
     *     city:string,
     *     city_name:string,
     *     locality:?string,
     *     lat:float,
     *     lng:float,
     *     source:'photon'
     * }>
     */
    public function autocomplete(
        string $query,
        int $limit = 8,
        ?float $latitude = null,
        ?float $longitude = null,
    ): array {
        $cleanQuery = trim((string) preg_replace('/\s+/', ' ', $query));
        $limit = min(max($limit, 1), 10);

        if (mb_strlen($cleanQuery) < 2) {
            return [];
        }

        $latitude ??= self::CITY_CENTERS['hyderabad']['lat'];
        $longitude ??= self::CITY_CENTERS['hyderabad']['lng'];
        $biasKey = round($latitude, 2).':'.round($longitude, 2);
        $cacheKey = 'location-autocomplete:photon:v3:'.md5(Str::lower($cleanQuery)).':'.$limit.':'.$biasKey;
        $cached = Cache::get($cacheKey);

        if (is_array($cached)) {
            return $cached;
        }

        $results = $this->queryPhoton($cleanQuery, $limit, $latitude, $longitude);

        if ($results !== []) {
            Cache::put($cacheKey, $results, now()->addDay());
        }

        return $results;
    }

    /**
     * @return list<array{
     *     id:string,
     *     name:string,
     *     type:'city'|'locality'|'landmark',
     *     secondary_text:string,
     *     label:string,
     *     city:string,
     *     city_name:string,
     *     locality:?string,
     *     lat:float,
     *     lng:float,
     *     source:'photon'
     * }>
     */
    private function queryPhoton(
        string $query,
        int $limit,
        float $latitude,
        float $longitude,
    ): array {
        try {
            $response = Http::acceptJson()
                ->withHeaders(['User-Agent' => 'TIJUM/1.0 (contact@tijum.com)'])
                ->connectTimeout(2)
                ->timeout(5)
                ->get(self::PHOTON_ENDPOINT, [
                    'q' => $query,
                    'limit' => min($limit * 2, 20),
                    'lang' => 'en',
                    'lat' => $latitude,
                    'lon' => $longitude,
                ]);

            if (! $response->successful()) {
                return [];
            }

            $activeCities = Cache::remember(
                'active_cities_lookup_v1',
                300,
                static fn () => City::query()
                    ->where('is_active', true)
                    ->get(['name', 'slug'])
                    ->keyBy('slug')
            );
            $features = $response->json('features');

            if (! is_array($features)) {
                return [];
            }

            $results = [];
            $seen = [];

            foreach ($features as $feature) {
                if (! is_array($feature)) {
                    continue;
                }

                $properties = is_array($feature['properties'] ?? null) ? $feature['properties'] : [];
                $geometry = is_array($feature['geometry'] ?? null) ? $feature['geometry'] : [];
                $coordinates = is_array($geometry['coordinates'] ?? null) ? $geometry['coordinates'] : [];

                if (! isset($coordinates[0], $coordinates[1]) || ! is_numeric($coordinates[0]) || ! is_numeric($coordinates[1])) {
                    continue;
                }

                $countryCode = Str::upper((string) ($properties['countrycode'] ?? ''));
                if ($countryCode !== '' && $countryCode !== 'IN') {
                    continue;
                }

                $resultLatitude = (float) $coordinates[1];
                $resultLongitude = (float) $coordinates[0];
                $citySlug = $this->matchCitySlug(
                    $properties,
                    $activeCities->keys()->all(),
                    $resultLatitude,
                    $resultLongitude,
                );
                if ($citySlug === null || ! $activeCities->has($citySlug)) {
                    continue;
                }

                $cityName = (string) $activeCities->get($citySlug)?->name;
                $name = $this->primaryName($properties, $cityName);
                $locality = $this->localityName($properties, $name, $cityName);
                $secondaryText = $this->secondaryText($properties, $name, $locality, $cityName);
                $label = $secondaryText !== '' ? $name.', '.$secondaryText : $name;
                $deduplicationKey = Str::lower($label);

                if (isset($seen[$deduplicationKey])) {
                    continue;
                }

                $seen[$deduplicationKey] = true;
                $results[] = [
                    'id' => $this->resultId($properties, $label),
                    'name' => $name,
                    'type' => $this->placeType($properties),
                    'secondary_text' => $secondaryText,
                    'label' => $label,
                    'city' => $citySlug,
                    'city_name' => $cityName,
                    'locality' => $locality,
                    'lat' => $resultLatitude,
                    'lng' => $resultLongitude,
                    'source' => 'photon',
                ];

                if (count($results) >= $limit) {
                    break;
                }
            }

            return $results;
        } catch (\Throwable $exception) {
            Log::info('Photon location autocomplete failed', [
                'exception' => $exception::class,
                'message' => $exception->getMessage(),
            ]);

            return [];
        }
    }

    /**
     * @param  array<string, mixed>  $properties
     * @param  list<string>  $activeCitySlugs
     */
    private function matchCitySlug(
        array $properties,
        array $activeCitySlugs,
        float $latitude,
        float $longitude,
    ): ?string {
        $haystack = Str::lower(implode(' ', array_filter([
            $properties['city'] ?? null,
            $properties['town'] ?? null,
            $properties['village'] ?? null,
            $properties['district'] ?? null,
            $properties['county'] ?? null,
            $properties['state'] ?? null,
            $properties['name'] ?? null,
        ], static fn (mixed $value): bool => is_scalar($value) && trim((string) $value) !== '')));

        foreach (self::CITY_ALIASES as $citySlug => $aliases) {
            if (! in_array($citySlug, $activeCitySlugs, true)) {
                continue;
            }

            foreach ($aliases as $alias) {
                if (str_contains($haystack, $alias)) {
                    return $citySlug;
                }
            }
        }

        $nearestCity = null;
        $nearestDistance = PHP_FLOAT_MAX;

        foreach (self::CITY_CENTERS as $citySlug => $center) {
            if (! in_array($citySlug, $activeCitySlugs, true)) {
                continue;
            }

            $distance = $this->distanceInKilometres(
                $latitude,
                $longitude,
                $center['lat'],
                $center['lng'],
            );

            if ($distance < $nearestDistance) {
                $nearestDistance = $distance;
                $nearestCity = $citySlug;
            }
        }

        return $nearestDistance <= 100 ? $nearestCity : null;
    }

    private function distanceInKilometres(
        float $fromLatitude,
        float $fromLongitude,
        float $toLatitude,
        float $toLongitude,
    ): float {
        $earthRadius = 6371;
        $latitudeDelta = deg2rad($toLatitude - $fromLatitude);
        $longitudeDelta = deg2rad($toLongitude - $fromLongitude);
        $calculation = sin($latitudeDelta / 2) ** 2
            + cos(deg2rad($fromLatitude))
            * cos(deg2rad($toLatitude))
            * sin($longitudeDelta / 2) ** 2;

        return $earthRadius * 2 * atan2(sqrt($calculation), sqrt(1 - $calculation));
    }

    /**
     * @param  array<string, mixed>  $properties
     */
    private function primaryName(array $properties, string $cityName): string
    {
        $name = trim((string) ($properties['name'] ?? ''));
        $street = trim((string) ($properties['street'] ?? ''));
        $houseNumber = trim((string) ($properties['housenumber'] ?? ''));

        if ($houseNumber !== '' && $street !== '') {
            return $houseNumber.' '.$street;
        }

        foreach ([$name, $street, $properties['district'] ?? '', $properties['suburb'] ?? '', $cityName] as $candidate) {
            $candidate = trim((string) $candidate);
            if ($candidate !== '') {
                return $candidate;
            }
        }

        return $cityName;
    }

    /**
     * @param  array<string, mixed>  $properties
     */
    private function localityName(array $properties, string $name, string $cityName): ?string
    {
        foreach ([
            $properties['locality'] ?? '',
            $properties['suburb'] ?? '',
            $properties['neighbourhood'] ?? '',
            $properties['quarter'] ?? '',
            $properties['district'] ?? '',
            $name,
        ] as $candidate) {
            $candidate = trim((string) $candidate);
            $candidate = trim((string) preg_replace('/^ward\s+\d+\s+/i', '', $candidate));
            if ($candidate !== '' && Str::lower($candidate) !== Str::lower($cityName)) {
                return $candidate;
            }
        }

        return null;
    }

    /**
     * @param  array<string, mixed>  $properties
     */
    private function secondaryText(array $properties, string $name, ?string $locality, string $cityName): string
    {
        $parts = [
            $locality,
            $cityName,
            trim((string) ($properties['state'] ?? '')),
            trim((string) ($properties['country'] ?? 'India')),
        ];
        $seen = [Str::lower($name) => true];
        $uniqueParts = [];

        foreach ($parts as $part) {
            $part = trim((string) $part);
            $key = Str::lower($part);

            if ($part === '' || isset($seen[$key])) {
                continue;
            }

            $seen[$key] = true;
            $uniqueParts[] = $part;
        }

        return implode(', ', $uniqueParts);
    }

    /**
     * @param  array<string, mixed>  $properties
     */
    private function placeType(array $properties): string
    {
        $type = Str::lower((string) ($properties['osm_value'] ?? $properties['type'] ?? ''));

        if (in_array($type, ['city', 'town'], true)) {
            return 'city';
        }

        if (in_array($type, ['suburb', 'quarter', 'neighbourhood', 'village'], true)) {
            return 'locality';
        }

        return 'landmark';
    }

    /**
     * @param  array<string, mixed>  $properties
     */
    private function resultId(array $properties, string $label): string
    {
        $osmType = trim((string) ($properties['osm_type'] ?? ''));
        $osmId = trim((string) ($properties['osm_id'] ?? ''));

        if ($osmType !== '' && $osmId !== '') {
            return 'photon:'.Str::lower($osmType).':'.$osmId;
        }

        return 'photon:'.sha1(Str::lower($label));
    }
}

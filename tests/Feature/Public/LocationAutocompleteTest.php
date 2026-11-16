<?php

declare(strict_types=1);

namespace Tests\Feature\Public;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class LocationAutocompleteTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Cache::flush();
        Http::preventStrayRequests();
    }

    public function test_it_returns_exact_supported_city_address_predictions_from_photon(): void
    {
        Http::fake([
            'photon.komoot.io/*' => Http::response([
                'features' => [
                    [
                        'geometry' => ['coordinates' => [78.3489, 17.4401]],
                        'properties' => [
                            'osm_type' => 'W',
                            'osm_id' => 12345,
                            'osm_value' => 'building',
                            'name' => 'Gachibowli Circle',
                            'district' => 'Gachibowli',
                            'state' => 'Telangana',
                            'country' => 'India',
                            'countrycode' => 'IN',
                        ],
                    ],
                ],
            ]),
        ]);

        $this->getJson(route('api.v1.public.locations.autocomplete', ['q' => 'gach', 'limit' => 8]))
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.0.id', 'photon:w:12345')
            ->assertJsonPath('data.0.name', 'Gachibowli Circle')
            ->assertJsonPath('data.0.city', 'hyderabad')
            ->assertJsonPath('data.0.city_name', 'Hyderabad')
            ->assertJsonPath('data.0.locality', 'Gachibowli')
            ->assertJsonPath('data.0.lat', 17.4401)
            ->assertJsonPath('data.0.lng', 78.3489)
            ->assertJsonPath('data.0.source', 'photon')
            ->assertJsonPath('meta.total', 1);

        Http::assertSent(fn ($request): bool => str_starts_with($request->url(), 'https://photon.komoot.io/api')
            && $request['q'] === 'gach'
            && $request['lat'] === 17.385
            && $request['lon'] === 78.4867);
    }

    public function test_it_filters_predictions_outside_active_tijum_cities(): void
    {
        Http::fake([
            'photon.komoot.io/*' => Http::response([
                'features' => [
                    [
                        'geometry' => ['coordinates' => [77.5946, 12.9716]],
                        'properties' => [
                            'osm_type' => 'N',
                            'osm_id' => 999,
                            'osm_value' => 'city',
                            'name' => 'Bengaluru',
                            'city' => 'Bengaluru',
                            'state' => 'Karnataka',
                            'country' => 'India',
                            'countrycode' => 'IN',
                        ],
                    ],
                ],
            ]),
        ]);

        $this->getJson(route('api.v1.public.locations.autocomplete', ['q' => 'Bengaluru']))
            ->assertOk()
            ->assertJsonPath('data', [])
            ->assertJsonPath('meta.total', 0);
    }

    public function test_successful_predictions_are_cached_by_normalized_query(): void
    {
        Http::fake([
            'photon.komoot.io/*' => Http::response([
                'features' => [
                    [
                        'geometry' => ['coordinates' => [80.4365, 16.3067]],
                        'properties' => [
                            'osm_type' => 'N',
                            'osm_id' => 456,
                            'osm_value' => 'city',
                            'name' => 'Guntur',
                            'city' => 'Guntur',
                            'state' => 'Andhra Pradesh',
                            'country' => 'India',
                            'countrycode' => 'IN',
                        ],
                    ],
                ],
            ]),
        ]);

        $this->getJson(route('api.v1.public.locations.autocomplete', ['q' => 'Guntur']))->assertOk();
        $this->getJson(route('api.v1.public.locations.autocomplete', ['q' => '  guntur  ']))->assertOk();

        Http::assertSentCount(1);
    }

    public function test_queries_shorter_than_two_characters_do_not_call_photon(): void
    {
        Http::fake();

        $this->getJson(route('api.v1.public.locations.autocomplete', ['q' => 'g']))
            ->assertOk()
            ->assertJsonPath('data', [])
            ->assertJsonPath('meta.total', 0);

        Http::assertNothingSent();
    }

    public function test_browser_coordinates_are_forwarded_as_the_photon_location_bias(): void
    {
        Http::fake([
            'photon.komoot.io/*' => Http::response(['features' => []]),
        ]);

        $this->getJson(route('api.v1.public.locations.autocomplete', [
            'q' => 'brod',
            'lat' => 16.3067,
            'lng' => 80.4365,
        ]))->assertOk();

        Http::assertSent(fn ($request): bool => $request['q'] === 'brod'
            && $request['lat'] === 16.3067
            && $request['lon'] === 80.4365);
    }
}

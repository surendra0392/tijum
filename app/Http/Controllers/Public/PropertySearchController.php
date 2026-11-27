<?php

declare(strict_types=1);

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Http\Requests\Public\PropertySearchRequest;
use App\Models\Amenity;
use App\Services\PropertySearchEligibility;
use App\Services\PropertySearchService;
use Illuminate\Pagination\LengthAwarePaginator;
use Inertia\Inertia;
use Inertia\Response;

class PropertySearchController extends Controller
{
    public function __construct(
        private readonly PropertySearchService $searchService,
        private readonly PropertySearchEligibility $eligibility,
    ) {}

    public function __invoke(PropertySearchRequest $request): Response
    {
        $hasIntent = $request->hasSearchIntent();
        $filters = $hasIntent ? $request->searchFilters() : $this->defaultFilters();

        if (! $hasIntent) {
            // Merge any user-entered partial parameters (e.g. category browse, Explore filters, pagination)
            $partial = $request->all();
            foreach (['city', 'locality', 'lat', 'lng', 'check_in', 'duration_type', 'duration_count', 'guests', 'min_rating', 'min_price', 'max_price', 'sort', 'gender_preference', 'page'] as $k) {
                if (array_key_exists($k, $partial) && $partial[$k] !== null && $partial[$k] !== '') {
                    $filters[$k] = match ($k) {
                        'page' => max(1, (int) $partial[$k]),
                        'min_price', 'max_price', 'duration_count', 'guests' => (int) $partial[$k],
                        'min_rating', 'lat', 'lng' => (float) $partial[$k],
                        default => $partial[$k],
                    };
                }
            }
            if (array_key_exists('early_check_in', $partial)) {
                $filters['early_check_in'] = (bool) $partial['early_check_in'];
            }
            foreach (['category', 'sharing_capacity', 'amenities'] as $intListKey) {
                if (isset($partial[$intListKey]) && $partial[$intListKey] !== '') {
                    $items = is_array($partial[$intListKey]) ? $partial[$intListKey] : explode(',', (string) $partial[$intListKey]);
                    $filters[$intListKey] = array_values(array_map('intval', array_filter($items, 'is_numeric')));
                }
            }
            foreach (['ac', 'food_meals'] as $strListKey) {
                if (isset($partial[$strListKey]) && $partial[$strListKey] !== '') {
                    $items = is_array($partial[$strListKey]) ? $partial[$strListKey] : explode(',', (string) $partial[$strListKey]);
                    $filters[$strListKey] = array_values(array_filter(array_map('strval', $items), static fn (string $v): bool => $v !== ''));
                }
            }
        }

        // Always execute search so Explore and category pages immediately display available stays
        $payload = $this->searchService->search($filters);
        /** @var LengthAwarePaginator<int, array<string, mixed>> $paginator */
        $paginator = $payload['paginator'];
        $results = [
            'data' => $paginator->items(),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
                'from' => $paginator->firstItem(),
                'to' => $paginator->lastItem(),
            ],
            'links' => $paginator->linkCollection()->map(static fn (array $l): array => [
                'url' => $l['url'],
                'label' => $l['label'],
                'active' => $l['active'],
            ])->all(),
        ];
        $checkout = $payload['check_out'] ?? null;
        $total = (int) ($payload['total'] ?? 0);

        $meta = $this->searchService->searchMeta($filters);
        $cities = $this->eligibility->activeCities();
        $locations = $this->eligibility->searchLocations($cities);
        $categories = $this->eligibility->activeCategories();
        $amenities = Amenity::query()->active()->orderBy('display_order')->orderBy('name')->get(['id', 'name', 'code', 'icon_key', 'applicability_scope'])
            ->map(static fn (Amenity $a): array => [
                'id' => $a->id,
                'name' => $a->name,
                'code' => $a->code,
                'icon_key' => $a->icon_key,
                'scope' => $a->applicability_scope->value,
                'scope_label' => $a->applicability_scope->label(),
            ])->all();

        $cityName = $meta['city']['name'] ?? null;
        $title = $cityName ? 'Search stays in '.$cityName.' | TIJUM' : 'Search Accommodation | TIJUM';
        $description = 'Find food-inclusive hostels, PG accommodation, and homestays across TIJUM launch cities with transparent pricing and facilities.';
        $canonicalUrl = route('public.search');
        if (! $hasIntent && count($filters['category'] ?? []) === 1) {
            $matchedCategory = collect($categories)->firstWhere('id', (int) $filters['category'][0]);
            if (is_array($matchedCategory) && ! empty($matchedCategory['slug'])) {
                $canonicalUrl = route('public.search', ['category' => $matchedCategory['slug']]);
            }
        }

        return Inertia::render('public/search/index', [
            'filters' => $filters,
            'hasSearchIntent' => $hasIntent,
            'results' => $results,
            'resultTotal' => $total,
            'localityFallback' => (bool) ($payload['locality_fallback'] ?? false),
            'searchedLocality' => $payload['searched_locality'] ?? null,
            'locationLabel' => $request->validated('location_label'),
            'checkoutDate' => $checkout,
            'cities' => $cities,
            'locations' => $locations,
            'categories' => $categories,
            'amenities' => $amenities,
            'timing' => $meta['timing'],
            'durations' => $meta['durations'],
            'seo' => $this->buildSeo($title, $description, $canonicalUrl),
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function defaultFilters(): array
    {
        $today = now($this->eligibility->timezone())->toDateString();

        return [
            'city' => null,
            'locality' => null,
            'lat' => null,
            'lng' => null,
            'check_in' => $today,
            'duration_type' => 'daily',
            'duration_count' => 1,
            'guests' => 1,
            'category' => [],
            'gender_preference' => 'all',
            'sharing_capacity' => [],
            'ac' => [],
            'food_meals' => [],
            'amenities' => [],
            'min_price' => null,
            'max_price' => null,
            'early_check_in' => false,
            'sort' => 'relevant',
            'page' => 1,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function buildSeo(string $title, string $description, ?string $canonical = null): array
    {
        return [
            'title' => $title,
            'description' => $description,
            'canonical' => $canonical ?? route('public.search'),
            'ogType' => 'website',
            'ogImage' => url('/images/public/og-tijum-cover.jpg'),
            'structuredData' => [
                '@context' => 'https://schema.org',
                '@type' => 'WebPage',
                'name' => $title,
                'description' => $description,
            ],
        ];
    }
}

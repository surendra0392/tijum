<?php

declare(strict_types=1);

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Models\Property;
use App\Services\PropertyPublicData;
use App\Services\PropertySearchEligibility;
use App\Services\Seo\SeoService;
use Carbon\CarbonImmutable;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class PropertyDetailController extends Controller
{
    public function __construct(
        private readonly PropertyPublicData $publicData,
        private readonly PropertySearchEligibility $eligibility,
        private readonly SeoService $seoService,
    ) {}

    public function showBySeo(Request $request, string $citySlug, Property $property): Response|RedirectResponse
    {
        return $this->renderProperty($request, $property, $citySlug);
    }

    public function show(Request $request, Property $property): Response|RedirectResponse
    {
        return $this->renderProperty($request, $property, null);
    }

    public function __invoke(Request $request, Property $property, ?string $citySlug = null): Response|RedirectResponse
    {
        return $this->renderProperty($request, $property, $citySlug);
    }

    private function renderProperty(Request $request, Property $property, ?string $citySlug = null): Response|RedirectResponse
    {
        $property->loadMissing(['city', 'ratingSummary']);

        if ($citySlug !== null && $property->city && $property->city->slug !== $citySlug) {
            return redirect()->route('public.properties.seo', [
                'citySlug' => $property->city->slug,
                'property' => $property->slug,
            ], 301);
        }

        $searchContext = $this->safeSearchContext($request);
        $detail = $this->publicData->detail($property, $searchContext);

        if ($detail === null) {
            throw new NotFoundHttpException('This property is not available.');
        }

        $title = $property->name.' in '.$property->locality.', '.$property->city?->name.' | TIJUM';
        $description = 'View '.$property->name.' in '.$property->locality.', '.$property->city?->name.' with included food, amenities, room configurations, and transparent pricing.';
        $canonical = $property->city
            ? route('public.properties.seo', ['citySlug' => $property->city->slug, 'property' => $property->slug])
            : route('public.properties.show', ['property' => $property->slug]);
        $ogImage = $detail['gallery'][0]['url'] ?? url('/images/public/og-tijum-cover.jpg');

        return Inertia::render('public/properties/show', [
            'property' => $detail,
            'seo' => $this->seoService->buildPayload(
                title: $title,
                description: $description,
                canonical: $canonical,
                ogType: 'website',
                ogImage: $ogImage,
                structuredData: [
                    '@context' => 'https://schema.org',
                    '@graph' => [
                        [
                            '@type' => 'BreadcrumbList',
                            'itemListElement' => [
                                ['@type' => 'ListItem', 'position' => 1, 'name' => 'Home', 'item' => route('home')],
                                ['@type' => 'ListItem', 'position' => 2, 'name' => 'Explore Stays', 'item' => route('public.explore')],
                                ['@type' => 'ListItem', 'position' => 3, 'name' => $property->city !== null ? $property->city->name : 'City', 'item' => $property->city !== null ? route('public.cities.stays', ['citySlug' => $property->city->slug]) : route('public.search')],
                                ['@type' => 'ListItem', 'position' => 4, 'name' => $property->name, 'item' => $canonical],
                            ],
                        ],
                        $this->seoService->lodgingBusinessSchema($property, $canonical, $description, $ogImage),
                    ],
                ],
            ),
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function safeSearchContext(Request $request): array
    {
        $ctx = [];
        $checkIn = $request->query('check_in');
        if (is_string($checkIn) && preg_match('/^\d{4}-\d{2}-\d{2}$/', $checkIn) === 1) {
            try {
                $date = CarbonImmutable::createFromFormat('Y-m-d', $checkIn, $this->eligibility->timezone());
                $today = CarbonImmutable::now($this->eligibility->timezone())->startOfDay();
                if ($date instanceof CarbonImmutable && ! $date->startOfDay()->lt($today)) {
                    $ctx['check_in'] = $date->toDateString();
                }
            } catch (\Throwable) {
            }
        }
        $durationType = $request->query('duration_type');
        if (is_string($durationType) && in_array($durationType, ['daily', 'weekly', 'monthly'], true)) {
            $ctx['duration_type'] = $durationType;
        }
        $durationCount = $request->query('duration_count');
        if (is_numeric($durationCount)) {
            $ctx['duration_count'] = max(1, min(30, (int) $durationCount));
        }
        $guests = $request->query('guests');
        if (is_numeric($guests)) {
            $ctx['guests'] = max(1, min(20, (int) $guests));
        }
        $gender = $request->query('gender_preference');
        if (is_string($gender) && in_array($gender, ['male', 'female', 'any'], true)) {
            $ctx['gender_preference'] = $gender;
        }

        return $ctx;
    }
}

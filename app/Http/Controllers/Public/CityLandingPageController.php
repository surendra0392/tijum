<?php

declare(strict_types=1);

namespace App\Http\Controllers\Public;

use App\Enums\PropertyGenderPolicy;
use App\Enums\PropertyOperationalStatus;
use App\Http\Controllers\Controller;
use App\Models\City;
use App\Models\Property;
use App\Models\PropertyCategory;
use App\Services\PropertyPublicData;
use App\Services\PropertySearchCustomerData;
use App\Services\PropertySearchEligibility;
use App\Services\Seo\SeoService;
use App\Services\StayTimingPolicy;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class CityLandingPageController extends Controller
{
    public function __construct(
        private readonly PropertySearchEligibility $eligibility,
        private readonly PropertyPublicData $publicData,
        private readonly PropertySearchCustomerData $customerData,
        private readonly StayTimingPolicy $timing,
        private readonly SeoService $seoService,
    ) {}

    public function show(string $citySlug): Response
    {
        $city = City::query()
            ->where('is_active', true)
            ->where(static function ($q) use ($citySlug): void {
                $q->where('slug', $citySlug)
                    ->orWhereRaw('LOWER(name) = ?', [strtolower(str_replace('-', ' ', $citySlug))]);
            })
            ->first();

        if ($city === null) {
            throw new NotFoundHttpException('City page not found.');
        }

        $cityData = $this->getCityEditorialData($city->name);
        $cityData['description'] = $cityData['intro'] ?? '';
        $cityData['neighborhoods'] = $cityData['popular_neighborhoods'] ?? [];
        $cityData['food_inclusions'] = [
            'Property-Configured Meal Inclusions Shown Per Listing',
            'Property-Declared Meal Schedule (Breakfast, Lunch and/or Dinner)',
            'Vegetarian & Non-Vegetarian Options Declared by Host',
            'Kitchen Standards and Operational Readiness Verified',
        ];

        // Fetch genuine available properties in this city
        $properties = Property::query()
            ->where('city_id', $city->id)
            ->where('status', PropertyOperationalStatus::Active)
            ->where('is_verified', true)
            ->where('booking_eligible', true)
            ->with(['city', 'category', 'roomTypes', 'media', 'ratingSummary', 'amenityAssignments.amenity.category'])
            ->take(24)
            ->get()
            ->map(function (Property $p) {
                $meals = [];
                if ($p->breakfast_included) {
                    $meals[] = 'Breakfast';
                }
                if ($p->lunch_included) {
                    $meals[] = 'Lunch';
                }
                if ($p->dinner_included) {
                    $meals[] = 'Dinner';
                }

                $policies = $p->roomTypes
                    ->map(static fn ($r): string => $r->gender_policy instanceof PropertyGenderPolicy ? $r->gender_policy->value : (string) $r->gender_policy)
                    ->unique()
                    ->filter()
                    ->values();

                $genderEligibility = match ($policies->count()) {
                    1 => match ($policies->first()) {
                        'male_only' => 'Male Only',
                        'female_only' => 'Female Only',
                        default => 'Both',
                    },
                    default => 'Both',
                };

                $minDaily = $p->roomTypes->where('daily_rate_minor', '>', 0)->min('daily_rate_minor');
                $minWeekly = $p->roomTypes->where('weekly_rate_minor', '>', 0)->min('weekly_rate_minor');
                $minMonthly = $p->roomTypes->where('monthly_rate_minor', '>', 0)->min('monthly_rate_minor');

                $dailyPaise = $minDaily ?: ($minMonthly ? (int) round($minMonthly / 30) : ($minWeekly ? (int) round($minWeekly / 7) : 50000));
                $weeklyPaise = $minWeekly ?: ($dailyPaise ? (int) ($dailyPaise * 7) : ($minMonthly ? (int) round($minMonthly / 4) : 350000));
                $monthlyPaise = $minMonthly ?: ($dailyPaise ? (int) ($dailyPaise * 30) : 1500000);

                $reviewCount = (int) ($p->ratingSummary?->published_review_count ?? 0);
                $avgRating = $reviewCount > 0 && $p->ratingSummary?->average_rating !== null
                    ? (float) $p->ratingSummary->average_rating
                    : null;

                return [
                    'id' => $p->id,
                    'name' => $p->name,
                    'slug' => $p->slug,
                    'category' => $p->category ? ['name' => $p->category->name] : null,
                    'address_line' => $p->address_line_1,
                    'locality' => $p->locality ?: $p->city?->name,
                    'gender_eligibility' => $genderEligibility,
                    'starting_price_paise' => $dailyPaise,
                    'daily_price_paise' => $dailyPaise,
                    'weekly_price_paise' => $weeklyPaise,
                    'monthly_price_paise' => $monthlyPaise,
                    'rating_average' => $avgRating,
                    'reviews_count' => $reviewCount,
                    'cover_image_url' => $p->coverImageUrl(),
                    'property_amenities' => $this->customerData->approvedPropertyAmenities($p),
                    'food_provided' => (bool) $p->food_provided,
                    'breakfast_included' => (bool) $p->breakfast_included,
                    'lunch_included' => (bool) $p->lunch_included,
                    'dinner_included' => (bool) $p->dinner_included,
                    'included_meals' => $meals,
                    'included_meals_label' => ! empty($meals) ? implode(' • ', $meals) : 'Food Included',
                    'latitude' => $p->latitude !== null ? (float) $p->latitude : null,
                    'longitude' => $p->longitude !== null ? (float) $p->longitude : null,
                ];
            })
            ->values();

        $canonical = url("/stays-in-{$city->slug}");
        $title = "Hostels/PG, Homestays & Co-Living in {$city->name} | TIJUM";
        $description = "Find verified Hostels/PG, Homestays, and Co-Living spaces in {$city->name} with property-specific food flags and transparent pricing. Zero broker fees.";

        $breadcrumbs = [
            ['name' => 'Explore Stays', 'url' => route('public.explore')],
            ['name' => "Stays in {$city->name}", 'url' => $canonical],
        ];

        $seo = $this->seoService->buildPayload(
            title: $title,
            description: $description,
            canonical: $canonical,
            structuredData: [
                '@context' => 'https://schema.org',
                '@graph' => [
                    $this->seoService->organizationSchema(),
                    $this->seoService->breadcrumbSchema($breadcrumbs),
                    [
                        '@type' => 'ItemList',
                        'name' => "Recommended Stays in {$city->name}",
                        'description' => "Verified Hostels/PG, Homestays, and Co-Living in {$city->name} with property-specific food flags.",
                        'numberOfItems' => count($properties),
                    ],
                    $this->seoService->faqSchema($cityData['faqs']),
                ],
            ],
        );

        return Inertia::render('public/cities/show', [
            'city' => [
                'id' => $city->id,
                'name' => $city->name,
                'state' => $city->state,
                'slug' => $city->slug,
            ],
            'categories' => PropertyCategory::query()->where('is_active', true)->orderBy('sort_order')->get(['id', 'name', 'slug']),
            'editorial' => $cityData,
            'properties' => $properties,
            'timing' => $this->timing->timingSummary(),
            'seo' => $seo,
        ]);
    }

    /**
     * @return array{
     *     tagline: string,
     *     intro: string,
     *     popular_neighborhoods: list<array{name: string, description: string}>,
     *     faqs: list<array{question: string, answer: string}>,
     * }
     */
    private function getCityEditorialData(string $cityName): array
    {
        return match (strtolower($cityName)) {
            'hyderabad' => [
                'tagline' => 'Telangana’s vibrant IT & education powerhouse',
                'intro' => 'Whether you are interning in HITEC City, studying near Osmania University, or preparing for exams in Ashok Nagar, finding accommodation with clear room options, amenities, and meal arrangements is essential. TIJUM features Hostels/PG, Homestays, and Co-Living spaces across Hyderabad with property-specific food and facility details.',
                'popular_neighborhoods' => [
                    ['name' => 'Madhapur & Gachibowli', 'description' => 'The heart of Cyberabad, close to IT parks, co-working spaces, and metro stations.'],
                    ['name' => 'Ameerpet & SR Nagar', 'description' => 'Hyderabad’s premier training hub, popular with software trainees and competitive exam aspirants.'],
                    ['name' => 'Kondapur & Kukatpally', 'description' => 'Residential belts with peaceful environments, convenient shopping, and direct transit.'],
                    ['name' => 'Dilsukhnagar & LB Nagar', 'description' => 'Established educational and coaching corridors in Eastern Hyderabad.'],
                ],
                'faqs' => [
                    [
                        'question' => 'Is food included in Hyderabad bookings on TIJUM?',
                        'answer' => 'Search-eligible properties on TIJUM provide food. You will see property-specific food flags highlighting exact meal inclusions (Breakfast, Lunch, Dinner) clearly on the property profile before booking.',
                    ],
                    [
                        'question' => 'What accommodation categories are available in Hyderabad?',
                        'answer' => 'You can book Hostels/PG, Homestays, and modern Co-Living spaces across Hyderabad with flexible daily, weekly, and monthly options.',
                    ],
                    [
                        'question' => 'What are the check-in and checkout timings in Hyderabad?',
                        'answer' => 'All TIJUM stays follow our standard stay policy: check-in is at 09:00 AM and checkout is at 08:00 AM. Early check-in from 07:00 AM is available upon host confirmation.',
                    ],
                    [
                        'question' => 'Are both AC and Non-AC room types available in Hyderabad?',
                        'answer' => 'Yes. Properties offer diverse room sharing configurations from single occupancy to shared rooms, in both AC and Non-AC options.',
                    ],
                ],
            ],
            'vijayawada' => [
                'tagline' => 'Andhra Pradesh’s commercial and cultural hub on the Krishna River',
                'intro' => 'Vijayawada attracts ambitious students, medical professionals, and trade executives every year. Staying in Hostels/PG, Homestays, or Co-Living spaces with property-specific food flags relieves you from daily cooking and messy tiffin arrangements, allowing you to focus on your studies and career.',
                'popular_neighborhoods' => [
                    ['name' => 'Benz Circle & MG Road', 'description' => 'The prime commercial center with seamless transit, banks, and dining hubs.'],
                    ['name' => 'Moghalrajpuram & Labbipet', 'description' => 'Close to top colleges, hospitals, and educational institutions.'],
                    ['name' => 'Governorpet & Besant Road', 'description' => 'Historic market core with quick access to the railway station and bus terminals.'],
                    ['name' => 'Patamata & Auto Nagar', 'description' => 'Thriving residential and business district with high connectivity.'],
                ],
                'faqs' => [
                    [
                        'question' => 'Are meals freshly prepared at Vijayawada partner properties?',
                        'answer' => 'Yes. Partner Hostels/PG, Homestays, and Co-Living properties prepare fresh South Indian and homestyle meals daily, adhering to strict hygiene guidelines with property-specific food flags.',
                    ],
                    [
                        'question' => 'Can I book accommodation for short-term stays in Vijayawada?',
                        'answer' => 'Yes. TIJUM supports daily, weekly, and monthly stay durations across Hostels/PG, Homestays, and Co-Living.',
                    ],
                ],
            ],
            'guntur' => [
                'tagline' => 'Andhra Pradesh’s premier educational and medical coaching capital',
                'intro' => 'Guntur is renowned for its world-class medical academies, engineering institutions, and agricultural commerce. For students spending long hours at coaching centers, TIJUM features Hostels/PG, Homestays, and Co-Living spaces with property-specific room details and meal arrangements.',
                'popular_neighborhoods' => [
                    ['name' => 'Arundalpet & Brodipet', 'description' => 'The buzzing nerve center of coaching institutes, libraries, and student amenities.'],
                    ['name' => 'Lakshmipuram', 'description' => 'Upscale residential neighborhood with peaceful study surroundings.'],
                    ['name' => 'Koretipadu', 'description' => 'Close to medical colleges, healthcare institutes, and transit routes.'],
                    ['name' => 'Vidyanagar', 'description' => 'A student-friendly enclave with parks, markets, and bookshops.'],
                ],
                'faqs' => [
                    [
                        'question' => 'How does TIJUM help students in Guntur save money?',
                        'answer' => 'By bundling daily meals into transparent stay pricing and displaying property-specific food flags, TIJUM eliminates the unpredictable cost of daily outside meals and third-party tiffin services.',
                    ],
                    [
                        'question' => 'What accommodation types can I find in Guntur?',
                        'answer' => 'TIJUM offers student-friendly Hostels/PG, family-run Homestays, and modern Co-Living spaces close to Arundalpet, Brodipet, and Lakshmipuram.',
                    ],
                    [
                        'question' => 'Are the property reviews in Guntur verified?',
                        'answer' => 'Yes. Only customers who have completed a paid stay on TIJUM can submit a review, displaying a Verified Booking badge.',
                    ],
                ],
            ],
            default => [ // Visakhapatnam
                'tagline' => 'The City of Destiny — Coastal industrial and educational leader',
                'intro' => 'Visakhapatnam blends serene coastal living with thriving universities, IT parks, and heavy industrial centers. TIJUM features Hostels/PG, Homestays, and Co-Living spaces with property details, room options, and configured meal arrangements.',
                'popular_neighborhoods' => [
                    ['name' => 'MVP Colony', 'description' => 'One of Asia’s largest planned residential layouts, safe and student-friendly.'],
                    ['name' => 'Dwaraka Nagar & Complex', 'description' => 'Central hub near RTC Complex, coaching institutes, and transit stations.'],
                    ['name' => 'Siripuram & AU Campus Area', 'description' => 'Vibrant university atmosphere close to Andhra University and beachfront avenues.'],
                    ['name' => 'Rushikonda & Madhurawada', 'description' => 'IT and tech corridor with modern coastal PG facilities.'],
                ],
                'faqs' => [
                    [
                        'question' => 'Are stays near Andhra University and IT corridors food-inclusive?',
                        'answer' => 'Yes, our partner Hostels/PG, Homestays, and Co-Living properties in Visakhapatnam offer property-specific food flags for breakfast, lunch, and/or dinner as declared on their property profiles.',
                    ],
                    [
                        'question' => 'What if the food or room differs from the booking in Vizag?',
                        'answer' => 'TIJUM Customer Protection provides prompt problem reporting, alternative accommodation assistance, and fair refund support.',
                    ],
                ],
            ],
        };
    }
}

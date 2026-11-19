<?php

declare(strict_types=1);

namespace App\Http\Controllers\Public;

use App\Enums\BannerPlacement;
use App\Enums\PropertyOperationalStatus;
use App\Http\Controllers\Controller;
use App\Models\MarketingBanner;
use App\Models\Property;
use App\Services\PropertySearchCustomerData;
use App\Services\PropertySearchEligibility;
use App\Services\Seo\SeoService;
use App\Services\Seo\SitemapService;
use App\Services\StayTimingPolicy;
use Illuminate\Http\Response as HttpResponse;
use Inertia\Inertia;
use Inertia\Response;

class PublicPageController extends Controller
{
    private const OG_IMAGE_PATH = '/images/public/og-tijum-cover.jpg';

    public function __construct(
        private readonly PropertySearchEligibility $eligibility,
        private readonly PropertySearchCustomerData $customerData,
        private readonly StayTimingPolicy $timing,
        private readonly SeoService $seoService,
        private readonly SitemapService $sitemapService,
    ) {}

    public function home(): Response
    {
        $today = now($this->timing->timezone())->toDateString();
        $cities = $this->eligibility->activeCities();

        $heroBanners = MarketingBanner::query()
            ->active()
            ->placement(BannerPlacement::HomepageHero)
            ->orderBy('display_order')
            ->get();

        $stripBanners = MarketingBanner::query()
            ->active()
            ->placement(BannerPlacement::HomepageStrip)
            ->orderBy('display_order')
            ->get();

        $featuredListings = Property::query()
            ->where('is_verified', true)
            ->where('booking_eligible', true)
            ->where('status', PropertyOperationalStatus::Active->value)
            ->with([
                'city',
                'category',
                'roomTypes' => fn ($q) => $q->where('is_active', true),
                'media',
                'ratingSummary',
                'amenityAssignments.amenity.category',
            ])
            ->latest('approved_at')
            ->take(6)
            ->get();

        $formattedProperties = $featuredListings
            ->map(fn (Property $property): array => $this->customerData->summaryCard($property))
            ->all();

        return Inertia::render('welcome', [
            'search' => [
                'cities' => $cities,
                'locations' => $this->eligibility->searchLocations($cities),
                'categories' => $this->eligibility->activeCategories(),
                'durations' => config('tijum.pricing.durations', []),
                'timing' => $this->timing->timingSummary(),
                'defaults' => [
                    'city' => $cities[0]['id'] ?? null,
                    'check_in' => $today,
                    'duration_type' => 'daily',
                    'duration_count' => 1,
                    'guests' => 1,
                ],
            ],
            'heroBanners' => $heroBanners,
            'stripBanners' => $stripBanners,
            'featuredProperties' => $formattedProperties,
            'properties' => $formattedProperties,
            'seo' => $this->buildSeoPayload(
                title: 'TIJUM — Stay easy. Eat well. Spend less.',
                description: 'Discover Hostels/PG, Homestays, and Co-Living accommodation across Hyderabad, Guntur, Vijayawada, and Visakhapatnam with property-specific food and room details.',
                canonical: route('home'),
                structuredData: [
                    '@context' => 'https://schema.org',
                    '@graph' => [
                        $this->organizationSchema(),
                        [
                            '@type' => 'WebSite',
                            'name' => 'TIJUM',
                            'url' => route('home'),
                            'description' => 'Accommodation booking marketplace for Hostels/PG, Homestays, and Co-Living with property-specific room options and food flags.',
                        ],
                    ],
                ],
            ),
        ]);
    }

    public function howItWorks(): Response
    {
        return Inertia::render('public/how-it-works', [
            'timing' => $this->timing->timingSummary(),
            'seo' => $this->buildSeoPayload(
                title: 'How It Works — Hostels/PG, Homestays & Co-Living | TIJUM',
                description: 'Understand how TIJUM connects guests with Hostels/PG, Homestays, and Co-Living stays with property-specific food flags, daily to monthly durations, check-in timings, and online payments.',
                canonical: route('public.how-it-works'),
                structuredData: [
                    '@context' => 'https://schema.org',
                    '@graph' => [
                        $this->organizationSchema(),
                        $this->breadcrumbSchema('How It Works', route('public.how-it-works')),
                    ],
                ],
            ),
        ]);
    }

    public function about(): Response
    {
        return Inertia::render('public/about', [
            'seo' => $this->buildSeoPayload(
                title: 'About TIJUM — Hostels/PG, Homestays & Co-Living Marketplace',
                description: 'Learn about TIJUM\'s mission to connect guests with Hostels/PG, Homestays, and Co-Living accommodation across Hyderabad, Guntur, Vijayawada, and Visakhapatnam with property-specific food and room details.',
                canonical: route('public.about'),
                structuredData: [
                    '@context' => 'https://schema.org',
                    '@graph' => [
                        $this->organizationSchema(),
                        $this->breadcrumbSchema('About TIJUM', route('public.about')),
                    ],
                ],
            ),
        ]);
    }

    public function contact(): Response
    {
        /** @var array<string, string> $contactConfig */
        $contactConfig = config('tijum.contact', [
            'phone' => '8142334033',
            'whatsapp' => '8142334033',
            'email' => 'support@tijum.com',
            'partners_email' => 'partners@tijum.com',
            'hours' => 'Monday – Saturday: 9:00 AM – 8:00 PM IST',
            'address' => 'TIJUM Marketplace Pvt. Ltd., Level 4, Cyber Gateway, HITEC City, Hyderabad, Telangana 500081, India',
        ]);

        /** @var array<string, array{username?: string, number?: string, url: string}> $socialConfig */
        $socialConfig = config('tijum.social', [
            'facebook' => [
                'username' => 'tijum.official',
                'url' => 'https://facebook.com/tijum.official',
            ],
            'instagram' => [
                'username' => 'tijum.official',
                'url' => 'https://instagram.com/tijum.official',
            ],
            'whatsapp' => [
                'number' => '8142334033',
                'url' => 'https://wa.me/918142334033',
            ],
        ]);

        return Inertia::render('public/contact', [
            'contact' => $contactConfig,
            'social' => $socialConfig,
            'seo' => $this->buildSeoPayload(
                title: 'Contact Us — Customer Support, Partner Desk & WhatsApp | TIJUM',
                description: 'Contact TIJUM via WhatsApp (8142334033), call, or email support@tijum.com. Connect with us on Instagram and Facebook (tijum.official) for accommodations across Hyderabad, Vijayawada, Guntur, and Visakhapatnam.',
                canonical: route('public.contact'),
                structuredData: [
                    '@context' => 'https://schema.org',
                    '@graph' => [
                        $this->organizationSchema(),
                        $this->breadcrumbSchema('Contact Us', route('public.contact')),
                        [
                            '@type' => 'ContactPage',
                            'name' => 'TIJUM Contact & Customer Support',
                            'url' => route('public.contact'),
                            'description' => 'Contact channel and support desk for TIJUM accommodation marketplace.',
                        ],
                    ],
                ],
            ),
        ]);
    }

    public function grievanceRedressal(): Response
    {
        /** @var array<string, string> $officer */
        $officer = config('tijum.customer_protection.grievance_officer', []);
        /** @var array<string, int> $slas */
        $slas = config('tijum.customer_protection.sla', [
            'acknowledgement_hours' => 48,
            'resolution_days' => 30,
        ]);

        return Inertia::render('public/grievance-redressal', [
            'grievanceOfficer' => $officer,
            'slas' => $slas,
            'seo' => $this->buildSeoPayload(
                title: 'Statutory Grievance Redressal Mechanism — TIJUM',
                description: 'Official Grievance Redressal mechanism, nodal contacts, and consumer protection policies under the Consumer Protection Act 2019 and E-Commerce Rules.',
                canonical: route('public.grievance-redressal'),
                structuredData: [
                    '@context' => 'https://schema.org',
                    '@graph' => [
                        $this->organizationSchema(),
                        $this->breadcrumbSchema('Grievance Redressal', route('public.grievance-redressal')),
                    ],
                ],
            ),
        ]);
    }

    public function terms(): Response
    {
        return Inertia::render('public/terms', [
            'seo' => $this->buildSeoPayload(
                title: 'Terms of Service & Platform Agreement — TIJUM',
                description: 'Official Terms of Service, Booking Conditions, and Partner Policies for guests, residents, and property partners using the TIJUM accommodation marketplace.',
                canonical: route('public.terms'),
                structuredData: [
                    '@context' => 'https://schema.org',
                    '@graph' => [
                        $this->organizationSchema(),
                        $this->breadcrumbSchema('Terms of Service', route('public.terms')),
                    ],
                ],
            ),
        ]);
    }

    public function privacy(): Response
    {
        return Inertia::render('public/privacy', [
            'seo' => $this->buildSeoPayload(
                title: 'Privacy Policy & Data Protection — TIJUM',
                description: 'Official Privacy Policy detailing mobile phone verification, user data handling, and privacy practices under Indian information technology and digital data protection laws.',
                canonical: route('public.privacy'),
                structuredData: [
                    '@context' => 'https://schema.org',
                    '@graph' => [
                        $this->organizationSchema(),
                        $this->breadcrumbSchema('Privacy Policy', route('public.privacy')),
                    ],
                ],
            ),
        ]);
    }

    public function becomeAPartner(): Response
    {
        return Inertia::render('public/become-a-partner', [
            'seo' => $this->buildSeoPayload(
                title: 'Become a Partner — List Your Hostel, PG, Homestay, or Co-Living | TIJUM',
                description: 'Partner with TIJUM to reach customers seeking Hostels/PG, Homestays, and Co-Living accommodation across our launch cities.',
                canonical: route('public.become-a-partner'),
                structuredData: [
                    '@context' => 'https://schema.org',
                    '@graph' => [
                        $this->organizationSchema(),
                        $this->breadcrumbSchema('Become a Partner', route('public.become-a-partner')),
                    ],
                ],
            ),
        ]);
    }

    public function faqs(): Response
    {
        return Inertia::render('public/faqs', [
            'timing' => $this->timing->timingSummary(),
            'seo' => $this->buildSeoPayload(
                title: 'Frequently Asked Questions — Stays, Food Flags & Check-In | TIJUM',
                description: 'Answers about TIJUM\'s property-specific food flags, Hostels/PG, Homestays, and Co-Living stays, standard timing, early check-in rules, and partners.',
                canonical: route('public.faqs'),
                structuredData: [
                    '@context' => 'https://schema.org',
                    '@graph' => [
                        $this->organizationSchema(),
                        $this->breadcrumbSchema('FAQs', route('public.faqs')),
                        [
                            '@type' => 'FAQPage',
                            'mainEntity' => [
                                [
                                    '@type' => 'Question',
                                    'name' => 'What is TIJUM?',
                                    'acceptedAnswer' => [
                                        '@type' => 'Answer',
                                        'text' => 'TIJUM is an accommodation aggregation and booking marketplace connecting customers with verified Hostels/PG, Homestays, and Co-Living spaces, featuring transparent property-specific food flags on every listing.',
                                    ],
                                ],
                                [
                                    '@type' => 'Question',
                                    'name' => 'What accommodation categories are available on TIJUM?',
                                    'acceptedAnswer' => [
                                        '@type' => 'Answer',
                                        'text' => 'TIJUM consolidates accommodation into three canonical categories: Hostels/PG (hostel and paying guest accommodation with room options and meal arrangements shown per property), Homestays (accommodation in residential homes with property details and available services shown per property), and Co-Living (shared-living accommodation with room options and amenities shown per space).',
                                    ],
                                ],
                                [
                                    '@type' => 'Question',
                                    'name' => 'Is food included in every bookable stay?',
                                    'acceptedAnswer' => [
                                        '@type' => 'Answer',
                                        'text' => 'Search-eligible TIJUM stays provide food and display property-specific food flags for breakfast, lunch, and dinner. Exact meal inclusions are declared by each property and clearly highlighted before booking.',
                                    ],
                                ],
                                [
                                    '@type' => 'Question',
                                    'name' => 'What are property-specific food flags?',
                                    'acceptedAnswer' => [
                                        '@type' => 'Answer',
                                        'text' => 'Property-specific food flags indicate whether food is provided and distinguish individual meal offerings (Breakfast, Lunch, Dinner). Each property specifies its meal schedules, so guests know exactly what to expect before booking.',
                                    ],
                                ],
                                [
                                    '@type' => 'Question',
                                    'name' => 'What are the standard check-in and checkout timings?',
                                    'acceptedAnswer' => [
                                        '@type' => 'Answer',
                                        'text' => sprintf(
                                            'Standard check-in is %s and checkout is %s on the stay end date. Eligible room types may allow early check-in from %s subject to room availability and operational readiness; earlier arrival is not permitted.',
                                            $this->timing->getStandardCheckInTime(),
                                            $this->timing->getStandardCheckOutTime(),
                                            $this->timing->getEarliestEarlyCheckInTime(),
                                        ),
                                    ],
                                ],
                            ],
                        ],
                    ],
                ],
            ),
        ]);
    }

    public function sitemap(): HttpResponse
    {
        $xml = $this->sitemapService->generateXml();

        return response($xml, 200, [
            'Content-Type' => 'application/xml; charset=UTF-8',
        ]);
    }

    public function robots(): HttpResponse
    {
        if (! app()->environment('production')) {
            $body = "User-agent: *\nDisallow: /\n";
        } else {
            $lines = [
                'User-agent: *',
                'Allow: /',
                'Disallow: /admin',
                'Disallow: /owner',
                'Disallow: /_dev',
                'Disallow: /settings',
                'Disallow: /dashboard',
                'Disallow: /reservations',
                'Disallow: /login',
                'Disallow: /register',
                'Disallow: /forgot-password',
                'Disallow: /reset-password',
                'Disallow: /two-factor-challenge',
                'Disallow: /verify-email',
                'Disallow: /passkeys',
                'Allow: /search?category=',
                'Disallow: /search?',
                'Disallow: /api/',
                'Sitemap: '.route('public.sitemap'),
            ];

            $body = implode("\n", $lines)."\n";
        }

        return response($body, 200, [
            'Content-Type' => 'text/plain; charset=UTF-8',
        ]);
    }

    /**
     * @param  array<string, mixed>  $structuredData
     * @return array<string, mixed>
     */
    private function buildSeoPayload(
        string $title,
        string $description,
        string $canonical,
        array $structuredData,
    ): array {
        return [
            'title' => $title,
            'description' => $description,
            'canonical' => $canonical,
            'ogType' => 'website',
            'ogImage' => url(self::OG_IMAGE_PATH),
            'structuredData' => $structuredData,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function organizationSchema(): array
    {
        return [
            '@type' => 'Organization',
            'name' => 'TIJUM',
            'url' => route('home'),
            'slogan' => 'Stay easy. Eat well. Spend less.',
            'description' => 'Accommodation aggregation and booking marketplace connecting customers with verified Hostels/PG, Homestays, and Co-Living spaces with property-specific food flags.',
            'areaServed' => [
                ['@type' => 'City', 'name' => 'Hyderabad'],
                ['@type' => 'City', 'name' => 'Guntur'],
                ['@type' => 'City', 'name' => 'Vijayawada'],
                ['@type' => 'City', 'name' => 'Visakhapatnam'],
            ],
            'sameAs' => [
                'https://facebook.com/tijum.official',
                'https://instagram.com/tijum.official',
                'https://wa.me/918142334033',
            ],
            'contactPoint' => [
                '@type' => 'ContactPoint',
                'telephone' => '+91-8142334033',
                'contactType' => 'customer service',
                'areaServed' => 'IN',
                'availableLanguage' => ['English', 'Telugu', 'Hindi'],
            ],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function breadcrumbSchema(string $name, string $url): array
    {
        return [
            '@type' => 'BreadcrumbList',
            'itemListElement' => [
                [
                    '@type' => 'ListItem',
                    'position' => 1,
                    'name' => 'Home',
                    'item' => route('home'),
                ],
                [
                    '@type' => 'ListItem',
                    'position' => 2,
                    'name' => $name,
                    'item' => $url,
                ],
            ],
        ];
    }
}

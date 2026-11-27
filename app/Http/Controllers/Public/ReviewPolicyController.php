<?php

declare(strict_types=1);

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Models\PlatformSetting;
use App\Services\Seo\SeoService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ReviewPolicyController extends Controller
{
    public function __construct(
        private readonly SeoService $seoService,
    ) {}

    public function show(Request $request): Response
    {
        $canonical = route('review-policy');

        return Inertia::render('public/review-policy', [
            'submissionWindowDays' => (int) config('tijum.reviews.submission_window_days', 30),
            'editWindowDays' => (int) config('tijum.reviews.edit_window_days', 7),
            'maxContentLength' => (int) config('tijum.reviews.max_content_length', 3000),
            'grievanceOfficer' => PlatformSetting::getGrievanceOfficer(),
            'seo' => $this->seoService->buildPayload(
                title: 'Verified Review Policy & Moderation Standards',
                description: 'How TIJUM verifies stay-backed reviews, prevents fake ratings, moderates content, and handles BIS IS 19000 review disputes.',
                canonical: $canonical,
                structuredData: [
                    '@context' => 'https://schema.org',
                    '@graph' => [
                        $this->seoService->organizationSchema(),
                        $this->seoService->breadcrumbSchema([
                            ['name' => 'Review Policy', 'url' => $canonical],
                        ]),
                    ],
                ],
            ),
        ]);
    }
}

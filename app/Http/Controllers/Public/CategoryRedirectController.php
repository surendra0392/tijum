<?php

declare(strict_types=1);

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class CategoryRedirectController extends Controller
{
    /**
     * Legacy category slug to canonical category slug mapping ledger.
     *
     * @var array<string, string>
     */
    private const LEGACY_MAPPING = [
        // Hostels / PG consolidation
        'independent-hostel' => 'hostels-pg',
        'independent-hostels' => 'hostels-pg',
        'pg-accommodation' => 'hostels-pg',
        'pg-accommodations' => 'hostels-pg',
        'hostel' => 'hostels-pg',
        'hostels' => 'hostels-pg',
        'pg' => 'hostels-pg',
        'pgs' => 'hostels-pg',
        'hostels-pg' => 'hostels-pg',
        'hostel-pg' => 'hostels-pg',

        // Homestays
        'homestay' => 'homestays',
        'homestays' => 'homestays',

        // Co-Living
        'co-living' => 'co-living',
        'coliving' => 'co-living',
        'shared-living' => 'co-living',

        // Ambiguous legacy accommodation types remapped to Hostels/PG
        'hotel' => 'hostels-pg',
        'hotels' => 'hostels-pg',
        'lodge' => 'hostels-pg',
        'lodges' => 'hostels-pg',
        'guest-house' => 'hostels-pg',
        'guest-houses' => 'hostels-pg',
    ];

    /**
     * Redirect legacy category routes (/categories/{slug} and /category/{slug})
     * to the canonical category search route with HTTP 301.
     */
    public function handleCategory(string $slug, Request $request): RedirectResponse
    {
        $normalizedSlug = strtolower(trim($slug));
        $canonicalSlug = self::LEGACY_MAPPING[$normalizedSlug] ?? 'hostels-pg';

        $params = $request->query();
        $params['category'] = $canonicalSlug;

        return redirect()->route('public.search', $params, 301);
    }

    /**
     * Redirect legacy category-in-city routes (e.g. /pgs-in-{citySlug}, /hotels-in-{citySlug})
     * to the canonical city landing page (/stays-in-{citySlug}) with HTTP 301.
     */
    public function handleCity(string $category, string $citySlug, Request $request): RedirectResponse
    {
        return redirect()->route('public.cities.stays', ['citySlug' => $citySlug], 301);
    }
}

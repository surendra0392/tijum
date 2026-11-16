<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\Admin;
use App\Models\City;
use App\Models\SeoRedirect;
use Illuminate\Database\Seeder;

class CategoryRedirectSeeder extends Seeder
{
    /**
     * Run the database seeds for canonical and legacy accommodation category redirects.
     */
    public function run(): void
    {
        $admin = Admin::query()->first();
        $adminId = $admin?->id;

        $redirects = [
            // Plural /categories/ legacy routes
            ['source_path' => '/categories/independent-hostel', 'destination_url' => '/search?category=hostels-pg'],
            ['source_path' => '/categories/independent-hostels', 'destination_url' => '/search?category=hostels-pg'],
            ['source_path' => '/categories/pg-accommodation', 'destination_url' => '/search?category=hostels-pg'],
            ['source_path' => '/categories/pg-accommodations', 'destination_url' => '/search?category=hostels-pg'],
            ['source_path' => '/categories/hostel', 'destination_url' => '/search?category=hostels-pg'],
            ['source_path' => '/categories/hostels', 'destination_url' => '/search?category=hostels-pg'],
            ['source_path' => '/categories/pg', 'destination_url' => '/search?category=hostels-pg'],
            ['source_path' => '/categories/pgs', 'destination_url' => '/search?category=hostels-pg'],
            ['source_path' => '/categories/homestay', 'destination_url' => '/search?category=homestays'],
            ['source_path' => '/categories/homestays', 'destination_url' => '/search?category=homestays'],
            ['source_path' => '/categories/coliving', 'destination_url' => '/search?category=co-living'],
            ['source_path' => '/categories/co-living', 'destination_url' => '/search?category=co-living'],
            ['source_path' => '/categories/hotels', 'destination_url' => '/search?category=hostels-pg'],
            ['source_path' => '/categories/lodges', 'destination_url' => '/search?category=hostels-pg'],
            ['source_path' => '/categories/guest-houses', 'destination_url' => '/search?category=hostels-pg'],

            // Singular /category/ legacy routes
            ['source_path' => '/category/independent-hostel', 'destination_url' => '/search?category=hostels-pg'],
            ['source_path' => '/category/independent-hostels', 'destination_url' => '/search?category=hostels-pg'],
            ['source_path' => '/category/pg-accommodation', 'destination_url' => '/search?category=hostels-pg'],
            ['source_path' => '/category/pg-accommodations', 'destination_url' => '/search?category=hostels-pg'],
            ['source_path' => '/category/hostel', 'destination_url' => '/search?category=hostels-pg'],
            ['source_path' => '/category/hostels', 'destination_url' => '/search?category=hostels-pg'],
            ['source_path' => '/category/pg', 'destination_url' => '/search?category=hostels-pg'],
            ['source_path' => '/category/pgs', 'destination_url' => '/search?category=hostels-pg'],
            ['source_path' => '/category/homestay', 'destination_url' => '/search?category=homestays'],
            ['source_path' => '/category/homestays', 'destination_url' => '/search?category=homestays'],
            ['source_path' => '/category/coliving', 'destination_url' => '/search?category=co-living'],
            ['source_path' => '/category/co-living', 'destination_url' => '/search?category=co-living'],
            ['source_path' => '/category/hotels', 'destination_url' => '/search?category=hostels-pg'],
            ['source_path' => '/category/lodges', 'destination_url' => '/search?category=hostels-pg'],
            ['source_path' => '/category/guest-houses', 'destination_url' => '/search?category=hostels-pg'],

            // Root shortcut redirects
            ['source_path' => '/hostels', 'destination_url' => '/search?category=hostels-pg'],
            ['source_path' => '/pg', 'destination_url' => '/search?category=hostels-pg'],
            ['source_path' => '/pgs', 'destination_url' => '/search?category=hostels-pg'],
            ['source_path' => '/homestays', 'destination_url' => '/search?category=homestays'],
            ['source_path' => '/co-living', 'destination_url' => '/search?category=co-living'],
            ['source_path' => '/coliving', 'destination_url' => '/search?category=co-living'],
        ];

        // Seed city-specific legacy redirects
        $activeCities = City::query()->where('is_active', true)->get();
        $fallbackCitySlugs = ['hyderabad', 'guntur', 'vijayawada', 'visakhapatnam'];
        $citySlugs = $activeCities->isNotEmpty()
            ? $activeCities->pluck('slug')->all()
            : $fallbackCitySlugs;

        $legacyPrefixes = ['hotels', 'lodges', 'guest-houses', 'pgs', 'homestays', 'coliving'];
        foreach ($citySlugs as $citySlug) {
            foreach ($legacyPrefixes as $prefix) {
                $redirects[] = [
                    'source_path' => "/{$prefix}-in-{$citySlug}",
                    'destination_url' => "/hostels-in-{$citySlug}",
                ];
            }
        }

        foreach ($redirects as $item) {
            SeoRedirect::query()->updateOrCreate(
                ['source_path' => $item['source_path']],
                [
                    'destination_url' => $item['destination_url'],
                    'http_status' => 301,
                    'is_active' => true,
                    'admin_id' => $adminId,
                ]
            );
        }
    }
}

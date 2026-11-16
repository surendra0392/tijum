<?php

declare(strict_types=1);

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // 1. Core Platform Foundation
        $this->call([
            PlatformSettingSeeder::class,
            PropertyCategorySeeder::class,
            CitySeeder::class,
            AmenityCatalogueSeeder::class,
            CategoryRedirectSeeder::class,
            RewardsSettingsSeeder::class,
            PromotionalCampaignSeeder::class,
            AdminSeeder::class,
        ]);

        // 2. Full Test & Demo Ecosystem (Properties, Owners, Customers, Bookings, Reviews, Media, and Content)
        if (! app()->isProduction()) {
            $this->call([
                OwnerSeeder::class,
                CustomerSeeder::class,
                PropertySeeder::class,
                ReservationSeeder::class,
                Phase19ContentSeeder::class,
            ]);
        }
    }
}

<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Enums\AmenityAvailability;
use App\Enums\AmenityVerificationStatus;
use App\Enums\OwnerStatus;
use App\Enums\PropertyGenderPolicy;
use App\Enums\PropertyMediaCategory;
use App\Enums\PropertyMediaModerationStatus;
use App\Enums\PropertyMediaPublicationStatus;
use App\Enums\PropertyOperationalStatus;
use App\Enums\PropertyOwnershipArrangement;
use App\Enums\PropertyRoomStatus;
use App\Enums\PropertyRoomTypeMode;
use App\Enums\PropertyVerificationStatus;
use App\Models\Amenity;
use App\Models\City;
use App\Models\Owner;
use App\Models\Property;
use App\Models\PropertyAmenity;
use App\Models\PropertyCategory;
use App\Models\PropertyMedia;
use App\Models\PropertyRatingSummary;
use App\Models\PropertyRoom;
use App\Models\PropertyRoomType;
use App\Models\PropertyRoomTypeAmenity;
use App\Models\PropertyVerificationApplication;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;

class PropertySeeder extends Seeder
{
    /**
     * Seed canonical properties representing all categories, all room types, and all cities with full media assets.
     */
    public function run(): void
    {
        if (app()->isProduction()) {
            $this->command?->warn('PropertySeeder: Skipping demo and test fixture property seeding in production environment.');

            return;
        }

        $this->call([
            PropertyCategorySeeder::class,
            CitySeeder::class,
            AmenityCatalogueSeeder::class,
            OwnerSeeder::class,
        ]);

        $hostelsPg = PropertyCategory::query()->where('slug', PropertyCategory::SLUG_HOSTELS_PG)->firstOrFail();
        $homestays = PropertyCategory::query()->where('slug', PropertyCategory::SLUG_HOMESTAYS)->firstOrFail();
        $coLiving = PropertyCategory::query()->where('slug', PropertyCategory::SLUG_CO_LIVING)->firstOrFail();

        $hyderabad = City::query()->where('slug', 'hyderabad')->firstOrFail();
        $guntur = City::query()->where('slug', 'guntur')->firstOrFail();
        $vijayawada = City::query()->where('slug', 'vijayawada')->firstOrFail();
        $visakhapatnam = City::query()->where('slug', 'visakhapatnam')->firstOrFail();

        $owners = Owner::query()->where('status', OwnerStatus::Active)->get()->keyBy('email');
        $defaultOwner = $owners->first() ?? Owner::query()->firstOrFail();

        $kalyan = $owners->get('owner@tijum.com', $defaultOwner);
        $anitha = $owners->get('anitha.reddy@tijum.com', $defaultOwner);
        $praveen = $owners->get('praveen.varma@tijum.com', $defaultOwner);
        $lakshmi = $owners->get('lakshmi.narayana@tijum.com', $defaultOwner);
        $srinivasa = $owners->get('srinivasa.rao@tijum.com', $defaultOwner);

        // Blueprint of 20 rich properties across all 4 cities and all 3 categories
        $propertiesBlueprint = [
            // ================= HYDERABAD (7 Properties) =================
            [
                'name' => 'Sri Sai Balaji Executive Hostel & PG',
                'category_id' => $hostelsPg->id,
                'city_id' => $hyderabad->id,
                'owner_id' => $kalyan->id,
                'description' => 'Premier executive hostel and paying guest stay in Madhapur with 3 hygienic home-style South Indian meals, high-speed Wi-Fi, biometric security, and 24/7 power backup.',
                'locality' => 'Madhapur',
                'address' => 'Plot 42, Hitech City Main Road, Near Ayyappa Society',
                'pincode' => '500081',
                'contact_name' => 'Kalyan Chakravarthy',
                'contact_phone' => '+919848099888',
                'contact_email' => 'balaji.hostel@tijum.test',
                'latitude' => 17.4485,
                'longitude' => 78.3741,
                'food_provided' => true,
                'breakfast' => true,
                'lunch' => true,
                'dinner' => true,
                'rating' => 4.8,
                'reviews_count' => 32,
                'image_keys' => ['category-hostel', 'food-breakfast', 'category-pg', 'food-dining', 'hero-stay'],
                'room_types' => [
                    [
                        'name' => 'Executive Single Room',
                        'capacity' => 1,
                        'mode' => PropertyRoomTypeMode::Private,
                        'gender' => PropertyGenderPolicy::AllGenders,
                        'price_daily' => 85000,
                        'price_weekly' => 500000,
                        'price_monthly' => 1500000,
                        'rooms_count' => 6,
                    ],
                    [
                        'name' => 'Two Sharing Deluxe AC Room',
                        'capacity' => 2,
                        'mode' => PropertyRoomTypeMode::Shared,
                        'gender' => PropertyGenderPolicy::AllGenders,
                        'price_daily' => 55000,
                        'price_weekly' => 320000,
                        'price_monthly' => 1000000,
                        'rooms_count' => 12,
                    ],
                    [
                        'name' => 'Three Sharing Economy Room',
                        'capacity' => 3,
                        'mode' => PropertyRoomTypeMode::Shared,
                        'gender' => PropertyGenderPolicy::AllGenders,
                        'price_daily' => 40000,
                        'price_weekly' => 240000,
                        'price_monthly' => 750000,
                        'rooms_count' => 8,
                    ],
                ],
            ],
            [
                'name' => 'Jubilee Courtyard Garden Homestay',
                'category_id' => $homestays->id,
                'city_id' => $hyderabad->id,
                'owner_id' => $anitha->id,
                'description' => 'Tranquil boutique homestay in Jubilee Hills with central open-air courtyard, peaceful library lounge, home-cooked regional meals, and secure parking.',
                'locality' => 'Jubilee Hills',
                'address' => 'Road No. 45, Near Durgam Cheruvu',
                'pincode' => '500033',
                'contact_name' => 'Anitha Reddy',
                'contact_phone' => '+919849122334',
                'contact_email' => 'jubilee.courtyard@tijum.test',
                'latitude' => 17.4325,
                'longitude' => 78.4071,
                'food_provided' => true,
                'breakfast' => true,
                'lunch' => false,
                'dinner' => true,
                'rating' => 4.7,
                'reviews_count' => 22,
                'image_keys' => ['category-homestay', 'food-dining', 'hero-stay', 'partner-hospitality'],
                'room_types' => [
                    [
                        'name' => 'Courtyard Master Bedroom',
                        'capacity' => 2,
                        'mode' => PropertyRoomTypeMode::Private,
                        'gender' => PropertyGenderPolicy::AllGenders,
                        'price_daily' => 160000,
                        'price_weekly' => 950000,
                        'price_monthly' => 3000000,
                        'rooms_count' => 4,
                    ],
                ],
            ],
            [
                'name' => 'Hitec CyberNest Co-Living Community',
                'category_id' => $coLiving->id,
                'city_id' => $hyderabad->id,
                'owner_id' => $praveen->id,
                'description' => 'Modern co-living space designed for software engineers, product designers, and founders. Includes dedicated fiber co-working zones, gaming lounge, and chef-curated breakfast.',
                'locality' => 'Kondapur',
                'address' => 'Near Botanical Garden Road, Kondapur',
                'pincode' => '500084',
                'contact_name' => 'Praveen Varma',
                'contact_phone' => '+919866054321',
                'contact_email' => 'cybernest.coliving@tijum.test',
                'latitude' => 17.4682,
                'longitude' => 78.3614,
                'food_provided' => true,
                'breakfast' => true,
                'lunch' => false,
                'dinner' => true,
                'rating' => 4.8,
                'reviews_count' => 54,
                'image_keys' => ['category-pg', 'hero-stay', 'food-breakfast', 'category-hostel', 'city-hyderabad'],
                'room_types' => [
                    [
                        'name' => 'Solo Creator Studio Pod',
                        'capacity' => 1,
                        'mode' => PropertyRoomTypeMode::Private,
                        'gender' => PropertyGenderPolicy::AllGenders,
                        'price_daily' => 125000,
                        'price_weekly' => 750000,
                        'price_monthly' => 2200000,
                        'rooms_count' => 10,
                    ],
                    [
                        'name' => 'Community Twin Suite',
                        'capacity' => 2,
                        'mode' => PropertyRoomTypeMode::Shared,
                        'gender' => PropertyGenderPolicy::AllGenders,
                        'price_daily' => 75000,
                        'price_weekly' => 450000,
                        'price_monthly' => 1350000,
                        'rooms_count' => 15,
                    ],
                ],
            ],
            [
                'name' => 'Financial District Haven Co-Living',
                'category_id' => $coLiving->id,
                'city_id' => $hyderabad->id,
                'owner_id' => $praveen->id,
                'description' => 'All-inclusive co-living community right across Microsoft, Amazon, and Google campuses. 3 warm meals included, gym, rooftop café, and weekend community events.',
                'locality' => 'Nanakramguda',
                'address' => 'Financial District Boulevard, Nanakramguda',
                'pincode' => '500032',
                'contact_name' => 'Praveen Varma',
                'contact_phone' => '+919866054321',
                'contact_email' => 'haven.coliving@tijum.test',
                'latitude' => 17.4194,
                'longitude' => 78.3412,
                'food_provided' => true,
                'breakfast' => true,
                'lunch' => true,
                'dinner' => true,
                'rating' => 4.7,
                'reviews_count' => 41,
                'image_keys' => ['hero-stay', 'category-hostel', 'food-dining', 'partner-hospitality'],
                'room_types' => [
                    [
                        'name' => 'Executive Single Pod',
                        'capacity' => 1,
                        'mode' => PropertyRoomTypeMode::Private,
                        'gender' => PropertyGenderPolicy::AllGenders,
                        'price_daily' => 135000,
                        'price_weekly' => 800000,
                        'price_monthly' => 2400000,
                        'rooms_count' => 8,
                    ],
                    [
                        'name' => 'Shared Double Pod',
                        'capacity' => 2,
                        'mode' => PropertyRoomTypeMode::Shared,
                        'gender' => PropertyGenderPolicy::AllGenders,
                        'price_daily' => 80000,
                        'price_weekly' => 480000,
                        'price_monthly' => 1450000,
                        'rooms_count' => 12,
                    ],
                ],
            ],

            [
                'name' => 'Sannidhi Luxury Women\'s PG & Hostel',
                'category_id' => $hostelsPg->id,
                'city_id' => $hyderabad->id,
                'owner_id' => $anitha->id,
                'description' => 'Dedicated premium women hostel with biometric access, 24/7 CCTV surveillance, female security guards, gym, laundry, and wholesome hygienic meals.',
                'locality' => 'Gachibowli',
                'address' => 'Lane 5, Telecom Nagar, Near DLF Cyber City',
                'pincode' => '500032',
                'contact_name' => 'Anitha Reddy',
                'contact_phone' => '+919849122334',
                'contact_email' => 'sannidhi.womens@tijum.test',
                'latitude' => 17.4401,
                'longitude' => 78.3489,
                'food_provided' => true,
                'breakfast' => true,
                'lunch' => true,
                'dinner' => true,
                'rating' => 4.9,
                'reviews_count' => 45,
                'image_keys' => ['category-pg', 'hero-stay', 'food-breakfast', 'category-homestay', 'partner-hospitality'],
                'room_types' => [
                    [
                        'name' => 'Single Private Studio Suite',
                        'capacity' => 1,
                        'mode' => PropertyRoomTypeMode::Private,
                        'gender' => PropertyGenderPolicy::FemaleOnly,
                        'price_daily' => 110000,
                        'price_weekly' => 650000,
                        'price_monthly' => 1800000,
                        'rooms_count' => 8,
                    ],
                    [
                        'name' => 'Twin Sharing Luxury AC Room',
                        'capacity' => 2,
                        'mode' => PropertyRoomTypeMode::Shared,
                        'gender' => PropertyGenderPolicy::FemaleOnly,
                        'price_daily' => 65000,
                        'price_weekly' => 380000,
                        'price_monthly' => 1150000,
                        'rooms_count' => 14,
                    ],
                ],
            ],

            [
                'name' => 'Cyber Towers Executive Men\'s PG',
                'category_id' => $hostelsPg->id,
                'city_id' => $hyderabad->id,
                'owner_id' => $kalyan->id,
                'description' => 'Clean, professional men stay located right next to Hitec City IT hub with high-speed fiber internet, study tables, lockers, and warm breakfast and dinner.',
                'locality' => 'Hitec City',
                'address' => 'Plot 18, Silicon Valley, Near Cyber Towers',
                'pincode' => '500081',
                'contact_name' => 'Kalyan Chakravarthy',
                'contact_phone' => '+919848099888',
                'contact_email' => 'cybertowers.pg@tijum.test',
                'latitude' => 17.4504,
                'longitude' => 78.3808,
                'food_provided' => true,
                'breakfast' => true,
                'lunch' => false,
                'dinner' => true,
                'rating' => 4.6,
                'reviews_count' => 28,
                'image_keys' => ['category-hostel', 'food-dining', 'hero-stay', 'city-hyderabad'],
                'room_types' => [
                    [
                        'name' => 'Two Sharing Techie AC Room',
                        'capacity' => 2,
                        'mode' => PropertyRoomTypeMode::Shared,
                        'gender' => PropertyGenderPolicy::MaleOnly,
                        'price_daily' => 50000,
                        'price_weekly' => 300000,
                        'price_monthly' => 900000,
                        'rooms_count' => 10,
                    ],
                    [
                        'name' => 'Three Sharing Economy Room',
                        'capacity' => 3,
                        'mode' => PropertyRoomTypeMode::Shared,
                        'gender' => PropertyGenderPolicy::MaleOnly,
                        'price_daily' => 35000,
                        'price_weekly' => 210000,
                        'price_monthly' => 650000,
                        'rooms_count' => 12,
                    ],
                ],
            ],
            [
                'name' => 'Kukatpally Elite Co-Living & PG',
                'category_id' => $coLiving->id,
                'city_id' => $hyderabad->id,
                'owner_id' => $kalyan->id,
                'description' => 'Modern co-living space in Kukatpally near JNTU and metro station with 3 home-style South Indian meals, high-speed Wi-Fi, laundry, and study areas.',
                'locality' => 'Kukatpally',
                'address' => 'Plot 88, Near JNTU Metro Station, Kukatpally',
                'pincode' => '500072',
                'contact_name' => 'Kalyan Chakravarthy',
                'contact_phone' => '+919848099888',
                'contact_email' => 'kukatpally.elite@tijum.test',
                'latitude' => 17.4933,
                'longitude' => 78.4018,
                'food_provided' => true,
                'breakfast' => true,
                'lunch' => true,
                'dinner' => true,
                'rating' => 4.7,
                'reviews_count' => 26,
                'image_keys' => ['category-hostel', 'food-breakfast', 'category-pg', 'hero-stay'],
                'room_types' => [
                    [
                        'name' => 'Two Sharing Deluxe AC Room',
                        'capacity' => 2,
                        'mode' => PropertyRoomTypeMode::Shared,
                        'gender' => PropertyGenderPolicy::AllGenders,
                        'price_daily' => 50000,
                        'price_weekly' => 300000,
                        'price_monthly' => 900000,
                        'rooms_count' => 8,
                    ],
                    [
                        'name' => 'Three Sharing Economy Room',
                        'capacity' => 3,
                        'mode' => PropertyRoomTypeMode::Shared,
                        'gender' => PropertyGenderPolicy::AllGenders,
                        'price_daily' => 38000,
                        'price_weekly' => 220000,
                        'price_monthly' => 700000,
                        'rooms_count' => 10,
                    ],
                ],
            ],
            [
                'name' => 'KPHB Metro View Executive PG',
                'category_id' => $hostelsPg->id,
                'city_id' => $hyderabad->id,
                'owner_id' => $anitha->id,
                'description' => 'Executive paying guest stay right in KPHB Colony Phase 3 with lift, 24/7 power backup, hygienic food, and CCTV surveillance.',
                'locality' => 'KPHB Colony',
                'address' => 'Road No. 3, KPHB Colony, Near Forum Mall',
                'pincode' => '500072',
                'contact_name' => 'Anitha Reddy',
                'contact_phone' => '+919849122334',
                'contact_email' => 'kphb.metro@tijum.test',
                'latitude' => 17.4875,
                'longitude' => 78.3953,
                'food_provided' => true,
                'breakfast' => true,
                'lunch' => true,
                'dinner' => true,
                'rating' => 4.8,
                'reviews_count' => 34,
                'image_keys' => ['category-pg', 'food-dining', 'hero-stay', 'partner-hospitality'],
                'room_types' => [
                    [
                        'name' => 'Single Private Studio',
                        'capacity' => 1,
                        'mode' => PropertyRoomTypeMode::Private,
                        'gender' => PropertyGenderPolicy::FemaleOnly,
                        'price_daily' => 85000,
                        'price_weekly' => 510000,
                        'price_monthly' => 1500000,
                        'rooms_count' => 6,
                    ],
                    [
                        'name' => 'Twin Sharing Luxury AC Room',
                        'capacity' => 2,
                        'mode' => PropertyRoomTypeMode::Shared,
                        'gender' => PropertyGenderPolicy::FemaleOnly,
                        'price_daily' => 58000,
                        'price_weekly' => 340000,
                        'price_monthly' => 1050000,
                        'rooms_count' => 12,
                    ],
                ],
            ],
            [
                'name' => 'Ameerpet Tech Scholars Hostel & PG',
                'category_id' => $hostelsPg->id,
                'city_id' => $hyderabad->id,
                'owner_id' => $kalyan->id,
                'description' => 'Dedicated student and IT training scholar residency near Ameerpet metro with high-speed internet, silent study hall, and 3 unlimited home meals.',
                'locality' => 'Ameerpet',
                'address' => 'Lane 4, Beside Aditya Enclave, Ameerpet',
                'pincode' => '500038',
                'contact_name' => 'Kalyan Chakravarthy',
                'contact_phone' => '+919848099888',
                'contact_email' => 'ameerpet.scholars@tijum.test',
                'latitude' => 17.4375,
                'longitude' => 78.4483,
                'food_provided' => true,
                'breakfast' => true,
                'lunch' => true,
                'dinner' => true,
                'rating' => 4.6,
                'reviews_count' => 39,
                'image_keys' => ['category-hostel', 'food-breakfast', 'category-homestay', 'hero-stay'],
                'room_types' => [
                    [
                        'name' => 'Two Sharing Study AC Room',
                        'capacity' => 2,
                        'mode' => PropertyRoomTypeMode::Shared,
                        'gender' => PropertyGenderPolicy::MaleOnly,
                        'price_daily' => 45000,
                        'price_weekly' => 270000,
                        'price_monthly' => 800000,
                        'rooms_count' => 14,
                    ],
                    [
                        'name' => 'Three Sharing Economy Room',
                        'capacity' => 3,
                        'mode' => PropertyRoomTypeMode::Shared,
                        'gender' => PropertyGenderPolicy::MaleOnly,
                        'price_daily' => 32000,
                        'price_weekly' => 190000,
                        'price_monthly' => 580000,
                        'rooms_count' => 16,
                    ],
                ],
            ],
            [
                'name' => 'Miyapur Lakeview Co-Living Residency',
                'category_id' => $coLiving->id,
                'city_id' => $hyderabad->id,
                'owner_id' => $praveen->id,
                'description' => 'Serene lakeview co-living spaces with gym, community hall, gaming lounge, and nutritious home dining, 5 minutes from Miyapur Metro terminal.',
                'locality' => 'Miyapur',
                'address' => 'Allwyn X Roads, Near Miyapur Metro, Miyapur',
                'pincode' => '500049',
                'contact_name' => 'Praveen Varma',
                'contact_phone' => '+919866054321',
                'contact_email' => 'miyapur.lakeview@tijum.test',
                'latitude' => 17.4969,
                'longitude' => 78.3614,
                'food_provided' => true,
                'breakfast' => true,
                'lunch' => true,
                'dinner' => true,
                'rating' => 4.7,
                'reviews_count' => 22,
                'image_keys' => ['category-pg', 'hero-stay', 'food-dining', 'partner-hospitality'],
                'room_types' => [
                    [
                        'name' => 'Lakeview Single Studio',
                        'capacity' => 1,
                        'mode' => PropertyRoomTypeMode::Private,
                        'gender' => PropertyGenderPolicy::AllGenders,
                        'price_daily' => 75000,
                        'price_weekly' => 450000,
                        'price_monthly' => 1350000,
                        'rooms_count' => 6,
                    ],
                    [
                        'name' => 'Lakeview Double Suite',
                        'capacity' => 2,
                        'mode' => PropertyRoomTypeMode::Shared,
                        'gender' => PropertyGenderPolicy::AllGenders,
                        'price_daily' => 52000,
                        'price_weekly' => 310000,
                        'price_monthly' => 950000,
                        'rooms_count' => 10,
                    ],
                ],
            ],
            [
                'name' => 'Dilsukhnagar Metro Executive Stay',
                'category_id' => $hostelsPg->id,
                'city_id' => $hyderabad->id,
                'owner_id' => $anitha->id,
                'description' => 'Comfortable, well-maintained stay near Dilsukhnagar metro with wholesome Andhra home meals, daily housekeeping, and high-speed Wi-Fi.',
                'locality' => 'Dilsukhnagar',
                'address' => 'P&T Colony, Near Metro Pillar 1520, Dilsukhnagar',
                'pincode' => '500060',
                'contact_name' => 'Anitha Reddy',
                'contact_phone' => '+919849122334',
                'contact_email' => 'dilsukhnagar.stay@tijum.test',
                'latitude' => 17.3688,
                'longitude' => 78.5247,
                'food_provided' => true,
                'breakfast' => true,
                'lunch' => true,
                'dinner' => true,
                'rating' => 4.6,
                'reviews_count' => 29,
                'image_keys' => ['category-hostel', 'food-breakfast', 'category-pg', 'hero-stay'],
                'room_types' => [
                    [
                        'name' => 'Two Sharing Deluxe AC Room',
                        'capacity' => 2,
                        'mode' => PropertyRoomTypeMode::Shared,
                        'gender' => PropertyGenderPolicy::AllGenders,
                        'price_daily' => 48000,
                        'price_weekly' => 280000,
                        'price_monthly' => 850000,
                        'rooms_count' => 8,
                    ],
                    [
                        'name' => 'Three Sharing Economy Room',
                        'capacity' => 3,
                        'mode' => PropertyRoomTypeMode::Shared,
                        'gender' => PropertyGenderPolicy::AllGenders,
                        'price_daily' => 35000,
                        'price_weekly' => 210000,
                        'price_monthly' => 620000,
                        'rooms_count' => 10,
                    ],
                ],
            ],
            [
                'name' => 'Begumpet Grand Courtyard Homestay',
                'category_id' => $homestays->id,
                'city_id' => $hyderabad->id,
                'owner_id' => $kalyan->id,
                'description' => 'Classic heritage courtyard homestay in central Begumpet with private green patio, personalized home dining, and swift airport access.',
                'locality' => 'Begumpet',
                'address' => 'Mayur Marg, Near Begumpet Airport Road',
                'pincode' => '500016',
                'contact_name' => 'Kalyan Chakravarthy',
                'contact_phone' => '+919848099888',
                'contact_email' => 'begumpet.grand@tijum.test',
                'latitude' => 17.4441,
                'longitude' => 78.4612,
                'food_provided' => true,
                'breakfast' => true,
                'lunch' => false,
                'dinner' => true,
                'rating' => 4.9,
                'reviews_count' => 31,
                'image_keys' => ['category-homestay', 'hero-stay', 'partner-hospitality', 'food-breakfast'],
                'room_types' => [
                    [
                        'name' => 'Courtyard King Heritage Suite',
                        'capacity' => 2,
                        'mode' => PropertyRoomTypeMode::Private,
                        'gender' => PropertyGenderPolicy::AllGenders,
                        'price_daily' => 160000,
                        'price_weekly' => 950000,
                        'price_monthly' => 3000000,
                        'rooms_count' => 4,
                    ],
                ],
            ],
            [
                'name' => 'Banjara Hills Royal Heritage Villa',
                'category_id' => $homestays->id,
                'city_id' => $hyderabad->id,
                'owner_id' => $kalyan->id,
                'description' => 'Charming residential villa homestay in posh Road No. 12 Banjara Hills with private gardens, vintage architecture, host hospitality, and fresh breakfast included.',
                'locality' => 'Banjara Hills',
                'address' => 'Road No. 12, MLA Colony, Banjara Hills',
                'pincode' => '500034',
                'contact_name' => 'Kalyan Chakravarthy',
                'contact_phone' => '+919848099888',
                'contact_email' => 'banjara.villa@tijum.test',
                'latitude' => 17.4156,
                'longitude' => 78.4354,
                'food_provided' => true,
                'breakfast' => true,
                'lunch' => false,
                'dinner' => false,
                'rating' => 4.9,
                'reviews_count' => 38,
                'image_keys' => ['category-homestay', 'hero-stay', 'partner-hospitality', 'food-breakfast', 'city-hyderabad'],
                'room_types' => [
                    [
                        'name' => 'Royal Gardenia King Suite',
                        'capacity' => 2,
                        'mode' => PropertyRoomTypeMode::Private,
                        'gender' => PropertyGenderPolicy::AllGenders,
                        'price_daily' => 180000,
                        'price_weekly' => 1100000,
                        'price_monthly' => 3500000,
                        'rooms_count' => 3,
                    ],
                    [
                        'name' => 'Heritage Deluxe Bedroom',
                        'capacity' => 2,
                        'mode' => PropertyRoomTypeMode::Private,
                        'gender' => PropertyGenderPolicy::AllGenders,
                        'price_daily' => 140000,
                        'price_weekly' => 850000,
                        'price_monthly' => 2800000,
                        'rooms_count' => 4,
                    ],
                ],
            ],
            // ================= VIJAYAWADA (5 Properties) =================
            [
                'name' => 'Godavari Heritage Riverside Homestay',
                'category_id' => $homestays->id,
                'city_id' => $vijayawada->id,
                'owner_id' => $lakshmi->id,
                'description' => 'Host-managed family homestay near Prakasam Barrage offering regional meal options, peaceful garden courtyard, and personal host hospitality.',
                'locality' => 'Bhavanipuram',
                'address' => 'Door 12-4-8, Krishna Riverfront Promenade',
                'pincode' => '520012',
                'contact_name' => 'Lakshmi Narayana',
                'contact_phone' => '+919908012345',
                'contact_email' => 'godavari.stay@tijum.test',
                'latitude' => 16.5085,
                'longitude' => 80.6542,
                'food_provided' => true,
                'breakfast' => true,
                'lunch' => true,
                'dinner' => true,
                'rating' => 4.9,
                'reviews_count' => 36,
                'image_keys' => ['category-homestay', 'city-vijayawada', 'hero-stay', 'food-breakfast', 'partner-hospitality'],
                'room_types' => [
                    [
                        'name' => 'Heritage Courtyard Suite',
                        'capacity' => 2,
                        'mode' => PropertyRoomTypeMode::Private,
                        'gender' => PropertyGenderPolicy::AllGenders,
                        'price_daily' => 150000,
                        'price_weekly' => 850000,
                        'price_monthly' => 2800000,
                        'rooms_count' => 4,
                    ],
                    [
                        'name' => 'Riverside Balcony Room',
                        'capacity' => 2,
                        'mode' => PropertyRoomTypeMode::Private,
                        'gender' => PropertyGenderPolicy::AllGenders,
                        'price_daily' => 120000,
                        'price_weekly' => 700000,
                        'price_monthly' => 2200000,
                        'rooms_count' => 4,
                    ],
                ],
            ],
            [
                'name' => 'Benz Gardenia Boutique Homestay',
                'category_id' => $homestays->id,
                'city_id' => $vijayawada->id,
                'owner_id' => $lakshmi->id,
                'description' => 'Boutique stay right in the commercial core near Benz Circle with landscaped terrace, air-conditioned rooms, warm breakfast, and high-speed Wi-Fi.',
                'locality' => 'Benz Circle',
                'address' => 'MG Road, Opposite Trendset Mall',
                'pincode' => '520010',
                'contact_name' => 'Lakshmi Narayana',
                'contact_phone' => '+919908012345',
                'contact_email' => 'benz.gardenia@tijum.test',
                'latitude' => 16.5012,
                'longitude' => 80.6481,
                'food_provided' => true,
                'breakfast' => true,
                'lunch' => false,
                'dinner' => false,
                'rating' => 4.7,
                'reviews_count' => 24,
                'image_keys' => ['category-homestay', 'hero-stay', 'food-breakfast', 'city-vijayawada'],
                'room_types' => [
                    [
                        'name' => 'Garden King Room',
                        'capacity' => 2,
                        'mode' => PropertyRoomTypeMode::Private,
                        'gender' => PropertyGenderPolicy::AllGenders,
                        'price_daily' => 140000,
                        'price_weekly' => 800000,
                        'price_monthly' => 2500000,
                        'rooms_count' => 5,
                    ],
                ],
            ],
            [
                'name' => 'Amaravathi Pride Boys & Mens PG',
                'category_id' => $hostelsPg->id,
                'city_id' => $vijayawada->id,
                'owner_id' => $srinivasa->id,
                'description' => 'Central paying guest accommodation close to the railway station and bus terminus. Offers 3 authentic Andhra meals, RO water, and high-speed internet.',
                'locality' => 'Governorpet',
                'address' => 'Near Prakasam Road, Governorpet',
                'pincode' => '520002',
                'contact_name' => 'Srinivasa Rao',
                'contact_phone' => '+919848123456',
                'contact_email' => 'amaravathi.vja@tijum.test',
                'latitude' => 16.5165,
                'longitude' => 80.6289,
                'food_provided' => true,
                'breakfast' => true,
                'lunch' => true,
                'dinner' => true,
                'rating' => 4.5,
                'reviews_count' => 19,
                'image_keys' => ['category-hostel', 'food-dining', 'hero-stay', 'city-vijayawada'],
                'room_types' => [
                    [
                        'name' => 'Two Sharing Executive Room',
                        'capacity' => 2,
                        'mode' => PropertyRoomTypeMode::Shared,
                        'gender' => PropertyGenderPolicy::MaleOnly,
                        'price_daily' => 45000,
                        'price_weekly' => 260000,
                        'price_monthly' => 800000,
                        'rooms_count' => 10,
                    ],
                    [
                        'name' => 'Three Sharing Economy Room',
                        'capacity' => 3,
                        'mode' => PropertyRoomTypeMode::Shared,
                        'gender' => PropertyGenderPolicy::MaleOnly,
                        'price_daily' => 35000,
                        'price_weekly' => 200000,
                        'price_monthly' => 600000,
                        'rooms_count' => 12,
                    ],
                ],
            ],
            [
                'name' => 'Sri Durga Executive Women\'s Hostel',
                'category_id' => $hostelsPg->id,
                'city_id' => $vijayawada->id,
                'owner_id' => $anitha->id,
                'description' => 'Safe, hygienic women hostel near college hubs and hospitals. Offers round-the-clock security, fingerprint entry, study tables, and nutritious meals.',
                'locality' => 'Moghalrajpuram',
                'address' => 'Siddhartha College Road, Moghalrajpuram',
                'pincode' => '520010',
                'contact_name' => 'Anitha Reddy',
                'contact_phone' => '+919849122334',
                'contact_email' => 'sridurga.womens@tijum.test',
                'latitude' => 16.5054,
                'longitude' => 80.6421,
                'food_provided' => true,
                'breakfast' => true,
                'lunch' => true,
                'dinner' => true,
                'rating' => 4.8,
                'reviews_count' => 31,
                'image_keys' => ['category-pg', 'hero-stay', 'food-breakfast', 'category-homestay', 'city-vijayawada'],
                'room_types' => [
                    [
                        'name' => 'Single Deluxe AC Room',
                        'capacity' => 1,
                        'mode' => PropertyRoomTypeMode::Private,
                        'gender' => PropertyGenderPolicy::FemaleOnly,
                        'price_daily' => 75000,
                        'price_weekly' => 420000,
                        'price_monthly' => 1300000,
                        'rooms_count' => 6,
                    ],
                    [
                        'name' => 'Two Sharing AC Room',
                        'capacity' => 2,
                        'mode' => PropertyRoomTypeMode::Shared,
                        'gender' => PropertyGenderPolicy::FemaleOnly,
                        'price_daily' => 50000,
                        'price_weekly' => 290000,
                        'price_monthly' => 900000,
                        'rooms_count' => 14,
                    ],
                ],
            ],
            [
                'name' => 'Krishna Valley Co-Living & Workspace',
                'category_id' => $coLiving->id,
                'city_id' => $vijayawada->id,
                'owner_id' => $praveen->id,
                'description' => 'Modern co-living and flexible workspace destination in Patamata with high-speed internet, fitness room, community dining, and breakfast plus dinner included.',
                'locality' => 'Patamata',
                'address' => 'Near Auto Nagar Gate, Patamata',
                'pincode' => '520010',
                'contact_name' => 'Praveen Varma',
                'contact_phone' => '+919866054321',
                'contact_email' => 'krishnavalley.coliving@tijum.test',
                'latitude' => 16.4941,
                'longitude' => 80.6654,
                'food_provided' => true,
                'breakfast' => true,
                'lunch' => false,
                'dinner' => true,
                'rating' => 4.7,
                'reviews_count' => 26,
                'image_keys' => ['category-pg', 'hero-stay', 'food-dining', 'partner-hospitality'],
                'room_types' => [
                    [
                        'name' => 'Studio Private Pod',
                        'capacity' => 1,
                        'mode' => PropertyRoomTypeMode::Private,
                        'gender' => PropertyGenderPolicy::AllGenders,
                        'price_daily' => 100000,
                        'price_weekly' => 600000,
                        'price_monthly' => 1700000,
                        'rooms_count' => 8,
                    ],
                    [
                        'name' => 'Twin Co-Living Suite',
                        'capacity' => 2,
                        'mode' => PropertyRoomTypeMode::Shared,
                        'gender' => PropertyGenderPolicy::AllGenders,
                        'price_daily' => 60000,
                        'price_weekly' => 360000,
                        'price_monthly' => 1100000,
                        'rooms_count' => 10,
                    ],
                ],
            ],

            // ================= GUNTUR (4 Properties) =================
            [
                'name' => 'Amaravathi Executive Hostel & PG',
                'category_id' => $hostelsPg->id,
                'city_id' => $guntur->id,
                'owner_id' => $srinivasa->id,
                'description' => 'Modern student and executive accommodation in Brodipet near educational hubs with wholesome Andhra meals, high-speed Wi-Fi, study lounge, and biometric security.',
                'locality' => 'Brodipet',
                'address' => '4th Lane, Main Road, Brodipet',
                'pincode' => '522002',
                'contact_name' => 'Srinivasa Rao',
                'contact_phone' => '+919848123456',
                'contact_email' => 'amaravathi.pg@tijum.test',
                'latitude' => 16.3042,
                'longitude' => 80.4418,
                'food_provided' => true,
                'breakfast' => true,
                'lunch' => true,
                'dinner' => true,
                'rating' => 4.6,
                'reviews_count' => 29,
                'image_keys' => ['category-hostel', 'city-guntur', 'food-breakfast', 'hero-stay'],
                'room_types' => [
                    [
                        'name' => 'Executive Single Room',
                        'capacity' => 1,
                        'mode' => PropertyRoomTypeMode::Private,
                        'gender' => PropertyGenderPolicy::AllGenders,
                        'price_daily' => 75000,
                        'price_weekly' => 420000,
                        'price_monthly' => 1250000,
                        'rooms_count' => 6,
                    ],
                    [
                        'name' => 'Twin Sharing Room',
                        'capacity' => 2,
                        'mode' => PropertyRoomTypeMode::Shared,
                        'gender' => PropertyGenderPolicy::AllGenders,
                        'price_daily' => 45000,
                        'price_weekly' => 260000,
                        'price_monthly' => 800000,
                        'rooms_count' => 12,
                    ],
                ],
            ],
            [
                'name' => 'Veda Sri Ladies Hostel & PG',
                'category_id' => $hostelsPg->id,
                'city_id' => $guntur->id,
                'owner_id' => $anitha->id,
                'description' => 'Dedicated women accommodation in Arundelpet close to coaching centres and women colleges. Offers full security, fresh home-cooked food, and hot water.',
                'locality' => 'Arundelpet',
                'address' => '6th Lane, Arundelpet Main Road',
                'pincode' => '522002',
                'contact_name' => 'Anitha Reddy',
                'contact_phone' => '+919849122334',
                'contact_email' => 'vedasri.womens@tijum.test',
                'latitude' => 16.3089,
                'longitude' => 80.4356,
                'food_provided' => true,
                'breakfast' => true,
                'lunch' => true,
                'dinner' => true,
                'rating' => 4.8,
                'reviews_count' => 22,
                'image_keys' => ['category-pg', 'hero-stay', 'food-dining', 'city-guntur'],
                'room_types' => [
                    [
                        'name' => 'Two Sharing Deluxe AC',
                        'capacity' => 2,
                        'mode' => PropertyRoomTypeMode::Shared,
                        'gender' => PropertyGenderPolicy::FemaleOnly,
                        'price_daily' => 50000,
                        'price_weekly' => 280000,
                        'price_monthly' => 850000,
                        'rooms_count' => 10,
                    ],
                    [
                        'name' => 'Three Sharing Economy Room',
                        'capacity' => 3,
                        'mode' => PropertyRoomTypeMode::Shared,
                        'gender' => PropertyGenderPolicy::FemaleOnly,
                        'price_daily' => 35000,
                        'price_weekly' => 200000,
                        'price_monthly' => 600000,
                        'rooms_count' => 8,
                    ],
                ],
            ],
            [
                'name' => 'Nallamala Green View Homestay',
                'category_id' => $homestays->id,
                'city_id' => $guntur->id,
                'owner_id' => $srinivasa->id,
                'description' => 'Serene family-managed homestay in Lakshmipuram surrounded by greenery. Ideal for families and travelling doctors with home kitchen and private parking.',
                'locality' => 'Lakshmipuram',
                'address' => 'Plot 88, Green Meadows Colony, Lakshmipuram',
                'pincode' => '522007',
                'contact_name' => 'Srinivasa Rao',
                'contact_phone' => '+919848123456',
                'contact_email' => 'greenview.homestay@tijum.test',
                'latitude' => 16.3156,
                'longitude' => 80.4289,
                'food_provided' => true,
                'breakfast' => true,
                'lunch' => true,
                'dinner' => true,
                'rating' => 4.7,
                'reviews_count' => 18,
                'image_keys' => ['category-homestay', 'hero-stay', 'partner-hospitality', 'city-guntur'],
                'room_types' => [
                    [
                        'name' => 'Deluxe Family King Room',
                        'capacity' => 2,
                        'mode' => PropertyRoomTypeMode::Private,
                        'gender' => PropertyGenderPolicy::AllGenders,
                        'price_daily' => 130000,
                        'price_weekly' => 750000,
                        'price_monthly' => 2400000,
                        'rooms_count' => 4,
                    ],
                ],
            ],
            [
                'name' => 'Sprout Co-Living & Tech Residency',
                'category_id' => $coLiving->id,
                'city_id' => $guntur->id,
                'owner_id' => $praveen->id,
                'description' => 'First co-living residency in Guntur featuring private working booths, shared pantry, super-fast Wi-Fi, and included daily breakfast and dinner.',
                'locality' => 'Koretipadu',
                'address' => 'Near Medical Club Road, Koretipadu',
                'pincode' => '522007',
                'contact_name' => 'Praveen Varma',
                'contact_phone' => '+919866054321',
                'contact_email' => 'sprout.coliving@tijum.test',
                'latitude' => 16.3212,
                'longitude' => 80.4498,
                'food_provided' => true,
                'breakfast' => true,
                'lunch' => false,
                'dinner' => true,
                'rating' => 4.6,
                'reviews_count' => 15,
                'image_keys' => ['category-pg', 'hero-stay', 'food-breakfast', 'category-hostel'],
                'room_types' => [
                    [
                        'name' => 'Solo Tech Pod',
                        'capacity' => 1,
                        'mode' => PropertyRoomTypeMode::Private,
                        'gender' => PropertyGenderPolicy::AllGenders,
                        'price_daily' => 90000,
                        'price_weekly' => 520000,
                        'price_monthly' => 1500000,
                        'rooms_count' => 6,
                    ],
                    [
                        'name' => 'Shared Residency Pod',
                        'capacity' => 2,
                        'mode' => PropertyRoomTypeMode::Shared,
                        'gender' => PropertyGenderPolicy::AllGenders,
                        'price_daily' => 55000,
                        'price_weekly' => 320000,
                        'price_monthly' => 950000,
                        'rooms_count' => 8,
                    ],
                ],
            ],

            // ================= VISAKHAPATNAM (4 Properties) =================
            [
                'name' => 'Urban Nest Co-Living Hub',
                'category_id' => $coLiving->id,
                'city_id' => $visakhapatnam->id,
                'owner_id' => $praveen->id,
                'description' => 'Modern curated community living for IT professionals and remote creators with shared workspaces, fitness deck, community kitchen, and breakfast package included.',
                'locality' => 'Madhurawada IT SEZ',
                'address' => 'Tower B, Hill 3, IT Park Road',
                'pincode' => '530048',
                'contact_name' => 'Praveen Varma',
                'contact_phone' => '+919866054321',
                'contact_email' => 'urbannest.coliving@tijum.test',
                'latitude' => 17.7312,
                'longitude' => 83.3156,
                'food_provided' => true,
                'breakfast' => true,
                'lunch' => false,
                'dinner' => true,
                'rating' => 4.8,
                'reviews_count' => 48,
                'image_keys' => ['category-pg', 'city-visakhapatnam', 'hero-stay', 'food-breakfast', 'partner-hospitality'],
                'room_types' => [
                    [
                        'name' => 'Studio Private Pod',
                        'capacity' => 1,
                        'mode' => PropertyRoomTypeMode::Private,
                        'gender' => PropertyGenderPolicy::AllGenders,
                        'price_daily' => 110000,
                        'price_weekly' => 600000,
                        'price_monthly' => 1800000,
                        'rooms_count' => 8,
                    ],
                    [
                        'name' => 'Twin Co-Living Suite',
                        'capacity' => 2,
                        'mode' => PropertyRoomTypeMode::Shared,
                        'gender' => PropertyGenderPolicy::AllGenders,
                        'price_daily' => 70000,
                        'price_weekly' => 400000,
                        'price_monthly' => 1250000,
                        'rooms_count' => 12,
                    ],
                ],
            ],
            [
                'name' => 'Bayview Women\'s Residency',
                'category_id' => $hostelsPg->id,
                'city_id' => $visakhapatnam->id,
                'owner_id' => $anitha->id,
                'description' => 'High-standard women accommodation in MVP Colony close to coastal beaches and university campuses. Features full CCTV, female warden, and Andhra meals.',
                'locality' => 'MVP Colony',
                'address' => 'Sector 4, Near AS Raja College, MVP Colony',
                'pincode' => '530017',
                'contact_name' => 'Anitha Reddy',
                'contact_phone' => '+919849122334',
                'contact_email' => 'bayview.womens@tijum.test',
                'latitude' => 17.7421,
                'longitude' => 83.3341,
                'food_provided' => true,
                'breakfast' => true,
                'lunch' => true,
                'dinner' => true,
                'rating' => 4.9,
                'reviews_count' => 37,
                'image_keys' => ['category-pg', 'hero-stay', 'food-breakfast', 'category-homestay', 'city-visakhapatnam'],
                'room_types' => [
                    [
                        'name' => 'Single Deluxe AC Room',
                        'capacity' => 1,
                        'mode' => PropertyRoomTypeMode::Private,
                        'gender' => PropertyGenderPolicy::FemaleOnly,
                        'price_daily' => 90000,
                        'price_weekly' => 520000,
                        'price_monthly' => 1600000,
                        'rooms_count' => 6,
                    ],
                    [
                        'name' => 'Two Sharing Sea View AC',
                        'capacity' => 2,
                        'mode' => PropertyRoomTypeMode::Shared,
                        'gender' => PropertyGenderPolicy::FemaleOnly,
                        'price_daily' => 60000,
                        'price_weekly' => 350000,
                        'price_monthly' => 1100000,
                        'rooms_count' => 12,
                    ],
                ],
            ],
            [
                'name' => 'Beachway Executive PG for Men',
                'category_id' => $hostelsPg->id,
                'city_id' => $visakhapatnam->id,
                'owner_id' => $kalyan->id,
                'description' => 'Centrally located men executive hostel near Siripuram junction. Fast Wi-Fi, air conditioning, lockers, and three warm meals everyday.',
                'locality' => 'Siripuram',
                'address' => 'Near Dutt Island, Siripuram Junction',
                'pincode' => '530003',
                'contact_name' => 'Kalyan Chakravarthy',
                'contact_phone' => '+919848099888',
                'contact_email' => 'beachway.pg@tijum.test',
                'latitude' => 17.7208,
                'longitude' => 83.3154,
                'food_provided' => true,
                'breakfast' => true,
                'lunch' => true,
                'dinner' => true,
                'rating' => 4.6,
                'reviews_count' => 25,
                'image_keys' => ['category-hostel', 'food-dining', 'hero-stay', 'city-visakhapatnam'],
                'room_types' => [
                    [
                        'name' => 'Two Sharing Executive Room',
                        'capacity' => 2,
                        'mode' => PropertyRoomTypeMode::Shared,
                        'gender' => PropertyGenderPolicy::MaleOnly,
                        'price_daily' => 50000,
                        'price_weekly' => 290000,
                        'price_monthly' => 900000,
                        'rooms_count' => 10,
                    ],
                    [
                        'name' => 'Three Sharing Economy Room',
                        'capacity' => 3,
                        'mode' => PropertyRoomTypeMode::Shared,
                        'gender' => PropertyGenderPolicy::MaleOnly,
                        'price_daily' => 38000,
                        'price_weekly' => 220000,
                        'price_monthly' => 680000,
                        'rooms_count' => 10,
                    ],
                ],
            ],
            [
                'name' => 'Kailasagiri Sea Breeze Homestay',
                'category_id' => $homestays->id,
                'city_id' => $visakhapatnam->id,
                'owner_id' => $lakshmi->id,
                'description' => 'Picturesque coastal homestay nestled against Kailasagiri hill overlooking the Bay of Bengal. Authentic coastal seafood and vegetarian meals, large balcony, and calm ambiance.',
                'locality' => 'Beach Road',
                'address' => 'Beach Road, Sagar Nagar Promenade',
                'pincode' => '530045',
                'contact_name' => 'Lakshmi Narayana',
                'contact_phone' => '+919908012345',
                'contact_email' => 'kailasagiri.homestay@tijum.test',
                'latitude' => 17.7548,
                'longitude' => 83.3489,
                'food_provided' => true,
                'breakfast' => true,
                'lunch' => false,
                'dinner' => true,
                'rating' => 4.9,
                'reviews_count' => 42,
                'image_keys' => ['category-homestay', 'city-visakhapatnam', 'hero-stay', 'food-breakfast', 'partner-hospitality'],
                'room_types' => [
                    [
                        'name' => 'Ocean View King Suite',
                        'capacity' => 2,
                        'mode' => PropertyRoomTypeMode::Private,
                        'gender' => PropertyGenderPolicy::AllGenders,
                        'price_daily' => 175000,
                        'price_weekly' => 1050000,
                        'price_monthly' => 3300000,
                        'rooms_count' => 4,
                    ],
                    [
                        'name' => 'Hillside Garden Room',
                        'capacity' => 2,
                        'mode' => PropertyRoomTypeMode::Private,
                        'gender' => PropertyGenderPolicy::AllGenders,
                        'price_daily' => 135000,
                        'price_weekly' => 800000,
                        'price_monthly' => 2600000,
                        'rooms_count' => 4,
                    ],
                ],
            ],
        ];

        // Media source lookup from public assets
        $sourceImages = [
            'category-hostel' => public_path('images/public/category-hostel-800w.jpg'),
            'category-pg' => public_path('images/public/category-pg-800w.jpg'),
            'category-homestay' => public_path('images/public/category-homestay-800w.jpg'),
            'hero-stay' => public_path('images/public/hero-stay-1200w.jpg'),
            'food-breakfast' => public_path('images/public/food-breakfast-800w.jpg'),
            'food-dining' => public_path('images/public/food-dining-800w.jpg'),
            'partner-hospitality' => public_path('images/public/partner-hospitality-800w.jpg'),
            'city-hyderabad' => public_path('images/public/city-hyderabad-800w.jpg'),
            'city-vijayawada' => public_path('images/public/city-vijayawada-800w.jpg'),
            'city-visakhapatnam' => public_path('images/public/city-visakhapatnam-800w.jpg'),
            'city-guntur' => public_path('images/public/city-guntur-800w.jpg'),
        ];

        $mediaCategories = [
            PropertyMediaCategory::Exterior,
            PropertyMediaCategory::RoomInterior,
            PropertyMediaCategory::Dining,
            PropertyMediaCategory::CommonArea,
            PropertyMediaCategory::RoomArrangement,
        ];

        DB::transaction(function () use ($propertiesBlueprint, $sourceImages, $mediaCategories): void {
            foreach ($propertiesBlueprint as $index => $blueprint) {
                $ref = sprintf('TJP-%s-%06d', now()->format('Y'), 1000 + $index + 1);
                $slug = Str::slug($blueprint['name']).'-'.strtolower($ref);

                /** @var Property $property */
                $property = Property::query()->firstOrNew(['property_reference' => $ref]);
                $property->forceFill([
                    'owner_id' => $blueprint['owner_id'],
                    'property_category_id' => $blueprint['category_id'],
                    'city_id' => $blueprint['city_id'],
                    'property_reference' => $ref,
                    'name' => $blueprint['name'],
                    'slug' => $slug,
                    'description' => $blueprint['description'],
                    'contact_person_name' => $blueprint['contact_name'],
                    'contact_phone' => $blueprint['contact_phone'],
                    'contact_email' => $blueprint['contact_email'],
                    'address_line_1' => $blueprint['address'],
                    'locality' => $blueprint['locality'],
                    'postal_code' => $blueprint['pincode'],
                    'state' => City::find($blueprint['city_id'])?->state ?? 'Telangana',
                    'country_code' => 'IN',
                    'latitude' => $blueprint['latitude'],
                    'longitude' => $blueprint['longitude'],
                    'food_provided' => $blueprint['food_provided'],
                    'breakfast_included' => $blueprint['breakfast'],
                    'lunch_included' => $blueprint['lunch'],
                    'dinner_included' => $blueprint['dinner'],
                    'status' => PropertyOperationalStatus::Active,
                    'is_verified' => true,
                    'booking_eligible' => true,
                    'approved_at' => now(),
                ]);
                $property->save();

                // 1. Verification Application Record
                $app = PropertyVerificationApplication::query()->firstOrNew(['property_id' => $property->id]);
                $app->forceFill([
                    'property_id' => $property->id,
                    'active_property_id' => null,
                    'application_number' => sprintf('TJPV-%s-%06d', now()->format('Y'), $property->id),
                    'status' => PropertyVerificationStatus::Approved,
                    'revision_number' => 1,
                    'is_amendment' => false,
                    'ownership_arrangement' => PropertyOwnershipArrangement::OwnerOperator,
                    'submitted_at' => now(),
                    'reviewed_at' => now(),
                    'approved_snapshot' => $property->toApprovedPropertyFieldsSnapshot(),
                ]);
                $app->save();

                $property->forceFill(['latest_approved_application_id' => $app->id])->save();

                // 2. Room types & Physical Rooms
                foreach ($blueprint['room_types'] as $rtIndex => $rtData) {
                    $rtSlug = Str::slug($rtData['name']).'-'.$property->id;
                    $roomType = PropertyRoomType::query()->firstOrNew([
                        'property_id' => $property->id,
                        'name' => $rtData['name'],
                    ]);

                    $roomType->forceFill([
                        'property_id' => $property->id,
                        'name' => $rtData['name'],
                        'slug' => $rtSlug,
                        'description' => $rtData['name'].' at '.$property->name,
                        'accommodation_mode' => $rtData['mode'],
                        'max_guests_per_room' => $rtData['capacity'],
                        'sharing_capacity' => $rtData['capacity'],
                        'gender_policy' => $rtData['gender'],
                        'guest_composition_policy' => ['individuals'],
                        'early_check_in_enabled' => true,
                        'is_approved_version' => true,
                        'daily_rate_minor' => $rtData['price_daily'],
                        'weekly_rate_minor' => $rtData['price_weekly'],
                        'monthly_rate_minor' => $rtData['price_monthly'],
                        'is_active' => true,
                        'display_order' => $rtIndex + 1,
                    ]);
                    $roomType->save();

                    for ($r = 1; $r <= $rtData['rooms_count']; $r++) {
                        $roomNumber = sprintf('%d0%d', $rtIndex + 1, $r);
                        $room = PropertyRoom::query()->firstOrNew([
                            'property_id' => $property->id,
                            'room_number' => $roomNumber,
                        ]);
                        $room->forceFill([
                            'property_id' => $property->id,
                            'property_room_type_id' => $roomType->id,
                            'room_number' => $roomNumber,
                            'operational_status' => PropertyRoomStatus::Active,
                        ]);
                        $room->save();
                    }
                }

                // 3. Property Amenities
                $propertyAmenityCodes = ['POWER_BACKUP', 'WIFI', 'CCTV', 'SECURITY_GUARD', 'HOUSEKEEPING', 'PARKING', 'DRINKING_WATER', 'LAUNDRY', 'LIFT'];
                foreach ($propertyAmenityCodes as $code) {
                    $amenity = Amenity::query()->where('code', $code)->first();
                    if ($amenity) {
                        PropertyAmenity::query()->updateOrCreate(
                            ['property_id' => $property->id, 'amenity_id' => $amenity->id],
                            [
                                'assignment_group_id' => (string) Str::ulid(),
                                'availability' => AmenityAvailability::Included,
                                'status' => AmenityVerificationStatus::Approved,
                                'revision_number' => 1,
                                'is_current' => true,
                                'is_customer_visible' => true,
                                'approved_at' => now(),
                                'assignment_reference' => sprintf('TJPA-%s-%s', $property->id, $code),
                            ]
                        );
                    }
                }

                // 4. Room-Type Amenities
                $roomTypeAmenityCodes = ['ATTACHED_BATHROOM', 'WARDROBE', 'HOT_WATER', 'STUDY_TABLE', 'CEILING_FAN'];
                foreach ($blueprint['room_types'] as $rtData) {
                    $roomType = PropertyRoomType::query()->where('property_id', $property->id)->where('name', $rtData['name'])->first();
                    if (! $roomType) {
                        continue;
                    }
                    foreach ($roomTypeAmenityCodes as $code) {
                        $amenity = Amenity::query()->where('code', $code)->first();
                        if ($amenity) {
                            PropertyRoomTypeAmenity::query()->updateOrCreate(
                                ['property_id' => $property->id, 'property_room_type_id' => $roomType->id, 'amenity_id' => $amenity->id],
                                [
                                    'assignment_group_id' => (string) Str::ulid(),
                                    'availability' => AmenityAvailability::Included,
                                    'status' => AmenityVerificationStatus::Approved,
                                    'revision_number' => 1,
                                    'is_current' => true,
                                    'is_customer_visible' => true,
                                    'approved_at' => now(),
                                    'assignment_reference' => sprintf('TJRTA-%s-%s-%s', $property->id, $roomType->id, $code),
                                ]
                            );
                        }
                    }
                }

                // 5. Seed Real Physical Images & PropertyMedia records (3 to 5 images per property)
                $mediaDir = storage_path("app/public/property-media/properties/{$property->id}/public");
                File::ensureDirectoryExists($mediaDir);

                $imageKeys = $blueprint['image_keys'];
                foreach ($imageKeys as $imgIdx => $imgKey) {
                    $sortOrder = $imgIdx + 1;
                    $filename = "media-{$sortOrder}.jpg";
                    $thumbFilename = "thumb_media-{$sortOrder}.jpg";
                    $destPath = "{$mediaDir}/{$filename}";
                    $destThumbPath = "{$mediaDir}/{$thumbFilename}";

                    $src = $sourceImages[$imgKey] ?? $sourceImages['hero-stay'];
                    if (File::exists($src)) {
                        File::copy($src, $destPath);
                        File::copy($src, $destThumbPath);
                    }

                    $cat = $mediaCategories[$imgIdx % count($mediaCategories)];

                    PropertyMedia::query()->updateOrCreate(
                        [
                            'property_id' => $property->id,
                            'sort_order' => $sortOrder,
                        ],
                        [
                            'original_filename' => "photo-{$sortOrder}.jpg",
                            'storage_path' => "properties/{$property->id}/raw/photo-{$sortOrder}.jpg",
                            'optimized_private_path' => "properties/{$property->id}/private/photo-{$sortOrder}.jpg",
                            'thumbnail_path' => "properties/{$property->id}/private/thumb_photo-{$sortOrder}.jpg",
                            'public_optimized_path' => "properties/{$property->id}/public/{$filename}",
                            'public_thumbnail_path' => "properties/{$property->id}/public/{$thumbFilename}",
                            'mime_type' => 'image/jpeg',
                            'file_size' => File::exists($destPath) ? (int) File::size($destPath) : 150000,
                            'width' => 1200,
                            'height' => 800,
                            'alt_text' => sprintf('%s - %s', $property->name, $cat->label()),
                            'media_type' => $cat,
                            'is_cover' => $sortOrder === 1,
                            'moderation_status' => PropertyMediaModerationStatus::Approved,
                            'publication_status' => PropertyMediaPublicationStatus::Published,
                            'moderated_at' => now(),
                            'published_at' => now(),
                            'is_archived' => false,
                        ]
                    );
                }

                // 6. Property Rating Summary
                $rating = (float) $blueprint['rating'];
                $reviewsCount = (int) $blueprint['reviews_count'];
                $star5 = (int) round($reviewsCount * 0.75);
                $star4 = (int) round($reviewsCount * 0.20);
                $star3 = max(0, $reviewsCount - $star5 - $star4);

                PropertyRatingSummary::query()->updateOrCreate(
                    ['property_id' => $property->id],
                    [
                        'published_review_count' => $reviewsCount,
                        'average_rating' => $rating,
                        'cleanliness_average' => min(5.0, $rating + 0.1),
                        'food_average' => min(5.0, $rating - 0.1),
                        'communication_average' => 4.9,
                        'value_average' => $rating,
                        'star_1_count' => 0,
                        'star_2_count' => 0,
                        'star_3_count' => $star3,
                        'star_4_count' => $star4,
                        'star_5_count' => $star5,
                        'last_recalculated_at' => now(),
                    ]
                );
            }
        });
    }
}

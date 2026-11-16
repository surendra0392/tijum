<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Enums\PaymentStatus;
use App\Enums\ReservationQuantityBasis;
use App\Enums\ReservationRateUnit;
use App\Enums\ReservationStatus;
use App\Enums\ReviewResponseStatus;
use App\Enums\ReviewStatus;
use App\Models\CustomerWishlist;
use App\Models\Property;
use App\Models\PropertyReview;
use App\Models\PropertyReviewResponse;
use App\Models\PropertyRoom;
use App\Models\PropertyRoomType;
use App\Models\Reservation;
use App\Models\ReservationPayment;
use App\Models\ReservationRoomAllocation;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ReservationSeeder extends Seeder
{
    /**
     * Seed realistic reservations, room allocations, payments, published reviews, and wishlists.
     */
    public function run(): void
    {
        if (app()->isProduction()) {
            $this->command?->warn('ReservationSeeder: Skipping demo and test fixture reservation seeding in production.');

            return;
        }

        $now = CarbonImmutable::now('Asia/Kolkata');

        // Fetch Users
        $rahul = User::query()->where('email', 'customer@tijum.com')->first();
        $sneha = User::query()->where('email', 'sneha.patel@tijum.com')->first();
        $vikram = User::query()->where('email', 'vikram.aditya@tijum.com')->first();
        $priya = User::query()->where('email', 'priya.nair@tijum.com')->first();

        if (! $rahul || ! $sneha || ! $vikram || ! $priya) {
            $this->command?->warn('ReservationSeeder: Customers missing, running CustomerSeeder first.');
            $this->call(CustomerSeeder::class);
            $rahul = User::query()->where('email', 'customer@tijum.com')->firstOrFail();
            $sneha = User::query()->where('email', 'sneha.patel@tijum.com')->firstOrFail();
            $vikram = User::query()->where('email', 'vikram.aditya@tijum.com')->firstOrFail();
            $priya = User::query()->where('email', 'priya.nair@tijum.com')->firstOrFail();
        }

        // Fetch Properties
        $balajiPg = Property::query()->where('name', 'Sri Sai Balaji Executive Hostel & PG')->first();
        $sannidhiPg = Property::query()->where('name', 'Sannidhi Luxury Women\'s PG & Hostel')->first();
        $urbanNestCoLiving = Property::query()->where('name', 'Hitec CyberNest Co-Living Community')->first();
        $dwarakaHostel = Property::query()->where('name', 'Amaravathi Pride Boys & Mens PG')->first();
        $amaravathiPg = Property::query()->where('name', 'Amaravathi Executive Hostel & PG')->first();
        $bayViewHomestay = Property::query()->where('name', 'Kailasagiri Sea Breeze Homestay')->first();

        if (! $balajiPg || ! $sannidhiPg || ! $dwarakaHostel || ! $bayViewHomestay) {
            $this->command?->warn('ReservationSeeder: Demo properties not found. Please ensure PropertySeeder runs first.');

            return;
        }

        DB::transaction(function () use (
            $now,
            $rahul,
            $sneha,
            $vikram,
            $priya,
            $balajiPg,
            $sannidhiPg,
            $urbanNestCoLiving,
            $dwarakaHostel,
            $amaravathiPg,
            $bayViewHomestay
        ): void {
            // 1. UPCOMING CONFIRMED STAY: Rahul Sharma at Sri Sai Balaji PG (Hyderabad)
            $balajiRoomType = PropertyRoomType::query()->where('property_id', $balajiPg->id)->firstOrFail();
            $balajiRoom = PropertyRoom::query()->where('property_room_type_id', $balajiRoomType->id)->first();

            $checkInUpcoming = $now->addDays(5)->startOfDay();
            $checkOutUpcoming = $checkInUpcoming->addDays(7);
            $stayDaysUpcoming = 7;
            $unitRate = $balajiRoomType->daily_rate_minor ?? 85000;
            $totalAmount = $unitRate * $stayDaysUpcoming;

            $upcomingRef = 'TJR-2026-UPCOMING-01';
            $upcomingRes = Reservation::query()->updateOrCreate(
                ['booking_reference' => $upcomingRef],
                [
                    'user_id' => $rahul->id,
                    'property_id' => $balajiPg->id,
                    'property_room_type_id' => $balajiRoomType->id,
                    'submission_token' => (string) Str::uuid(),
                    'check_in_date' => $checkInUpcoming->toDateString(),
                    'checkout_date' => $checkOutUpcoming->toDateString(),
                    'duration_type' => 'daily',
                    'duration_quantity' => $stayDaysUpcoming,
                    'total_stay_days' => $stayDaysUpcoming,
                    'quantity' => 1,
                    'guest_count' => 1,
                    'quantity_basis' => ReservationQuantityBasis::PrivateRooms->value,
                    'guest_gender' => 'male',
                    'guest_composition' => 'individual',
                    'contact_name' => $rahul->name,
                    'contact_email' => $rahul->email,
                    'contact_phone' => $rahul->phone ?? '+919876543210',
                    'early_check_in_requested' => false,
                    'requested_arrival_time' => '11:00:00',
                    'snapshot_property_name' => $balajiPg->name,
                    'snapshot_property_locality' => $balajiPg->locality,
                    'snapshot_property_city' => $balajiPg->city?->name ?? 'Hyderabad',
                    'snapshot_property_state' => 'Telangana',
                    'snapshot_property_country_code' => 'IN',
                    'snapshot_category_name' => $balajiPg->category?->name ?? 'Hostels & PG',
                    'snapshot_room_type_name' => $balajiRoomType->name,
                    'snapshot_is_air_conditioned' => (bool) $balajiRoomType->is_air_conditioned,
                    'snapshot_sharing_mode' => $balajiRoomType->accommodation_mode->value,
                    'snapshot_max_capacity' => $balajiRoomType->sharing_capacity,
                    'snapshot_food_provided' => (bool) $balajiPg->food_provided,
                    'snapshot_breakfast_included' => (bool) $balajiPg->breakfast_included,
                    'snapshot_lunch_included' => (bool) $balajiPg->lunch_included,
                    'snapshot_dinner_included' => (bool) $balajiPg->dinner_included,
                    'currency_code' => 'INR',
                    'unit_rate_minor' => $unitRate,
                    'rate_unit' => ReservationRateUnit::PerPrivateRoom->value,
                    'total_amount_minor' => $totalAmount,
                    'status' => ReservationStatus::Confirmed,
                    'submitted_at' => $now->subDays(2),
                    'confirmed_at' => $now->subDays(2),
                ]
            );

            if ($balajiRoom) {
                ReservationRoomAllocation::query()->updateOrCreate(
                    [
                        'reservation_id' => $upcomingRes->id,
                        'property_room_id' => $balajiRoom->id,
                    ],
                    ['allocated_quantity' => 1]
                );
            }

            ReservationPayment::query()->updateOrCreate(
                ['reservation_id' => $upcomingRes->id],
                [
                    'user_id' => $rahul->id,
                    'gateway' => 'razorpay',
                    'gateway_order_id' => 'order_upcoming_'.Str::random(10),
                    'gateway_payment_id' => 'pay_upcoming_'.Str::random(10),
                    'idempotency_key' => (string) Str::uuid(),
                    'amount_minor' => $totalAmount,
                    'currency' => 'INR',
                    'status' => PaymentStatus::Captured,
                    'gateway_order_created_at' => $now->subDays(2),
                    'captured_at' => $now->subDays(2),
                    'metadata' => ['method' => 'upi', 'bank' => 'HDFC Bank'],
                ]
            );

            // 2. ACTIVE / IN-STAY: Rahul Sharma at UrbanNest Co-Living Suites
            if ($urbanNestCoLiving) {
                $coLivingRoomType = PropertyRoomType::query()->where('property_id', $urbanNestCoLiving->id)->firstOrFail();
                $coLivingRoom = PropertyRoom::query()->where('property_room_type_id', $coLivingRoomType->id)->first();

                $checkInActive = $now->subDays(4)->startOfDay();
                $checkOutActive = $now->addDays(26)->startOfDay();
                $stayDaysActive = 30;
                $coLivingUnitRate = $coLivingRoomType->monthly_rate_minor ?? 1800000;

                $activeRef = 'TJR-2026-ACTIVE-02';
                $activeRes = Reservation::query()->updateOrCreate(
                    ['booking_reference' => $activeRef],
                    [
                        'user_id' => $rahul->id,
                        'property_id' => $urbanNestCoLiving->id,
                        'property_room_type_id' => $coLivingRoomType->id,
                        'submission_token' => (string) Str::uuid(),
                        'check_in_date' => $checkInActive->toDateString(),
                        'checkout_date' => $checkOutActive->toDateString(),
                        'duration_type' => 'monthly',
                        'duration_quantity' => 1,
                        'total_stay_days' => $stayDaysActive,
                        'quantity' => 1,
                        'guest_count' => 1,
                        'quantity_basis' => ReservationQuantityBasis::PrivateRooms->value,
                        'guest_gender' => 'male',
                        'guest_composition' => 'individual',
                        'contact_name' => $rahul->name,
                        'contact_email' => $rahul->email,
                        'contact_phone' => $rahul->phone ?? '+919876543210',
                        'early_check_in_requested' => false,
                        'requested_arrival_time' => '10:00:00',
                        'snapshot_property_name' => $urbanNestCoLiving->name,
                        'snapshot_property_locality' => $urbanNestCoLiving->locality,
                        'snapshot_property_city' => $urbanNestCoLiving->city?->name ?? 'Hyderabad',
                        'snapshot_property_state' => 'Telangana',
                        'snapshot_property_country_code' => 'IN',
                        'snapshot_category_name' => $urbanNestCoLiving->category?->name ?? 'Co-Living',
                        'snapshot_room_type_name' => $coLivingRoomType->name,
                        'snapshot_is_air_conditioned' => (bool) $coLivingRoomType->is_air_conditioned,
                        'snapshot_sharing_mode' => $coLivingRoomType->accommodation_mode->value,
                        'snapshot_max_capacity' => $coLivingRoomType->sharing_capacity,
                        'snapshot_food_provided' => (bool) $urbanNestCoLiving->food_provided,
                        'snapshot_breakfast_included' => (bool) $urbanNestCoLiving->breakfast_included,
                        'snapshot_lunch_included' => (bool) $urbanNestCoLiving->lunch_included,
                        'snapshot_dinner_included' => (bool) $urbanNestCoLiving->dinner_included,
                        'currency_code' => 'INR',
                        'unit_rate_minor' => $coLivingUnitRate,
                        'rate_unit' => ReservationRateUnit::PerPrivateRoom->value,
                        'total_amount_minor' => $coLivingUnitRate,
                        'status' => ReservationStatus::Confirmed,
                        'submitted_at' => $now->subDays(5),
                        'confirmed_at' => $now->subDays(5),
                    ]
                );

                if ($coLivingRoom) {
                    ReservationRoomAllocation::query()->updateOrCreate(
                        [
                            'reservation_id' => $activeRes->id,
                            'property_room_id' => $coLivingRoom->id,
                        ],
                        ['allocated_quantity' => 1]
                    );
                }

                ReservationPayment::query()->updateOrCreate(
                    ['reservation_id' => $activeRes->id],
                    [
                        'user_id' => $rahul->id,
                        'gateway' => 'razorpay',
                        'gateway_order_id' => 'order_active_'.Str::random(10),
                        'gateway_payment_id' => 'pay_active_'.Str::random(10),
                        'idempotency_key' => (string) Str::uuid(),
                        'amount_minor' => $coLivingUnitRate,
                        'currency' => 'INR',
                        'status' => PaymentStatus::Captured,
                        'gateway_order_created_at' => $now->subDays(5),
                        'captured_at' => $now->subDays(5),
                        'metadata' => ['method' => 'card', 'network' => 'Visa'],
                    ]
                );
            }

            // 3. COMPLETED STAY & PUBLISHED REVIEW 1: Rahul Sharma at Dwaraka Deluxe Executive Hostel (Vijayawada)
            $dwarakaRoomType = PropertyRoomType::query()->where('property_id', $dwarakaHostel->id)->firstOrFail();
            $dwarakaRoom = PropertyRoom::query()->where('property_room_type_id', $dwarakaRoomType->id)->first();
            $checkInPast1 = $now->subDays(45)->startOfDay();
            $checkOutPast1 = $now->subDays(15)->startOfDay();
            $stayDaysPast1 = 30;
            $dwarakaUnitRate = $dwarakaRoomType->monthly_rate_minor ?? 900000;

            $pastRes1 = Reservation::query()->updateOrCreate(
                ['booking_reference' => 'TJR-2026-PAST-01'],
                [
                    'user_id' => $rahul->id,
                    'property_id' => $dwarakaHostel->id,
                    'property_room_type_id' => $dwarakaRoomType->id,
                    'submission_token' => (string) Str::uuid(),
                    'check_in_date' => $checkInPast1->toDateString(),
                    'checkout_date' => $checkOutPast1->toDateString(),
                    'duration_type' => 'monthly',
                    'duration_quantity' => 1,
                    'total_stay_days' => $stayDaysPast1,
                    'quantity' => 1,
                    'guest_count' => 1,
                    'quantity_basis' => ReservationQuantityBasis::PrivateRooms->value,
                    'guest_gender' => 'male',
                    'guest_composition' => 'individual',
                    'contact_name' => $rahul->name,
                    'contact_email' => $rahul->email,
                    'contact_phone' => $rahul->phone ?? '+919876543210',
                    'early_check_in_requested' => false,
                    'requested_arrival_time' => '12:00:00',
                    'snapshot_property_name' => $dwarakaHostel->name,
                    'snapshot_property_locality' => $dwarakaHostel->locality,
                    'snapshot_property_city' => $dwarakaHostel->city?->name ?? 'Vijayawada',
                    'snapshot_property_state' => 'Andhra Pradesh',
                    'snapshot_property_country_code' => 'IN',
                    'snapshot_category_name' => $dwarakaHostel->category?->name ?? 'Hostels & PG',
                    'snapshot_room_type_name' => $dwarakaRoomType->name,
                    'snapshot_is_air_conditioned' => (bool) $dwarakaRoomType->is_air_conditioned,
                    'snapshot_sharing_mode' => $dwarakaRoomType->accommodation_mode->value,
                    'snapshot_max_capacity' => $dwarakaRoomType->sharing_capacity,
                    'snapshot_food_provided' => (bool) $dwarakaHostel->food_provided,
                    'snapshot_breakfast_included' => (bool) $dwarakaHostel->breakfast_included,
                    'snapshot_lunch_included' => (bool) $dwarakaHostel->lunch_included,
                    'snapshot_dinner_included' => (bool) $dwarakaHostel->dinner_included,
                    'currency_code' => 'INR',
                    'unit_rate_minor' => $dwarakaUnitRate,
                    'rate_unit' => ReservationRateUnit::PerPrivateRoom->value,
                    'total_amount_minor' => $dwarakaUnitRate,
                    'status' => ReservationStatus::Confirmed,
                    'submitted_at' => $now->subDays(46),
                    'confirmed_at' => $now->subDays(46),
                ]
            );

            if ($dwarakaRoom) {
                ReservationRoomAllocation::query()->updateOrCreate(
                    [
                        'reservation_id' => $pastRes1->id,
                        'property_room_id' => $dwarakaRoom->id,
                    ],
                    ['allocated_quantity' => 1]
                );
            }

            ReservationPayment::query()->updateOrCreate(
                ['reservation_id' => $pastRes1->id],
                [
                    'user_id' => $rahul->id,
                    'gateway' => 'razorpay',
                    'gateway_order_id' => 'order_past1_'.Str::random(10),
                    'gateway_payment_id' => 'pay_past1_'.Str::random(10),
                    'idempotency_key' => (string) Str::uuid(),
                    'amount_minor' => $dwarakaUnitRate,
                    'currency' => 'INR',
                    'status' => PaymentStatus::Captured,
                    'gateway_order_created_at' => $now->subDays(46),
                    'captured_at' => $now->subDays(46),
                    'metadata' => ['method' => 'netbanking', 'bank' => 'SBI'],
                ]
            );

            $review1 = PropertyReview::query()->updateOrCreate(
                ['reservation_id' => $pastRes1->id],
                [
                    'property_id' => $dwarakaHostel->id,
                    'user_id' => $rahul->id,
                    'property_room_type_id' => $dwarakaRoomType->id,
                    'owner_id' => $dwarakaHostel->owner_id,
                    'overall_rating' => 5,
                    'cleanliness_rating' => 5,
                    'food_quality_rating' => 5,
                    'communication_rating' => 5,
                    'value_rating' => 5,
                    'title' => 'Outstanding stay in Vijayawada with hygienic authentic Andhra meals!',
                    'content' => 'Stayed here for a month. The rooms are spotless, Wi-Fi is super reliable for work, and the 3 daily meals are fresh, hot, and hygienic. Management is very responsive and courteous.',
                    'status' => ReviewStatus::Published,
                    'verified_booking' => true,
                    'customer_display_name' => 'Rahul S.',
                    'submitted_at' => $now->subDays(14),
                    'published_at' => $now->subDays(14),
                    'moderated_at' => $now->subDays(14),
                ]
            );

            PropertyReviewResponse::query()->updateOrCreate(
                ['property_review_id' => $review1->id],
                [
                    'owner_id' => $dwarakaHostel->owner_id,
                    'response_text' => 'Thank you so much Rahul! We are thrilled to hear you loved our food and hospitality. You are always welcome back to Dwaraka Deluxe!',
                    'status' => ReviewResponseStatus::Published,
                    'submitted_at' => $now->subDays(13),
                    'published_at' => $now->subDays(13),
                    'moderated_at' => $now->subDays(13),
                ]
            );

            // 4. COMPLETED STAY & REVIEW 2: Sneha Patel at Sannidhi Luxury Women's PG & Hostel (Hyderabad)
            $sannidhiRoomType = PropertyRoomType::query()->where('property_id', $sannidhiPg->id)->firstOrFail();
            $sannidhiRoom = PropertyRoom::query()->where('property_room_type_id', $sannidhiRoomType->id)->first();
            $checkInPast2 = $now->subDays(60)->startOfDay();
            $checkOutPast2 = $now->subDays(30)->startOfDay();
            $stayDaysPast2 = 30;
            $sannidhiUnitRate = $sannidhiRoomType->monthly_rate_minor ?? 1100000;

            $pastRes2 = Reservation::query()->updateOrCreate(
                ['booking_reference' => 'TJR-2026-PAST-02'],
                [
                    'user_id' => $sneha->id,
                    'property_id' => $sannidhiPg->id,
                    'property_room_type_id' => $sannidhiRoomType->id,
                    'submission_token' => (string) Str::uuid(),
                    'check_in_date' => $checkInPast2->toDateString(),
                    'checkout_date' => $checkOutPast2->toDateString(),
                    'duration_type' => 'monthly',
                    'duration_quantity' => 1,
                    'total_stay_days' => $stayDaysPast2,
                    'quantity' => 1,
                    'guest_count' => 1,
                    'quantity_basis' => ReservationQuantityBasis::PrivateRooms->value,
                    'guest_gender' => 'female',
                    'guest_composition' => 'individual',
                    'contact_name' => $sneha->name,
                    'contact_email' => $sneha->email,
                    'contact_phone' => $sneha->phone ?? '+919812345678',
                    'early_check_in_requested' => false,
                    'requested_arrival_time' => '14:00:00',
                    'snapshot_property_name' => $sannidhiPg->name,
                    'snapshot_property_locality' => $sannidhiPg->locality,
                    'snapshot_property_city' => $sannidhiPg->city?->name ?? 'Hyderabad',
                    'snapshot_property_state' => 'Telangana',
                    'snapshot_property_country_code' => 'IN',
                    'snapshot_category_name' => $sannidhiPg->category?->name ?? 'Hostels & PG',
                    'snapshot_room_type_name' => $sannidhiRoomType->name,
                    'snapshot_is_air_conditioned' => (bool) $sannidhiRoomType->is_air_conditioned,
                    'snapshot_sharing_mode' => $sannidhiRoomType->accommodation_mode->value,
                    'snapshot_max_capacity' => $sannidhiRoomType->sharing_capacity,
                    'snapshot_food_provided' => (bool) $sannidhiPg->food_provided,
                    'snapshot_breakfast_included' => (bool) $sannidhiPg->breakfast_included,
                    'snapshot_lunch_included' => (bool) $sannidhiPg->lunch_included,
                    'snapshot_dinner_included' => (bool) $sannidhiPg->dinner_included,
                    'currency_code' => 'INR',
                    'unit_rate_minor' => $sannidhiUnitRate,
                    'rate_unit' => ReservationRateUnit::PerPrivateRoom->value,
                    'total_amount_minor' => $sannidhiUnitRate,
                    'status' => ReservationStatus::Confirmed,
                    'submitted_at' => $now->subDays(61),
                    'confirmed_at' => $now->subDays(61),
                ]
            );

            if ($sannidhiRoom) {
                ReservationRoomAllocation::query()->updateOrCreate(
                    [
                        'reservation_id' => $pastRes2->id,
                        'property_room_id' => $sannidhiRoom->id,
                    ],
                    ['allocated_quantity' => 1]
                );
            }

            ReservationPayment::query()->updateOrCreate(
                ['reservation_id' => $pastRes2->id],
                [
                    'user_id' => $sneha->id,
                    'gateway' => 'razorpay',
                    'gateway_order_id' => 'order_past2_'.Str::random(10),
                    'gateway_payment_id' => 'pay_past2_'.Str::random(10),
                    'idempotency_key' => (string) Str::uuid(),
                    'amount_minor' => $sannidhiUnitRate,
                    'currency' => 'INR',
                    'status' => PaymentStatus::Captured,
                    'gateway_order_created_at' => $now->subDays(61),
                    'captured_at' => $now->subDays(61),
                    'metadata' => ['method' => 'upi', 'bank' => 'ICICI Bank'],
                ]
            );

            $review2 = PropertyReview::query()->updateOrCreate(
                ['reservation_id' => $pastRes2->id],
                [
                    'property_id' => $sannidhiPg->id,
                    'user_id' => $sneha->id,
                    'property_room_type_id' => $sannidhiRoomType->id,
                    'owner_id' => $sannidhiPg->owner_id,
                    'overall_rating' => 5,
                    'cleanliness_rating' => 5,
                    'food_quality_rating' => 5,
                    'communication_rating' => 5,
                    'value_rating' => 5,
                    'title' => 'Top notch safety, spotless premises, and peaceful stay for working women',
                    'content' => 'Extremely safe hostel with biometric gates and professional female security staff. Rooms are cleaned daily, AC is powerful, and food tastes just like homemade cuisine. Highly recommended for DLF and Financial District professionals!',
                    'status' => ReviewStatus::Published,
                    'verified_booking' => true,
                    'customer_display_name' => 'Sneha P.',
                    'submitted_at' => $now->subDays(29),
                    'published_at' => $now->subDays(29),
                    'moderated_at' => $now->subDays(29),
                ]
            );

            PropertyReviewResponse::query()->updateOrCreate(
                ['property_review_id' => $review2->id],
                [
                    'owner_id' => $sannidhiPg->owner_id,
                    'response_text' => 'Thank you Sneha! Your feedback warms our hearts. Ensuring safe, dignified, and comfortable stays for women is our core mission.',
                    'status' => ReviewResponseStatus::Published,
                    'submitted_at' => $now->subDays(28),
                    'published_at' => $now->subDays(28),
                    'moderated_at' => $now->subDays(28),
                ]
            );

            // 5. COMPLETED STAY & REVIEW 3: Vikram Aditya at BayView Residency & Serviced Homestay (Visakhapatnam)
            $bayViewRoomType = PropertyRoomType::query()->where('property_id', $bayViewHomestay->id)->firstOrFail();
            $bayViewRoom = PropertyRoom::query()->where('property_room_type_id', $bayViewRoomType->id)->first();
            $checkInPast3 = $now->subDays(30)->startOfDay();
            $checkOutPast3 = $now->subDays(25)->startOfDay();
            $stayDaysPast3 = 5;
            $bayViewUnitRate = $bayViewRoomType->daily_rate_minor ?? 250000;
            $bayViewTotal = $bayViewUnitRate * $stayDaysPast3;

            $pastRes3 = Reservation::query()->updateOrCreate(
                ['booking_reference' => 'TJR-2026-PAST-03'],
                [
                    'user_id' => $vikram->id,
                    'property_id' => $bayViewHomestay->id,
                    'property_room_type_id' => $bayViewRoomType->id,
                    'submission_token' => (string) Str::uuid(),
                    'check_in_date' => $checkInPast3->toDateString(),
                    'checkout_date' => $checkOutPast3->toDateString(),
                    'duration_type' => 'daily',
                    'duration_quantity' => $stayDaysPast3,
                    'total_stay_days' => $stayDaysPast3,
                    'quantity' => 1,
                    'guest_count' => 2,
                    'quantity_basis' => ReservationQuantityBasis::PrivateRooms->value,
                    'guest_gender' => 'male',
                    'guest_composition' => 'family_or_couple',
                    'contact_name' => $vikram->name,
                    'contact_email' => $vikram->email,
                    'contact_phone' => $vikram->phone ?? '+919701234567',
                    'early_check_in_requested' => false,
                    'requested_arrival_time' => '13:00:00',
                    'snapshot_property_name' => $bayViewHomestay->name,
                    'snapshot_property_locality' => $bayViewHomestay->locality,
                    'snapshot_property_city' => $bayViewHomestay->city?->name ?? 'Visakhapatnam',
                    'snapshot_property_state' => 'Andhra Pradesh',
                    'snapshot_property_country_code' => 'IN',
                    'snapshot_category_name' => $bayViewHomestay->category?->name ?? 'Homestays',
                    'snapshot_room_type_name' => $bayViewRoomType->name,
                    'snapshot_is_air_conditioned' => (bool) $bayViewRoomType->is_air_conditioned,
                    'snapshot_sharing_mode' => $bayViewRoomType->accommodation_mode->value,
                    'snapshot_max_capacity' => $bayViewRoomType->sharing_capacity,
                    'snapshot_food_provided' => (bool) $bayViewHomestay->food_provided,
                    'snapshot_breakfast_included' => (bool) $bayViewHomestay->breakfast_included,
                    'snapshot_lunch_included' => (bool) $bayViewHomestay->lunch_included,
                    'snapshot_dinner_included' => (bool) $bayViewHomestay->dinner_included,
                    'currency_code' => 'INR',
                    'unit_rate_minor' => $bayViewUnitRate,
                    'rate_unit' => ReservationRateUnit::PerPrivateRoom->value,
                    'total_amount_minor' => $bayViewTotal,
                    'status' => ReservationStatus::Confirmed,
                    'submitted_at' => $now->subDays(31),
                    'confirmed_at' => $now->subDays(31),
                ]
            );

            if ($bayViewRoom) {
                ReservationRoomAllocation::query()->updateOrCreate(
                    [
                        'reservation_id' => $pastRes3->id,
                        'property_room_id' => $bayViewRoom->id,
                    ],
                    ['allocated_quantity' => 1]
                );
            }

            ReservationPayment::query()->updateOrCreate(
                ['reservation_id' => $pastRes3->id],
                [
                    'user_id' => $vikram->id,
                    'gateway' => 'razorpay',
                    'gateway_order_id' => 'order_past3_'.Str::random(10),
                    'gateway_payment_id' => 'pay_past3_'.Str::random(10),
                    'idempotency_key' => (string) Str::uuid(),
                    'amount_minor' => $bayViewTotal,
                    'currency' => 'INR',
                    'status' => PaymentStatus::Captured,
                    'gateway_order_created_at' => $now->subDays(31),
                    'captured_at' => $now->subDays(31),
                    'metadata' => ['method' => 'card', 'network' => 'Mastercard'],
                ]
            );

            $review3 = PropertyReview::query()->updateOrCreate(
                ['reservation_id' => $pastRes3->id],
                [
                    'property_id' => $bayViewHomestay->id,
                    'user_id' => $vikram->id,
                    'property_room_type_id' => $bayViewRoomType->id,
                    'owner_id' => $bayViewHomestay->owner_id,
                    'overall_rating' => 5,
                    'cleanliness_rating' => 5,
                    'food_quality_rating' => 5,
                    'communication_rating' => 5,
                    'value_rating' => 5,
                    'title' => 'Serene sea views and impeccable homestay hospitality in Vizag!',
                    'content' => 'Waking up to the sea breeze from the private balcony was magical. Beautifully furnished rooms, spotless linen, and Praveen garu made sure we had everything we needed. We will definitely visit again!',
                    'status' => ReviewStatus::Published,
                    'verified_booking' => true,
                    'customer_display_name' => 'Vikram A.',
                    'submitted_at' => $now->subDays(24),
                    'published_at' => $now->subDays(24),
                    'moderated_at' => $now->subDays(24),
                ]
            );

            PropertyReviewResponse::query()->updateOrCreate(
                ['property_review_id' => $review3->id],
                [
                    'owner_id' => $bayViewHomestay->owner_id,
                    'response_text' => 'It was an absolute pleasure hosting you and your family, Vikram! Vizag will always welcome you back to BayView.',
                    'status' => ReviewResponseStatus::Published,
                    'submitted_at' => $now->subDays(23),
                    'published_at' => $now->subDays(23),
                    'moderated_at' => $now->subDays(23),
                ]
            );

            // 6. COMPLETED STAY & REVIEW 4: Priya Nair at Amaravathi Executive PG (Guntur)
            if ($amaravathiPg) {
                $amaravathiRoomType = PropertyRoomType::query()->where('property_id', $amaravathiPg->id)->firstOrFail();
                $amaravathiRoom = PropertyRoom::query()->where('property_room_type_id', $amaravathiRoomType->id)->first();
                $checkInPast4 = $now->subDays(25)->startOfDay();
                $checkOutPast4 = $now->subDays(10)->startOfDay();
                $stayDaysPast4 = 15;
                $amaravathiUnitRate = $amaravathiRoomType->daily_rate_minor ?? 50000;
                $amaravathiTotal = $amaravathiUnitRate * $stayDaysPast4;

                $pastRes4 = Reservation::query()->updateOrCreate(
                    ['booking_reference' => 'TJR-2026-PAST-04'],
                    [
                        'user_id' => $priya->id,
                        'property_id' => $amaravathiPg->id,
                        'property_room_type_id' => $amaravathiRoomType->id,
                        'submission_token' => (string) Str::uuid(),
                        'check_in_date' => $checkInPast4->toDateString(),
                        'checkout_date' => $checkOutPast4->toDateString(),
                        'duration_type' => 'daily',
                        'duration_quantity' => $stayDaysPast4,
                        'total_stay_days' => $stayDaysPast4,
                        'quantity' => 1,
                        'guest_count' => 1,
                        'quantity_basis' => ReservationQuantityBasis::PrivateRooms->value,
                        'guest_gender' => 'female',
                        'guest_composition' => 'individual',
                        'contact_name' => $priya->name,
                        'contact_email' => $priya->email,
                        'contact_phone' => $priya->phone ?? '+919900112233',
                        'early_check_in_requested' => false,
                        'requested_arrival_time' => '10:30:00',
                        'snapshot_property_name' => $amaravathiPg->name,
                        'snapshot_property_locality' => $amaravathiPg->locality,
                        'snapshot_property_city' => $amaravathiPg->city?->name ?? 'Guntur',
                        'snapshot_property_state' => 'Andhra Pradesh',
                        'snapshot_property_country_code' => 'IN',
                        'snapshot_category_name' => $amaravathiPg->category?->name ?? 'Hostels & PG',
                        'snapshot_room_type_name' => $amaravathiRoomType->name,
                        'snapshot_is_air_conditioned' => (bool) $amaravathiRoomType->is_air_conditioned,
                        'snapshot_sharing_mode' => $amaravathiRoomType->accommodation_mode->value,
                        'snapshot_max_capacity' => $amaravathiRoomType->sharing_capacity,
                        'snapshot_food_provided' => (bool) $amaravathiPg->food_provided,
                        'snapshot_breakfast_included' => (bool) $amaravathiPg->breakfast_included,
                        'snapshot_lunch_included' => (bool) $amaravathiPg->lunch_included,
                        'snapshot_dinner_included' => (bool) $amaravathiPg->dinner_included,
                        'currency_code' => 'INR',
                        'unit_rate_minor' => $amaravathiUnitRate,
                        'rate_unit' => ReservationRateUnit::PerPrivateRoom->value,
                        'total_amount_minor' => $amaravathiTotal,
                        'status' => ReservationStatus::Confirmed,
                        'submitted_at' => $now->subDays(26),
                        'confirmed_at' => $now->subDays(26),
                    ]
                );

                if ($amaravathiRoom) {
                    ReservationRoomAllocation::query()->updateOrCreate(
                        [
                            'reservation_id' => $pastRes4->id,
                            'property_room_id' => $amaravathiRoom->id,
                        ],
                        ['allocated_quantity' => 1]
                    );
                }

                ReservationPayment::query()->updateOrCreate(
                    ['reservation_id' => $pastRes4->id],
                    [
                        'user_id' => $priya->id,
                        'gateway' => 'razorpay',
                        'gateway_order_id' => 'order_past4_'.Str::random(10),
                        'gateway_payment_id' => 'pay_past4_'.Str::random(10),
                        'idempotency_key' => (string) Str::uuid(),
                        'amount_minor' => $amaravathiTotal,
                        'currency' => 'INR',
                        'status' => PaymentStatus::Captured,
                        'gateway_order_created_at' => $now->subDays(26),
                        'captured_at' => $now->subDays(26),
                        'metadata' => ['method' => 'upi', 'bank' => 'Axis Bank'],
                    ]
                );

                $review4 = PropertyReview::query()->updateOrCreate(
                    ['reservation_id' => $pastRes4->id],
                    [
                        'property_id' => $amaravathiPg->id,
                        'user_id' => $priya->id,
                        'property_room_type_id' => $amaravathiRoomType->id,
                        'owner_id' => $amaravathiPg->owner_id,
                        'overall_rating' => 5,
                        'cleanliness_rating' => 5,
                        'food_quality_rating' => 5,
                        'communication_rating' => 5,
                        'value_rating' => 5,
                        'title' => 'Comfortable and dependable PG near Brodipet educational institutes',
                        'content' => 'Great location with easy bus access. The food is nutritious, hot water 24/7, and power backup worked seamlessly during power cuts. Very satisfied!',
                        'status' => ReviewStatus::Published,
                        'verified_booking' => true,
                        'customer_display_name' => 'Priya N.',
                        'submitted_at' => $now->subDays(9),
                        'published_at' => $now->subDays(9),
                        'moderated_at' => $now->subDays(9),
                    ]
                );

                PropertyReviewResponse::query()->updateOrCreate(
                    ['property_review_id' => $review4->id],
                    [
                        'owner_id' => $amaravathiPg->owner_id,
                        'response_text' => 'Thank you Priya for your lovely review! We strive to make student and exam prep life in Guntur smooth and peaceful.',
                        'status' => ReviewResponseStatus::Published,
                        'submitted_at' => $now->subDays(8),
                        'published_at' => $now->subDays(8),
                        'moderated_at' => $now->subDays(8),
                    ]
                );
            }

            // 7. WISHLISTS FOR CUSTOMERS (across multiple launch cities)
            $wishlistPairs = [
                [$rahul->id, $bayViewHomestay->id],
                [$rahul->id, $balajiPg->id],
                [$sneha->id, $sannidhiPg->id],
                [$sneha->id, $urbanNestCoLiving?->id],
                [$vikram->id, $dwarakaHostel->id],
                [$vikram->id, $bayViewHomestay->id],
                [$priya->id, $amaravathiPg?->id],
                [$priya->id, $sannidhiPg->id],
            ];

            foreach ($wishlistPairs as [$userId, $propertyId]) {
                if ($propertyId) {
                    CustomerWishlist::query()->firstOrCreate([
                        'user_id' => $userId,
                        'property_id' => $propertyId,
                    ]);
                }
            }
        });
    }
}

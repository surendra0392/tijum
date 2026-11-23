<?php

declare(strict_types=1);

use App\Enums\CaseCategory;
use App\Enums\CasePriority;
use App\Enums\CaseStatus;
use App\Enums\CommissionAgreementStatus;
use App\Enums\CommissionBaseType;
use App\Enums\CommissionGstType;
use App\Enums\OwnerStatus;
use App\Enums\PaymentStatus;
use App\Enums\ReservationQuantityBasis;
use App\Enums\ReservationRateUnit;
use App\Enums\ReservationStatus;
use App\Enums\ReviewStatus;
use App\Enums\SettlementItemType;
use App\Enums\SettlementStatus;
use App\Enums\SupportTicketPriority;
use App\Enums\SupportTicketStatus;
use App\Enums\SupportTicketType;
use App\Models\Admin;
use App\Models\CustomerProtectionCase;
use App\Models\CustomerProtectionCaseMessage;
use App\Models\Owner;
use App\Models\OwnerFinancialProfile;
use App\Models\PartnerCommissionAgreement;
use App\Models\PartnerSettlement;
use App\Models\PartnerSettlementItem;
use App\Models\Property;
use App\Models\PropertyReview;
use App\Models\PropertyRoom;
use App\Models\PropertyRoomType;
use App\Models\Reservation;
use App\Models\ReservationPayment;
use App\Models\ReservationRoomAllocation;
use App\Models\SupportTicket;
use App\Models\SupportTicketMessage;
use App\Models\User;
use App\Services\Financial\CommissionCalculationService;
use Carbon\CarbonImmutable;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

require __DIR__.'/../vendor/autoload.php';

$app = require __DIR__.'/../bootstrap/app.php';
$kernel = $app->make(Kernel::class);
$kernel->bootstrap();

$databasePath = $app['db']->connection()->getDatabaseName();
if (! app()->environment('testing') || config('database.default') !== 'sqlite' || ! is_file($databasePath) || filesize($databasePath) !== 0) {
    fwrite(STDERR, "REFUSING TO SEED: Set APP_ENV=testing and use a new, empty SQLite file.\n");
    exit(1);
}

if (
    config('tijum.payments.live_enabled') === true
    || config('tijum.settlements.enabled') === true
    || config('tijum.settlements.route_enabled') === true
    || config('tijum.payments.razorpay.mode') !== 'test'
) {
    fwrite(STDERR, "REFUSING TO SEED: Live financial controls must remain disabled.\n");
    exit(1);
}

$customerPassword = (string) getenv('QA_CUSTOMER_PASSWORD');
$partnerPassword = (string) getenv('QA_PARTNER_PASSWORD');
$emptyPassword = (string) getenv('QA_EMPTY_PASSWORD');

if ($customerPassword === '' || $partnerPassword === '' || $emptyPassword === '') {
    fwrite(STDERR, "Missing required QA_*_PASSWORD environment variables.\n");
    exit(1);
}

$migrateExitCode = Artisan::call('migrate', ['--seed' => true, '--force' => true]);
if ($migrateExitCode !== 0) {
    fwrite(STDERR, Artisan::output());
    exit($migrateExitCode);
}

$now = CarbonImmutable::now();
$today = CarbonImmutable::now('Asia/Kolkata');

/** @var User $customer */
$customer = User::query()->where('email', 'customer@tijum.com')->firstOrFail();
$customer->forceFill([
    'password' => Hash::make($customerPassword),
    'email_verified_at' => $now,
    'phone_verified_at' => $now,
])->save();

/** @var Owner $partner */
$partner = Owner::query()->where('email', 'owner@tijum.com')->firstOrFail();
$partner->forceFill([
    'password' => Hash::make($partnerPassword),
    'email_verified_at' => $now,
    'status' => OwnerStatus::Active,
])->save();

/** @var Property $property */
$property = Property::query()
    ->where('owner_id', $partner->id)
    ->where('name', 'Sri Sai Balaji Executive Hostel & PG')
    ->firstOrFail();

/** @var PropertyRoomType $roomType */
$roomType = PropertyRoomType::query()->where('property_id', $property->id)->firstOrFail();
$rooms = PropertyRoom::query()->where('property_room_type_id', $roomType->id)->orderBy('id')->get();
$room1 = $rooms->get(0);
$room2 = $rooms->get(1) ?? $room1;

// 1. Awaiting Payment Hold Reservation (live 15-min countdown)
$holdRef = 'TJR-2026-HOLD-QA01';
$holdCheckIn = $now->addDays(10)->startOfDay();
$holdCheckOut = $holdCheckIn->addDays(3);
$holdRate = $roomType->daily_rate_minor ?? 85000;
$holdTotal = $holdRate * 3;

$holdRes = Reservation::query()->updateOrCreate(
    ['booking_reference' => $holdRef],
    [
        'user_id' => $customer->id,
        'property_id' => $property->id,
        'property_room_type_id' => $roomType->id,
        'submission_token' => (string) Str::uuid(),
        'check_in_date' => $holdCheckIn->toDateString(),
        'checkout_date' => $holdCheckOut->toDateString(),
        'duration_type' => 'daily',
        'duration_quantity' => 3,
        'total_stay_days' => 3,
        'quantity' => 1,
        'guest_count' => 1,
        'quantity_basis' => ReservationQuantityBasis::PrivateRooms->value,
        'guest_gender' => 'male',
        'guest_composition' => 'individual',
        'contact_name' => $customer->name,
        'contact_email' => $customer->email,
        'contact_phone' => $customer->phone ?? '+919876543210',
        'early_check_in_requested' => false,
        'requested_arrival_time' => '10:00:00',
        'snapshot_property_name' => $property->name,
        'snapshot_property_locality' => $property->locality,
        'snapshot_property_city' => $property->city?->name ?? 'Hyderabad',
        'snapshot_property_state' => 'Telangana',
        'snapshot_property_country_code' => 'IN',
        'snapshot_category_name' => $property->category?->name ?? 'Hostels/PG',
        'snapshot_room_type_name' => $roomType->name,
        'snapshot_is_air_conditioned' => (bool) $roomType->is_air_conditioned,
        'snapshot_sharing_mode' => $roomType->accommodation_mode->value,
        'snapshot_max_capacity' => $roomType->sharing_capacity,
        'snapshot_food_provided' => (bool) $property->food_provided,
        'snapshot_breakfast_included' => (bool) $property->breakfast_included,
        'snapshot_lunch_included' => (bool) $property->lunch_included,
        'snapshot_dinner_included' => (bool) $property->dinner_included,
        'currency_code' => 'INR',
        'unit_rate_minor' => $holdRate,
        'rate_unit' => ReservationRateUnit::PerPrivateRoom->value,
        'total_amount_minor' => $holdTotal,
        'status' => ReservationStatus::AwaitingPayment,
        'submitted_at' => $now,
        'payment_deadline_at' => $now->addMinutes(15),
    ]
);

// 2. Today's Arrival Confirmed Reservation (for Partner Dashboard Today Arrivals + Check-In/Out E2E)
$todayRef = 'TJR-2026-TODAY-QA02';
$todayCheckIn = $today->startOfDay();
$todayCheckOut = $todayCheckIn->addDays(4);
$todayTotal = $holdRate * 4;

$todayRes = Reservation::query()->updateOrCreate(
    ['booking_reference' => $todayRef],
    [
        'user_id' => $customer->id,
        'property_id' => $property->id,
        'property_room_type_id' => $roomType->id,
        'submission_token' => (string) Str::uuid(),
        'check_in_date' => $todayCheckIn->toDateString(),
        'checkout_date' => $todayCheckOut->toDateString(),
        'duration_type' => 'daily',
        'duration_quantity' => 4,
        'total_stay_days' => 4,
        'quantity' => 1,
        'guest_count' => 1,
        'quantity_basis' => ReservationQuantityBasis::PrivateRooms->value,
        'guest_gender' => 'male',
        'guest_composition' => 'individual',
        'contact_name' => $customer->name,
        'contact_email' => $customer->email,
        'contact_phone' => $customer->phone ?? '+919876543210',
        'early_check_in_requested' => false,
        'requested_arrival_time' => '09:30:00',
        'snapshot_property_name' => $property->name,
        'snapshot_property_locality' => $property->locality,
        'snapshot_property_city' => $property->city?->name ?? 'Hyderabad',
        'snapshot_property_state' => 'Telangana',
        'snapshot_property_country_code' => 'IN',
        'snapshot_category_name' => $property->category?->name ?? 'Hostels/PG',
        'snapshot_room_type_name' => $roomType->name,
        'snapshot_is_air_conditioned' => (bool) $roomType->is_air_conditioned,
        'snapshot_sharing_mode' => $roomType->accommodation_mode->value,
        'snapshot_max_capacity' => $roomType->sharing_capacity,
        'snapshot_food_provided' => (bool) $property->food_provided,
        'snapshot_breakfast_included' => (bool) $property->breakfast_included,
        'snapshot_lunch_included' => (bool) $property->lunch_included,
        'snapshot_dinner_included' => (bool) $property->dinner_included,
        'currency_code' => 'INR',
        'unit_rate_minor' => $holdRate,
        'rate_unit' => ReservationRateUnit::PerPrivateRoom->value,
        'total_amount_minor' => $todayTotal,
        'status' => ReservationStatus::Confirmed,
        'submitted_at' => $now->subDay(),
        'confirmed_at' => $now->subDay(),
    ]
);

if ($room2) {
    ReservationRoomAllocation::query()->updateOrCreate(
        [
            'reservation_id' => $todayRes->id,
            'property_room_id' => $room2->id,
        ],
        ['allocated_quantity' => 1]
    );
}

$todayPayment = ReservationPayment::query()->updateOrCreate(
    ['reservation_id' => $todayRes->id],
    [
        'user_id' => $customer->id,
        'gateway' => 'razorpay',
        'gateway_order_id' => 'order_qa_today_01',
        'gateway_payment_id' => 'pay_qa_today_01',
        'idempotency_key' => (string) Str::uuid(),
        'amount_minor' => $todayTotal,
        'currency' => 'INR',
        'status' => PaymentStatus::Captured,
        'gateway_order_created_at' => $now->subDay(),
        'captured_at' => $now->subDay(),
        'metadata' => ['method' => 'upi', 'bank' => 'HDFC Bank'],
    ]
);

// 3. Cancelled Reservation (for Cancelled Tab)
$cancelledRef = 'TJR-2026-CANCEL-QA03';
Reservation::query()->updateOrCreate(
    ['booking_reference' => $cancelledRef],
    [
        'user_id' => $customer->id,
        'property_id' => $property->id,
        'property_room_type_id' => $roomType->id,
        'submission_token' => (string) Str::uuid(),
        'check_in_date' => $now->addDays(15)->toDateString(),
        'checkout_date' => $now->addDays(17)->toDateString(),
        'duration_type' => 'daily',
        'duration_quantity' => 2,
        'total_stay_days' => 2,
        'quantity' => 1,
        'guest_count' => 1,
        'quantity_basis' => ReservationQuantityBasis::PrivateRooms->value,
        'guest_gender' => 'male',
        'guest_composition' => 'individual',
        'contact_name' => $customer->name,
        'contact_email' => $customer->email,
        'contact_phone' => $customer->phone ?? '+919876543210',
        'early_check_in_requested' => false,
        'requested_arrival_time' => '11:00:00',
        'snapshot_property_name' => $property->name,
        'snapshot_property_locality' => $property->locality,
        'snapshot_property_city' => $property->city?->name ?? 'Hyderabad',
        'snapshot_property_state' => 'Telangana',
        'snapshot_property_country_code' => 'IN',
        'snapshot_category_name' => $property->category?->name ?? 'Hostels/PG',
        'snapshot_room_type_name' => $roomType->name,
        'snapshot_is_air_conditioned' => (bool) $roomType->is_air_conditioned,
        'snapshot_sharing_mode' => $roomType->accommodation_mode->value,
        'snapshot_max_capacity' => $roomType->sharing_capacity,
        'snapshot_food_provided' => (bool) $property->food_provided,
        'snapshot_breakfast_included' => (bool) $property->breakfast_included,
        'snapshot_lunch_included' => (bool) $property->lunch_included,
        'snapshot_dinner_included' => (bool) $property->dinner_included,
        'currency_code' => 'INR',
        'unit_rate_minor' => $holdRate,
        'rate_unit' => ReservationRateUnit::PerPrivateRoom->value,
        'total_amount_minor' => $holdRate * 2,
        'status' => ReservationStatus::Cancelled,
        'submitted_at' => $now->subDays(3),
        'cancelled_at' => $now->subDays(2),
        'cancellation_reason' => 'Travel dates changed by guest before check-in.',
    ]
);

// 4. Customer Protection Case (visible on Customer Support & Partner Cases)
$upcomingRes = Reservation::query()->where('booking_reference', 'TJR-2026-UPCOMING-01')->firstOrFail();

// Seed a real published verified review on Sri Sai Balaji Executive Hostel & PG
$pastCompleted = Reservation::query()
    ->where('property_id', $property->id)
    ->where('status', ReservationStatus::Confirmed)
    ->where('id', '!=', $upcomingRes->id)
    ->where('id', '!=', $todayRes->id)
    ->first();
$reviewReservation = $pastCompleted ?? $upcomingRes;
PropertyReview::query()->updateOrCreate(
    ['reservation_id' => $reviewReservation->id],
    [
        'property_id' => $property->id,
        'user_id' => $customer->id,
        'property_room_type_id' => $roomType->id,
        'owner_id' => $partner->id,
        'overall_rating' => 5,
        'cleanliness_rating' => 5,
        'food_quality_rating' => 5,
        'communication_rating' => 5,
        'value_rating' => 5,
        'title' => 'Spotless rooms and punctual South Indian meals',
        'content' => 'Biometric entry, strong Wi-Fi for remote work, and hot breakfast served right on time every morning.',
        'status' => ReviewStatus::Published,
        'verified_booking' => true,
        'customer_display_name' => 'Rahul S.',
        'submitted_at' => $now->subDays(5),
        'published_at' => $now->subDays(4),
    ]
);
$caseRef = 'CASE-2026-QA001';
$case = CustomerProtectionCase::query()->updateOrCreate(
    ['case_reference' => $caseRef],
    [
        'reservation_id' => $upcomingRes->id,
        'user_id' => $customer->id,
        'property_id' => $property->id,
        'owner_id' => $partner->id,
        'category' => CaseCategory::BookingProblem,
        'status' => CaseStatus::UnderReview,
        'priority' => CasePriority::High,
        'description' => 'Requesting confirmation of breakfast service timing and early luggage drop-off before 09:00 AM check-in.',
        'acknowledged_at' => $now->subHours(3),
        'sla_due_at' => $now->addDays(29),
    ]
);

CustomerProtectionCaseMessage::query()->firstOrCreate(
    [
        'customer_protection_case_id' => $case->id,
        'sender_type' => 'customer',
    ],
    [
        'sender_id' => $customer->id,
        'sender_name' => $customer->name,
        'message' => 'Hello TIJUM Support, could you verify whether breakfast starts at 07:30 AM and if early luggage storage is available?',
        'is_internal_note' => false,
    ]
);

// 5. General Support Ticket
$ticketRef = 'TJC-SUP-2026-QA001';
$ticket = SupportTicket::query()->updateOrCreate(
    ['ticket_reference' => $ticketRef],
    [
        'ticket_type' => SupportTicketType::Customer,
        'user_id' => $customer->id,
        'property_id' => $property->id,
        'reservation_id' => $upcomingRes->id,
        'subject' => 'GST Invoice copy request for corporate reimbursement',
        'category' => 'billing_invoice',
        'status' => SupportTicketStatus::InProgress,
        'priority' => SupportTicketPriority::Standard,
        'message' => 'Please share a tax invoice copy for reservation TJR-2026-UPCOMING-01 with my company billing details.',
        'sla_due_at' => $now->addHours(20),
        'last_reply_at' => $now->subHour(),
        'last_reply_by_type' => 'customer',
    ]
);

SupportTicketMessage::query()->firstOrCreate(
    [
        'support_ticket_id' => $ticket->id,
        'sender_type' => 'customer',
    ],
    [
        'sender_id' => $customer->id,
        'sender_name' => $customer->name,
        'message' => 'Please share a tax invoice copy for reservation TJR-2026-UPCOMING-01.',
        'is_internal_note' => false,
    ]
);

// 6. Partner Commission Agreement & Settlement Statements
$admin = Admin::query()->first();
$financialProfile = OwnerFinancialProfile::query()->where('owner_id', $partner->id)->firstOrFail();

$agreement = PartnerCommissionAgreement::query()->updateOrCreate(
    ['agreement_reference' => 'AGR-2026-QA001'],
    [
        'owner_id' => $partner->id,
        'property_id' => null,
        'commission_rate_bps' => 1200,
        'commission_base_type' => CommissionBaseType::GrossBooking,
        'commission_gst_type' => CommissionGstType::Exclusive,
        'terms_version' => '2026.1',
        'status' => CommissionAgreementStatus::Active,
        'effective_from' => $now->subMonths(2)->toDateString(),
        'effective_until' => $now->addMonths(10)->toDateString(),
        'terms_hash' => hash('sha256', 'AGR-2026-QA001|1200|2026.1'),
        'created_by_admin_id' => $admin?->id,
        'approved_by_admin_id' => $admin?->id,
        'accepted_by_owner_id' => $partner->id,
        'accepted_at' => $now->subMonths(2),
    ]
);

$todayRes = app(CommissionCalculationService::class)->snapshotCommissionOnReservation($todayRes, $agreement);

$settledRef = 'STL-2026-QA001';
$settled = PartnerSettlement::query()->updateOrCreate(
    ['settlement_reference' => $settledRef],
    [
        'owner_id' => $partner->id,
        'owner_financial_profile_id' => $financialProfile->id,
        'period_start' => $now->subDays(30)->toDateString(),
        'period_end' => $now->subDays(15)->toDateString(),
        'currency' => 'INR',
        'gross_booking_value_minor' => 1500000,
        'commission_amount_minor' => 180000,
        'commission_tax_amount_minor' => 32400,
        'statutory_deductions_minor' => 1500,
        'refund_adjustments_minor' => 0,
        'relocation_adjustments_minor' => 0,
        'other_adjustments_minor' => 0,
        'net_settlement_amount_minor' => 1286100,
        'status' => SettlementStatus::Settled,
        'approved_by_admin_id' => $admin?->id,
        'approved_at' => $now->subDays(12),
        'transfer_initiated_at' => $now->subDays(11),
        'settled_at' => $now->subDays(10),
        'provider_transfer_id' => 'trf_qa_settled_001',
        'provider_status' => 'processed',
        'reconciled_at' => $now->subDays(10),
    ]
);

PartnerSettlementItem::query()->firstOrCreate(
    [
        'partner_settlement_id' => $settled->id,
        'reservation_id' => $upcomingRes->id,
    ],
    [
        'reservation_payment_id' => ReservationPayment::query()->where('reservation_id', $upcomingRes->id)->value('id'),
        'item_type' => SettlementItemType::BookingPayable,
        'gross_amount_minor' => 1500000,
        'commission_amount_minor' => 180000,
        'commission_tax_amount_minor' => 32400,
        'tax_deduction_minor' => 1500,
        'refund_deduction_minor' => 0,
        'net_payable_minor' => 1286100,
        'notes' => 'Settled bi-weekly booking cycle payout',
    ]
);

$pendingRef = 'STL-2026-QA002';
$pendingSettlement = PartnerSettlement::query()->updateOrCreate(
    ['settlement_reference' => $pendingRef],
    [
        'owner_id' => $partner->id,
        'owner_financial_profile_id' => $financialProfile->id,
        'period_start' => $now->subDays(14)->toDateString(),
        'period_end' => $now->toDateString(),
        'currency' => 'INR',
        'gross_booking_value_minor' => $todayTotal,
        'commission_amount_minor' => (int) round($todayTotal * 0.12),
        'commission_tax_amount_minor' => (int) round($todayTotal * 0.12 * 0.18),
        'statutory_deductions_minor' => (int) round($todayTotal * 0.001),
        'refund_adjustments_minor' => 0,
        'relocation_adjustments_minor' => 0,
        'other_adjustments_minor' => 0,
        'net_settlement_amount_minor' => $todayTotal - (int) round($todayTotal * 0.12) - (int) round($todayTotal * 0.12 * 0.18) - (int) round($todayTotal * 0.001),
        'status' => SettlementStatus::Approved,
        'approved_by_admin_id' => $admin?->id,
        'approved_at' => $now->subHours(4),
    ]
);

PartnerSettlementItem::query()->firstOrCreate(
    [
        'partner_settlement_id' => $pendingSettlement->id,
        'reservation_id' => $todayRes->id,
    ],
    [
        'reservation_payment_id' => $todayPayment->id,
        'item_type' => SettlementItemType::BookingPayable,
        'gross_amount_minor' => $todayTotal,
        'commission_amount_minor' => (int) round($todayTotal * 0.12),
        'commission_tax_amount_minor' => (int) round($todayTotal * 0.12 * 0.18),
        'tax_deduction_minor' => (int) round($todayTotal * 0.001),
        'refund_deduction_minor' => 0,
        'net_payable_minor' => $pendingSettlement->net_settlement_amount_minor,
        'notes' => 'Approved cycle payout awaiting scheduled settlement run',
    ]
);

// 7. Empty-State Fixtures (Zero bookings / properties / cases for genuine empty-state verification)
$emptyCustomer = User::query()->firstOrNew(['email' => 'empty.customer@tijum.test']);
$emptyCustomer->forceFill([
    'name' => 'Aarav EmptyState',
    'email' => 'empty.customer@tijum.test',
    'phone' => '+919000000101',
    'password' => Hash::make($emptyPassword),
    'email_verified_at' => $now,
    'phone_verified_at' => $now,
    'terms_accepted_at' => $now,
])->save();

$emptyPartner = Owner::query()->firstOrNew(['email' => 'empty.partner@tijum.test']);
$emptyPartner->forceFill([
    'name' => 'Meera NewHost',
    'email' => 'empty.partner@tijum.test',
    'phone' => '+919000000202',
    'password' => Hash::make($emptyPassword),
    'status' => OwnerStatus::Active,
    'email_verified_at' => $now,
    'approved_at' => $now,
])->save();

echo json_encode([
    'customer_email' => $customer->email,
    'partner_email' => $partner->email,
    'empty_customer_email' => 'empty.customer@tijum.test',
    'empty_partner_email' => 'empty.partner@tijum.test',
    'property_id' => $property->id,
    'property_slug' => $property->slug,
    'property_name' => $property->name,
    'room_type_id' => $roomType->id,
    'booking_check_in_date' => $today->addDays(20)->toDateString(),
    'upcoming_booking_ref' => $upcomingRes->booking_reference,
    'hold_booking_ref' => $holdRes->booking_reference,
    'today_booking_ref' => $todayRes->booking_reference,
    'cancelled_booking_ref' => $cancelledRef,
    'case_ref' => $case->case_reference,
    'ticket_ref' => $ticket->ticket_reference,
    'settlement_settled_ref' => $settled->settlement_reference,
    'settlement_pending_ref' => $pendingSettlement->settlement_reference,
    'agreement_ref' => $agreement->agreement_reference,
], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES)."\n";

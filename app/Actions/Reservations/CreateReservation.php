<?php

declare(strict_types=1);

namespace App\Actions\Reservations;

use App\Enums\PropertyGenderPolicy;
use App\Enums\ReservationStatus;
use App\Models\CouponCode;
use App\Models\PlatformSetting;
use App\Models\Property;
use App\Models\PropertyRoom;
use App\Models\PropertyRoomType;
use App\Models\Reservation;
use App\Models\User;
use App\Services\Financial\CommissionCalculationService;
use App\Services\Notifications\NotificationDispatcher;
use App\Services\Promotions\CentralPromotionEngine;
use App\Services\Promotions\CouponRedemptionService;
use App\Services\Protection\CancellationPolicyService;
use App\Services\ReservationPricingService;
use App\Services\ReservationQuoteService;
use App\Services\Rewards\LoyaltyPointsService;
use Carbon\CarbonImmutable;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class CreateReservation
{
    private readonly CancellationPolicyService $policyService;

    public function __construct(
        private readonly ReservationPricingService $pricing,
        private readonly ReservationQuoteService $quotes,
        ?CancellationPolicyService $policyService = null,
    ) {
        $this->policyService = $policyService ?? app(CancellationPolicyService::class);
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function execute(User $user, array $data): Reservation
    {
        $token = (string) $data['submission_token'];
        $checkIn = (string) $data['check_in_date'];
        $reference = 'TJR-'.CarbonImmutable::parse($checkIn, $this->pricing->timezone())->format('Y').'-'.Str::ulid();

        // Idempotent replay: return the existing row for a duplicate submission token.
        $existing = Reservation::query()
            ->where('user_id', $user->id)
            ->where('submission_token', $token)
            ->first();
        if ($existing instanceof Reservation) {
            return $existing;
        }

        try {
            return DB::transaction(function () use ($user, $data, $token, $checkIn, $reference): Reservation {
                $existing = Reservation::query()
                    ->where('user_id', $user->id)
                    ->where('submission_token', $token)
                    ->lockForUpdate()
                    ->first();
                if ($existing instanceof Reservation) {
                    return $existing;
                }

                $property = Property::query()->whereKey((int) $data['property_id'])->lockForUpdate()->firstOrFail();
                $roomType = PropertyRoomType::query()->where('property_id', $property->id)
                    ->whereKey((int) $data['property_room_type_id'])
                    ->lockForUpdate()
                    ->firstOrFail();

                // Lock physical rooms to ensure inventory checks are protected under InnoDB row locks
                PropertyRoom::query()
                    ->where('property_id', $property->id)
                    ->where('property_room_type_id', $roomType->id)
                    ->lockForUpdate()
                    ->get();

                $this->assertGuestEligibility($roomType, $data);

                $quantity = (int) $data['quantity'];
                $durationType = (string) $data['duration_type'];
                $durationQuantity = (int) $data['duration_quantity'];

                $quoteResult = $this->quotes->quote(
                    $property,
                    $roomType,
                    $checkIn,
                    $durationType,
                    $durationQuantity,
                    $quantity,
                    $data['requested_arrival_time'] ?? null,
                );

                if (! $quoteResult['eligible'] || ! is_array($quoteResult['quote'])) {
                    throw ValidationException::withMessages([
                        'reservation' => implode(' ', $quoteResult['errors']),
                    ]);
                }

                $quote = $quoteResult['quote'];
                $checkout = (string) $quote['check_out_date'];

                $couponCodeInput = isset($data['coupon_code']) && trim((string) $data['coupon_code']) !== ''
                    ? trim((string) $data['coupon_code'])
                    : null;
                $pointsInput = isset($data['points_to_redeem']) ? (int) $data['points_to_redeem'] : 0;

                $promoEngine = app(CentralPromotionEngine::class);
                $promo = $promoEngine->calculate(
                    user: $user,
                    property: $property,
                    subtotalMinor: (int) $quote['total_amount_minor'],
                    taxMinor: 0,
                    couponCode: $couponCodeInput,
                    pointsToRedeem: $pointsInput,
                    stayDays: (int) $quote['total_stay_days'],
                );

                if (! $promo['is_valid']) {
                    throw ValidationException::withMessages([
                        'coupon_code' => $promo['error'] ?? 'Invalid coupon code or promotional discount.',
                    ]);
                }

                $originalAmountMinor = (int) $quote['total_amount_minor'];
                $finalPayableMinor = (int) $promo['total_payable_minor'];

                $couponModel = null;
                if ($promo['coupon_applied'] && $promo['coupon_code']) {
                    $couponModel = CouponCode::query()->where('code', $promo['coupon_code'])->first();
                }

                $now = CarbonImmutable::now();
                $expiryMinutes = (int) (PlatformSetting::get('timings.checkout_expiry_minutes') ?? config('tijum.payments.checkout_expiry_minutes', 15));

                $reservation = new Reservation;
                $reservation->forceFill(array_merge($this->baseAttributes(
                    $user,
                    $property,
                    $roomType,
                    $token,
                    $reference,
                    $data,
                    $quote,
                ), $this->snapshotAttributes($property, $roomType), [
                    'currency_code' => $quote['currency_code'],
                    'unit_rate_minor' => $quote['unit_rate_minor'],
                    'rate_unit' => $quote['rate_unit'],
                    'original_amount_minor' => $originalAmountMinor,
                    'total_amount_minor' => $finalPayableMinor,
                    'coupon_code_id' => $couponModel?->id,
                    'coupon_code' => $promo['coupon_code'],
                    'coupon_discount_minor' => $promo['coupon_discount_minor'],
                    'coupon_funding_source' => $promo['coupon_funding_source'],
                    'coupon_property_share_minor' => $promo['coupon_property_share_minor'],
                    'points_redeemed' => $promo['points_redeemed'],
                    'points_discount_minor' => $promo['points_discount_minor'],
                    'points_awarded_potential' => $promo['points_potential_earned'],
                    'status' => ReservationStatus::AwaitingPayment->value,
                    'submitted_at' => $now,
                    'payment_deadline_at' => $now->addMinutes($expiryMinutes),
                ]));

                $reservation->save();

                // Create holds linked to this reservation
                if ($couponModel !== null && ($promo['coupon_discount_minor'] > 0 || $promo['coupon_bonus_points'] > 0)) {
                    app(CouponRedemptionService::class)->createHold(
                        coupon: $couponModel,
                        user: $user,
                        discountAmountMinor: $promo['coupon_discount_minor'],
                        reservation: $reservation,
                    );
                }

                if ($promo['points_redeemed'] > 0) {
                    app(LoyaltyPointsService::class)->createHold(
                        user: $user,
                        pointsToRedeem: $promo['points_redeemed'],
                        reservation: $reservation,
                    );
                }

                app(CommissionCalculationService::class)
                    ->snapshotCommissionOnReservation($reservation);

                $saved = $reservation->fresh() ?? $reservation;

                try {
                    $saved->loadMissing(['user', 'property.owner']);
                    if ($saved->user !== null && $saved->property !== null) {
                        app(NotificationDispatcher::class)->dispatch(
                            eventType: 'reservation.submitted',
                            recipients: $saved->user,
                            variables: [
                                'customer_name' => $saved->user->name,
                                'booking_reference' => $saved->booking_reference,
                                'property_name' => $saved->property->name,
                                'payment_deadline' => $saved->payment_deadline_at?->setTimezone($this->pricing->timezone())->format('H:i').' IST',
                                'amount' => number_format($saved->total_amount_minor / 100, 2),
                                'action_url' => url("/reservations/{$saved->id}"),
                            ],
                            related: $saved,
                            relatedReference: $saved->booking_reference
                        );
                    }
                } catch (\Throwable) {
                    // Safe error handling for transactional isolation
                }

                return $saved;
            }, 3);
        } catch (QueryException $e) {
            if (! $this->isUniqueViolation($e)) {
                throw $e;
            }

            // Unique-race recovery: a concurrent request won the insert; replay returns that row.
            $existing = Reservation::query()
                ->where('user_id', $user->id)
                ->where('submission_token', $token)
                ->first();

            if ($existing instanceof Reservation) {
                return $existing;
            }

            throw ValidationException::withMessages([
                'submission_token' => 'This reservation submission token has already been used.',
            ]);
        }
    }

    /**
     * @param  array<string, mixed>  $data
     * @param  array<string, mixed>  $quote
     * @return array<string, mixed>
     */
    private function baseAttributes(
        User $user,
        Property $property,
        PropertyRoomType $roomType,
        string $token,
        string $reference,
        array $data,
        array $quote,
    ): array {
        $checkIn = (string) $data['check_in_date'];

        return [
            'user_id' => $user->id,
            'property_id' => $property->id,
            'property_room_type_id' => $roomType->id,
            'booking_reference' => $reference,
            'submission_token' => $token,
            'check_in_date' => $checkIn,
            'checkout_date' => $quote['check_out_date'],
            'duration_type' => $quote['duration_type'],
            'duration_quantity' => $quote['duration_quantity'],
            'total_stay_days' => $quote['total_stay_days'],
            'quantity' => $quote['quantity'],
            'guest_count' => $quote['guest_count'],
            'quantity_basis' => $quote['quantity_basis'],
            'guest_gender' => $data['guest_gender'],
            'guest_composition' => $data['guest_composition'],
            'contact_name' => $data['contact_name'],
            'contact_email' => $data['contact_email'],
            'contact_phone' => $data['contact_phone'],
            'cancellation_policy_version' => $this->policyService->getActivePolicy()->version,
            'cancellation_policy_snapshot' => $this->policyService->getActivePolicy()->toSnapshotArray(),
            'early_check_in_requested' => (bool) $quote['early_check_in']['requested'],
            'requested_arrival_time' => $quote['early_check_in']['requested_arrival_time'],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function snapshotAttributes(Property $property, PropertyRoomType $roomType): array
    {
        $property->loadMissing(['category', 'city']);
        $isShared = $roomType->accommodation_mode->value === 'shared';

        return [
            'snapshot_property_name' => $property->name,
            'snapshot_property_locality' => $property->locality,
            'snapshot_property_city' => $property->city?->name,
            'snapshot_property_state' => $property->state,
            'snapshot_property_country_code' => $property->country_code,
            'snapshot_category_name' => $property->category?->name,
            'snapshot_room_type_name' => $roomType->name,
            'snapshot_is_air_conditioned' => (bool) $roomType->is_air_conditioned,
            'snapshot_sharing_mode' => $roomType->accommodation_mode->value,
            'snapshot_max_capacity' => $isShared ? (int) $roomType->max_guests_per_room : 1,
            'snapshot_food_provided' => (bool) $property->food_provided,
            'snapshot_breakfast_included' => (bool) $property->breakfast_included,
            'snapshot_lunch_included' => (bool) $property->lunch_included,
            'snapshot_dinner_included' => (bool) $property->dinner_included,
        ];
    }

    /** @param array<string, mixed> $data */
    private function assertGuestEligibility(PropertyRoomType $roomType, array $data): void
    {
        $gender = (string) $data['guest_gender'];
        $genderEligible = match ($roomType->gender_policy) {
            PropertyGenderPolicy::MaleOnly => $gender === 'male',
            PropertyGenderPolicy::FemaleOnly => $gender === 'female',
            PropertyGenderPolicy::AllGenders, PropertyGenderPolicy::NotApplicable => in_array($gender, ['male', 'female', 'mixed'], true),
        };

        if (! $genderEligible) {
            throw ValidationException::withMessages([
                'guest_gender' => 'The selected room type does not allow this guest gender selection.',
            ]);
        }

        $allowedCompositions = array_map('strval', (array) $roomType->guest_composition_policy);
        if (! in_array((string) $data['guest_composition'], $allowedCompositions, true)) {
            throw ValidationException::withMessages([
                'guest_composition' => 'The selected room type does not allow this guest composition.',
            ]);
        }
    }

    private function isUniqueViolation(QueryException $e): bool
    {
        return $e->getCode() === '23000'
            || str_contains($e->getMessage(), 'unique')
            || str_contains($e->getMessage(), 'UNIQUE');
    }
}

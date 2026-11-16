<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\CommissionBaseType;
use App\Enums\CommissionSnapshotStatus;
use App\Enums\PaymentStatus;
use App\Enums\ReservationQuantityBasis;
use App\Enums\ReservationRateUnit;
use App\Enums\ReservationStatus;
use Carbon\CarbonImmutable;
use Database\Factories\ReservationFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

/**
 * @property int $id
 * @property int $user_id
 * @property int $property_id
 * @property int $property_room_type_id
 * @property string $booking_reference
 * @property string $submission_token
 * @property CarbonImmutable $check_in_date
 * @property CarbonImmutable $checkout_date
 * @property string $duration_type
 * @property int $duration_quantity
 * @property int $total_stay_days
 * @property int $quantity
 * @property int $guest_count
 * @property ReservationQuantityBasis $quantity_basis
 * @property string $guest_gender
 * @property string $guest_composition
 * @property string $contact_name
 * @property string $contact_email
 * @property string $contact_phone
 * @property bool $early_check_in_requested
 * @property string|null $requested_arrival_time
 * @property string $snapshot_property_name
 * @property string|null $snapshot_property_locality
 * @property string|null $snapshot_property_city
 * @property string|null $snapshot_property_state
 * @property string|null $snapshot_property_country_code
 * @property string|null $snapshot_category_name
 * @property string $snapshot_room_type_name
 * @property bool $snapshot_is_air_conditioned
 * @property string|null $snapshot_sharing_mode
 * @property int|null $snapshot_max_capacity
 * @property bool $snapshot_food_provided
 * @property bool $snapshot_breakfast_included
 * @property bool $snapshot_lunch_included
 * @property bool $snapshot_dinner_included
 * @property string $currency_code
 * @property int $unit_rate_minor
 * @property ReservationRateUnit $rate_unit
 * @property int $total_amount_minor
 * @property ReservationStatus $status
 * @property CarbonImmutable $submitted_at
 * @property CarbonImmutable|null $payment_deadline_at
 * @property CarbonImmutable|null $confirmed_at
 * @property CarbonImmutable|null $cancelled_at
 * @property CarbonImmutable|null $expired_at
 * @property int|null $cancelled_by_user_id
 * @property int|null $cancelled_by_owner_id
 * @property string|null $cancellation_reason
 * @property bool $requires_refund_review
 * @property CommissionSnapshotStatus $commission_status
 * @property CommissionBaseType $commission_base_type
 * @property CarbonImmutable|null $checked_in_at
 * @property string|null $checked_in_by_type
 * @property int|null $checked_in_by_id
 * @property string|null $check_in_notes
 * @property CarbonImmutable|null $checked_out_at
 * @property string|null $checked_out_by_type
 * @property int|null $checked_out_by_id
 * @property string|null $checkout_notes
 * @property-read Collection<int, ReservationRoomAllocation> $allocations
 * @property-read Collection<int, ReservationPayment> $payments
 * @property-read Collection<int, ReservationRefund> $refunds
 */
class Reservation extends Model
{
    /** @use HasFactory<ReservationFactory> */
    use HasFactory;

    /**
     * Reservations are mutated via controlled domain actions.
     *
     * @var list<string>
     */
    protected $guarded = [];

    /**
     * Reservations are looked up by their public booking reference in routes.
     */
    public function getRouteKeyName(): string
    {
        return 'booking_reference';
    }

    /**
     * @return array{
     *     status: 'App\\Enums\\ReservationStatus',
     *     quantity_basis: 'App\\Enums\\ReservationQuantityBasis',
     *     rate_unit: 'App\\Enums\\ReservationRateUnit',
     *     check_in_date: 'date',
     *     checkout_date: 'date',
     *     submitted_at: 'datetime',
     *     payment_deadline_at: 'datetime',
     *     confirmed_at: 'datetime',
     *     cancelled_at: 'datetime',
     *     expired_at: 'datetime',
     *     early_check_in_requested: 'boolean',
     *     requires_refund_review: 'boolean',
     *     snapshot_is_air_conditioned: 'boolean',
     *     snapshot_food_provided: 'boolean',
     *     snapshot_breakfast_included: 'boolean',
     *     snapshot_lunch_included: 'boolean',
     *     snapshot_dinner_included: 'boolean',
     * }
     */
    protected function casts(): array
    {
        return [
            'status' => ReservationStatus::class,
            'quantity_basis' => ReservationQuantityBasis::class,
            'rate_unit' => ReservationRateUnit::class,
            'check_in_date' => 'date',
            'checkout_date' => 'date',
            'submitted_at' => 'datetime',
            'payment_deadline_at' => 'datetime',
            'confirmed_at' => 'datetime',
            'cancelled_at' => 'datetime',
            'expired_at' => 'datetime',
            'checked_in_at' => 'datetime',
            'checked_out_at' => 'datetime',
            'early_check_in_requested' => 'boolean',
            'requires_refund_review' => 'boolean',
            'is_relocated_replacement' => 'boolean',
            'cancellation_policy_snapshot' => 'array',
            'snapshot_is_air_conditioned' => 'boolean',
            'snapshot_food_provided' => 'boolean',
            'snapshot_breakfast_included' => 'boolean',
            'snapshot_lunch_included' => 'boolean',
            'snapshot_dinner_included' => 'boolean',
            'commission_rate_bps' => 'integer',
            'commissionable_base_minor' => 'integer',
            'commission_amount_minor' => 'integer',
            'commission_tax_amount_minor' => 'integer',
            'net_partner_payable_minor' => 'integer',
            'commission_status' => CommissionSnapshotStatus::class,
            'commission_base_type' => CommissionBaseType::class,
            'original_amount_minor' => 'integer',
            'coupon_discount_minor' => 'integer',
            'coupon_property_share_minor' => 'integer',
            'points_redeemed' => 'integer',
            'points_discount_minor' => 'integer',
            'points_awarded_potential' => 'integer',
            'points_awarded_credited' => 'integer',
        ];
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * @return BelongsTo<Property, $this>
     */
    public function property(): BelongsTo
    {
        return $this->belongsTo(Property::class);
    }

    /**
     * @return BelongsTo<PropertyRoomType, $this>
     */
    public function roomType(): BelongsTo
    {
        return $this->belongsTo(PropertyRoomType::class, 'property_room_type_id');
    }

    /**
     * @return HasMany<ReservationRoomAllocation, $this>
     */
    public function allocations(): HasMany
    {
        return $this->hasMany(ReservationRoomAllocation::class, 'reservation_id')
            ->orderBy('id');
    }

    /**
     * @return HasMany<ReservationPayment, $this>
     */
    public function payments(): HasMany
    {
        return $this->hasMany(ReservationPayment::class, 'reservation_id')
            ->orderByDesc('id');
    }

    /**
     * @return BelongsTo<PartnerCommissionAgreement, $this>
     */
    public function commissionAgreement(): BelongsTo
    {
        return $this->belongsTo(PartnerCommissionAgreement::class, 'commission_agreement_id');
    }

    /**
     * @return HasMany<PartnerSettlementItem, $this>
     */
    public function settlementItems(): HasMany
    {
        return $this->hasMany(PartnerSettlementItem::class);
    }

    /**
     * @return HasOne<ReservationPayment, $this>
     */
    public function successfulPayment(): HasOne
    {
        return $this->hasOne(ReservationPayment::class, 'reservation_id')
            ->whereIn('status', [
                PaymentStatus::Captured->value,
                PaymentStatus::RefundPending->value,
                PaymentStatus::PartiallyRefunded->value,
                PaymentStatus::Refunded->value,
            ]);
    }

    /**
     * @return HasMany<ReservationRefund, $this>
     */
    public function refunds(): HasMany
    {
        return $this->hasMany(ReservationRefund::class, 'reservation_id')
            ->orderByDesc('id');
    }

    /**
     * @return HasMany<CustomerProtectionCase, $this>
     */
    public function cases(): HasMany
    {
        return $this->hasMany(CustomerProtectionCase::class, 'reservation_id')
            ->orderByDesc('id');
    }

    /**
     * @return HasOne<PropertyReview, $this>
     */
    public function review(): HasOne
    {
        return $this->hasOne(PropertyReview::class, 'reservation_id');
    }

    /**
     * @return BelongsTo<CouponCode, $this>
     */
    public function couponCode(): BelongsTo
    {
        return $this->belongsTo(CouponCode::class, 'coupon_code_id');
    }

    /**
     * @return HasOne<CouponRedemption, $this>
     */
    public function couponRedemption(): HasOne
    {
        return $this->hasOne(CouponRedemption::class, 'reservation_id');
    }

    /**
     * @return HasOne<CouponHold, $this>
     */
    public function couponHold(): HasOne
    {
        return $this->hasOne(CouponHold::class, 'reservation_id');
    }

    /**
     * @return HasOne<PointsReservationHold, $this>
     */
    public function pointsHold(): HasOne
    {
        return $this->hasOne(PointsReservationHold::class, 'reservation_id');
    }

    /**
     * @return HasMany<ReservationRelocation, $this>
     */
    public function relocations(): HasMany
    {
        return $this->hasMany(ReservationRelocation::class, 'source_reservation_id')
            ->orderByDesc('id');
    }

    /**
     * @return BelongsTo<Reservation, $this>
     */
    public function originalReservation(): BelongsTo
    {
        return $this->belongsTo(Reservation::class, 'original_reservation_id');
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function cancelledByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'cancelled_by_user_id');
    }

    /**
     * @return BelongsTo<Owner, $this>
     */
    public function cancelledByOwner(): BelongsTo
    {
        return $this->belongsTo(Owner::class, 'cancelled_by_owner_id');
    }

    /**
     * Statuses that consume capacity for the duration of the stay.
     * Active awaiting payment reservations consume capacity only while within payment deadline.
     *
     * @param  Builder<self>  $query
     * @return Builder<self>
     */
    public function scopeConsuming(Builder $query): Builder
    {
        return $query->where(function (Builder $sub): void {
            $sub->where('status', ReservationStatus::Confirmed)
                ->orWhere(function (Builder $q): void {
                    $q->where('status', ReservationStatus::AwaitingPayment)
                        ->where(function (Builder $deadline): void {
                            $deadline->whereNull('payment_deadline_at')
                                ->orWhere('payment_deadline_at', '>=', now());
                        });
                });
        });
    }

    /**
     * Reservations occupying the half-open interval [$checkIn, $checkout).
     *
     * @param  Builder<self>  $query
     * @return Builder<self>
     */
    public function scopeOverlapping(Builder $query, string $checkIn, string $checkout): Builder
    {
        return $query->whereDate('check_in_date', '<', $checkout)
            ->whereDate('checkout_date', '>', $checkIn);
    }

    public function isConsuming(): bool
    {
        if ($this->status === ReservationStatus::Confirmed) {
            return true;
        }

        if ($this->status === ReservationStatus::AwaitingPayment) {
            return $this->payment_deadline_at === null || $this->payment_deadline_at->isFuture();
        }

        return false;
    }

    public function allocatedQuantity(): int
    {
        if ($this->relationLoaded('allocations')) {
            return (int) $this->allocations->sum('allocated_quantity');
        }

        return (int) $this->allocations()->sum('allocated_quantity');
    }

    public function remainingQuantity(): int
    {
        return max(0, (int) $this->quantity - $this->allocatedQuantity());
    }

    public function statusLabel(): string
    {
        return $this->status->label();
    }

    public function statusSemantic(): string
    {
        return $this->status->semantic();
    }

    public function isAwaitingPayment(): bool
    {
        return $this->status === ReservationStatus::AwaitingPayment;
    }

    public function isPaymentDeadlineExpired(): bool
    {
        return $this->payment_deadline_at !== null && $this->payment_deadline_at->isPast();
    }

    public function canAcceptPayment(): bool
    {
        return $this->status === ReservationStatus::AwaitingPayment
            && ($this->payment_deadline_at === null || $this->payment_deadline_at->isFuture());
    }

    public function paymentStatus(): ?PaymentStatus
    {
        if ($this->relationLoaded('successfulPayment')) {
            if ($this->successfulPayment !== null) {
                return $this->successfulPayment->status;
            }
        } elseif ($this->relationLoaded('payments')) {
            $successful = $this->payments->first(fn (ReservationPayment $payment): bool => in_array($payment->status, [
                PaymentStatus::Captured,
                PaymentStatus::RefundPending,
                PaymentStatus::PartiallyRefunded,
                PaymentStatus::Refunded,
            ], true));

            if ($successful !== null) {
                return $successful->status;
            }

            return $this->payments->sortByDesc('id')->first()?->status;
        } else {
            $successful = $this->successfulPayment()->first();
            if ($successful !== null) {
                return $successful->status;
            }

            return $this->payments()->latest('id')->first()?->status;
        }

        if ($this->relationLoaded('payments')) {
            return $this->payments->sortByDesc('id')->first()?->status;
        }

        return $this->payments()->latest('id')->first()?->status;
    }

    public function quantityBasisLabel(): string
    {
        return $this->quantity_basis->label();
    }

    public function durationLabel(): string
    {
        $days = (int) $this->total_stay_days;

        return $days === 1 ? '1 day' : "{$days} days";
    }

    public function isCheckedIn(): bool
    {
        return $this->checked_in_at !== null;
    }

    public function isCheckedOut(): bool
    {
        return $this->checked_out_at !== null;
    }

    public function markCheckedIn(string $byType, int $byId, ?string $notes = null): void
    {
        $this->forceFill([
            'checked_in_at' => now(),
            'checked_in_by_type' => $byType,
            'checked_in_by_id' => $byId,
            'check_in_notes' => $notes ?: $this->check_in_notes,
        ])->save();
    }

    public function undoCheckIn(): void
    {
        $this->forceFill([
            'checked_in_at' => null,
            'checked_in_by_type' => null,
            'checked_in_by_id' => null,
            'check_in_notes' => null,
        ])->save();
    }

    public function markCheckedOut(string $byType, int $byId, ?string $notes = null): void
    {
        $this->forceFill([
            'checked_out_at' => now(),
            'checked_out_by_type' => $byType,
            'checked_out_by_id' => $byId,
            'checkout_notes' => $notes ?: $this->checkout_notes,
        ])->save();
    }

    public function undoCheckOut(): void
    {
        $this->forceFill([
            'checked_out_at' => null,
            'checked_out_by_type' => null,
            'checked_out_by_id' => null,
            'checkout_notes' => null,
        ])->save();
    }
}

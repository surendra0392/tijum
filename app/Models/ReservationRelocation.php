<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\RelocationStatus;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int|null $customer_protection_case_id
 * @property int $source_reservation_id
 * @property int $destination_property_id
 * @property int $destination_room_type_id
 * @property int $destination_owner_id
 * @property int|null $replacement_reservation_id
 * @property RelocationStatus $status
 * @property int $offered_quantity
 * @property CarbonImmutable $offered_check_in_date
 * @property CarbonImmutable $offered_checkout_date
 * @property int $original_amount_minor
 * @property int $alternative_amount_minor
 * @property int $price_difference_minor
 * @property int|null $difference_refund_id
 * @property CarbonImmutable|null $destination_owner_accepted_at
 * @property CarbonImmutable|null $customer_decision_at
 * @property string|null $customer_decision
 * @property CarbonImmutable $offer_expires_at
 * @property int $created_by_admin_id
 * @property string|null $admin_notes
 * @property CarbonImmutable $created_at
 * @property CarbonImmutable $updated_at
 * @property-read CustomerProtectionCase|null $case
 * @property-read Reservation $sourceReservation
 * @property-read Property $destinationProperty
 * @property-read PropertyRoomType $destinationRoomType
 * @property-read Owner $destinationOwner
 * @property-read Reservation|null $replacementReservation
 * @property-read ReservationRefund|null $differenceRefund
 * @property-read Admin $createdByAdmin
 */
class ReservationRelocation extends Model
{
    protected $guarded = [];

    /**
     * @return array{
     *     status: 'App\\Enums\\RelocationStatus',
     *     offered_check_in_date: 'date',
     *     offered_checkout_date: 'date',
     *     original_amount_minor: 'integer',
     *     alternative_amount_minor: 'integer',
     *     price_difference_minor: 'integer',
     *     destination_owner_accepted_at: 'datetime',
     *     customer_decision_at: 'datetime',
     *     offer_expires_at: 'datetime',
     * }
     */
    protected function casts(): array
    {
        return [
            'status' => RelocationStatus::class,
            'offered_check_in_date' => 'date',
            'offered_checkout_date' => 'date',
            'original_amount_minor' => 'integer',
            'alternative_amount_minor' => 'integer',
            'price_difference_minor' => 'integer',
            'destination_owner_accepted_at' => 'datetime',
            'customer_decision_at' => 'datetime',
            'offer_expires_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<CustomerProtectionCase, $this>
     */
    public function case(): BelongsTo
    {
        return $this->belongsTo(CustomerProtectionCase::class, 'customer_protection_case_id');
    }

    /**
     * @return BelongsTo<Reservation, $this>
     */
    public function sourceReservation(): BelongsTo
    {
        return $this->belongsTo(Reservation::class, 'source_reservation_id');
    }

    /**
     * @return BelongsTo<Property, $this>
     */
    public function destinationProperty(): BelongsTo
    {
        return $this->belongsTo(Property::class, 'destination_property_id');
    }

    /**
     * @return BelongsTo<PropertyRoomType, $this>
     */
    public function destinationRoomType(): BelongsTo
    {
        return $this->belongsTo(PropertyRoomType::class, 'destination_room_type_id');
    }

    /**
     * @return BelongsTo<Owner, $this>
     */
    public function destinationOwner(): BelongsTo
    {
        return $this->belongsTo(Owner::class, 'destination_owner_id');
    }

    /**
     * @return BelongsTo<Reservation, $this>
     */
    public function replacementReservation(): BelongsTo
    {
        return $this->belongsTo(Reservation::class, 'replacement_reservation_id');
    }

    /**
     * @return BelongsTo<ReservationRefund, $this>
     */
    public function differenceRefund(): BelongsTo
    {
        return $this->belongsTo(ReservationRefund::class, 'difference_refund_id');
    }

    /**
     * @return BelongsTo<Admin, $this>
     */
    public function createdByAdmin(): BelongsTo
    {
        return $this->belongsTo(Admin::class, 'created_by_admin_id');
    }

    public function isExpired(): bool
    {
        return $this->status === RelocationStatus::Offered && $this->offer_expires_at->isPast();
    }
}

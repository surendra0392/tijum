<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\RelocationSubsidyStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PlatformRelocationSubsidy extends Model
{
    /**
     * @var list<string>
     */
    protected $fillable = [
        'subsidy_reference',
        'source_reservation_id',
        'replacement_reservation_id',
        'customer_protection_case_id',
        'source_amount_minor',
        'destination_amount_minor',
        'subsidy_amount_minor',
        'currency',
        'status',
        'approved_by_admin_id',
        'approved_at',
        'funding_reference',
        'notes',
    ];

    /**
     * @return array{
     *     source_amount_minor: 'integer',
     *     destination_amount_minor: 'integer',
     *     subsidy_amount_minor: 'integer',
     *     status: 'App\\Enums\\RelocationSubsidyStatus',
     *     approved_at: 'datetime',
     * }
     */
    protected function casts(): array
    {
        return [
            'source_amount_minor' => 'integer',
            'destination_amount_minor' => 'integer',
            'subsidy_amount_minor' => 'integer',
            'status' => RelocationSubsidyStatus::class,
            'approved_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<Reservation, $this>
     */
    public function sourceReservation(): BelongsTo
    {
        return $this->belongsTo(Reservation::class, 'source_reservation_id');
    }

    /**
     * @return BelongsTo<Reservation, $this>
     */
    public function replacementReservation(): BelongsTo
    {
        return $this->belongsTo(Reservation::class, 'replacement_reservation_id');
    }

    /**
     * @return BelongsTo<CustomerProtectionCase, $this>
     */
    public function case(): BelongsTo
    {
        return $this->belongsTo(CustomerProtectionCase::class, 'customer_protection_case_id');
    }

    /**
     * @return BelongsTo<Admin, $this>
     */
    public function approvedByAdmin(): BelongsTo
    {
        return $this->belongsTo(Admin::class, 'approved_by_admin_id');
    }
}

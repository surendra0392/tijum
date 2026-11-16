<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\ReferralStatus;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $referrer_user_id
 * @property int $referred_user_id
 * @property string $referral_code_used
 * @property ReferralStatus $status
 * @property int|null $qualifying_reservation_id
 * @property string|null $attribution_ip
 * @property string|null $attribution_user_agent
 * @property string|null $attribution_device_fingerprint
 * @property int $referrer_reward_points
 * @property int $referred_reward_points
 * @property CarbonImmutable|null $reward_points_credited_at
 * @property string|null $disqualification_reason
 * @property CarbonImmutable|null $created_at
 * @property CarbonImmutable|null $updated_at
 * @property-read User $referrer
 * @property-read User $referred
 * @property-read User $referredUser
 * @property-read Reservation|null $qualifyingReservation
 */
class CustomerReferral extends Model
{
    protected $fillable = [
        'referrer_user_id',
        'referred_user_id',
        'referral_code_used',
        'status',
        'qualifying_reservation_id',
        'attribution_ip',
        'attribution_user_agent',
        'attribution_device_fingerprint',
        'referrer_reward_points',
        'referred_reward_points',
        'reward_points_credited_at',
        'disqualification_reason',
    ];

    protected function casts(): array
    {
        return [
            'status' => ReferralStatus::class,
            'referrer_reward_points' => 'integer',
            'referred_reward_points' => 'integer',
            'reward_points_credited_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function referrer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'referrer_user_id');
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function referred(): BelongsTo
    {
        return $this->belongsTo(User::class, 'referred_user_id');
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function referredUser(): BelongsTo
    {
        return $this->referred();
    }

    /**
     * @return BelongsTo<Reservation, $this>
     */
    public function qualifyingReservation(): BelongsTo
    {
        return $this->belongsTo(Reservation::class, 'qualifying_reservation_id');
    }
}

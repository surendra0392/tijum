<?php

declare(strict_types=1);

namespace App\Models;

use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $user_id
 * @property string $referral_code
 * @property int $total_referrals_count
 * @property int $successful_referrals_count
 * @property int $total_points_earned
 * @property bool $is_blocked
 * @property CarbonImmutable|null $created_at
 * @property CarbonImmutable|null $updated_at
 * @property-read User $user
 */
class CustomerReferralProfile extends Model
{
    protected $fillable = [
        'user_id',
        'referral_code',
        'total_referrals_count',
        'successful_referrals_count',
        'total_points_earned',
        'is_blocked',
    ];

    protected function casts(): array
    {
        return [
            'total_referrals_count' => 'integer',
            'successful_referrals_count' => 'integer',
            'total_points_earned' => 'integer',
            'is_blocked' => 'boolean',
        ];
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}

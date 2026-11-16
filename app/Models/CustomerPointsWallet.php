<?php

declare(strict_types=1);

namespace App\Models;

use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $user_id
 * @property int $available_points
 * @property int $pending_points
 * @property int $reserved_points
 * @property int $redeemed_points
 * @property int $expired_points
 * @property int $total_points_earned
 * @property CarbonImmutable|null $created_at
 * @property CarbonImmutable|null $updated_at
 * @property-read User $user
 */
class CustomerPointsWallet extends Model
{
    protected $fillable = [
        'user_id',
        'available_points',
        'pending_points',
        'reserved_points',
        'redeemed_points',
        'expired_points',
        'total_points_earned',
    ];

    protected function casts(): array
    {
        return [
            'available_points' => 'integer',
            'pending_points' => 'integer',
            'reserved_points' => 'integer',
            'redeemed_points' => 'integer',
            'expired_points' => 'integer',
            'total_points_earned' => 'integer',
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

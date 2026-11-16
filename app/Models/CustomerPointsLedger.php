<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\PointsTransactionStatus;
use App\Enums\PointsTransactionType;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $user_id
 * @property PointsTransactionType $transaction_type
 * @property PointsTransactionStatus $status
 * @property int $points
 * @property int $inr_equivalent_minor
 * @property int $running_balance_after
 * @property string $reference_type
 * @property int|null $reference_id
 * @property string|null $idempotency_key
 * @property CarbonImmutable|null $expires_at
 * @property int $points_remaining
 * @property array<int>|null $consumed_from_entry_ids
 * @property int|null $admin_id
 * @property string|null $notes
 * @property CarbonImmutable|null $created_at
 * @property CarbonImmutable|null $updated_at
 * @property-read User $user
 * @property-read Admin|null $admin
 */
class CustomerPointsLedger extends Model
{
    protected $table = 'customer_points_ledger';

    protected $fillable = [
        'user_id',
        'transaction_type',
        'status',
        'points',
        'inr_equivalent_minor',
        'running_balance_after',
        'reference_type',
        'reference_id',
        'idempotency_key',
        'expires_at',
        'points_remaining',
        'consumed_from_entry_ids',
        'admin_id',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'transaction_type' => PointsTransactionType::class,
            'status' => PointsTransactionStatus::class,
            'points' => 'integer',
            'inr_equivalent_minor' => 'integer',
            'running_balance_after' => 'integer',
            'reference_id' => 'integer',
            'expires_at' => 'datetime',
            'points_remaining' => 'integer',
            'consumed_from_entry_ids' => 'array',
        ];
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /**
     * @return BelongsTo<Admin, $this>
     */
    public function admin(): BelongsTo
    {
        return $this->belongsTo(Admin::class, 'admin_id');
    }

    /**
     * @param  Builder<self>  $query
     * @return Builder<self>
     */
    public function scopeAvailableCredits(Builder $query): Builder
    {
        return $query->where('status', PointsTransactionStatus::Available)
            ->where('points_remaining', '>', 0)
            ->where(function (Builder $sub) {
                $sub->whereNull('expires_at')->orWhere('expires_at', '>', now());
            })
            ->orderBy('expires_at', 'asc') // FEFO (First-Expiring-First-Out)
            ->orderBy('created_at', 'asc');
    }

    /**
     * @param  Builder<self>  $query
     * @return Builder<self>
     */
    public function scopeExpiringSoon(Builder $query, int $days = 30): Builder
    {
        return $query->where('status', PointsTransactionStatus::Available)
            ->where('points_remaining', '>', 0)
            ->whereNotNull('expires_at')
            ->where('expires_at', '>', now())
            ->where('expires_at', '<=', now()->addDays($days));
    }
}

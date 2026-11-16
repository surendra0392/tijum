<?php

declare(strict_types=1);

namespace App\Models;

use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property string $version
 * @property string $name
 * @property CarbonImmutable $effective_from
 * @property string $summary
 * @property string $customer_explanation
 * @property array<string, mixed> $cancellation_terms
 * @property bool $is_published
 * @property int|null $published_by_admin_id
 * @property CarbonImmutable $created_at
 * @property CarbonImmutable $updated_at
 * @property-read Admin|null $publishedByAdmin
 */
class CancellationRefundPolicy extends Model
{
    protected $guarded = [];

    /**
     * @return array{
     *     effective_from: 'datetime',
     *     cancellation_terms: 'array',
     *     is_published: 'boolean',
     * }
     */
    protected function casts(): array
    {
        return [
            'effective_from' => 'datetime',
            'cancellation_terms' => 'array',
            'is_published' => 'boolean',
        ];
    }

    /**
     * @return BelongsTo<Admin, $this>
     */
    public function publishedByAdmin(): BelongsTo
    {
        return $this->belongsTo(Admin::class, 'published_by_admin_id');
    }

    /**
     * @return array<string, mixed>
     */
    public function toSnapshotArray(): array
    {
        return [
            'version' => $this->version,
            'name' => $this->name,
            'effective_from' => $this->effective_from->toIso8601String(),
            'summary' => $this->summary,
            'customer_explanation' => $this->customer_explanation,
            'cancellation_terms' => $this->cancellation_terms,
        ];
    }
}

<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\ReviewReportReason;
use App\Enums\ReviewReportStatus;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $property_review_id
 * @property string $reporter_type
 * @property int $reporter_id
 * @property ReviewReportReason $reason_category
 * @property string|null $explanation
 * @property ReviewReportStatus $status
 * @property int|null $assigned_admin_id
 * @property string|null $resolution_reason
 * @property string|null $resolution_notes
 * @property CarbonImmutable|null $resolved_at
 * @property int|null $resolved_by_admin_id
 * @property CarbonImmutable $created_at
 * @property CarbonImmutable $updated_at
 * @property-read PropertyReview $review
 * @property-read Admin|null $assignedAdmin
 * @property-read Admin|null $resolvedByAdmin
 */
class PropertyReviewReport extends Model
{
    protected $guarded = [];

    /**
     * @return array{
     *     reason_category: 'App\\Enums\\ReviewReportReason',
     *     status: 'App\\Enums\\ReviewReportStatus',
     *     resolved_at: 'datetime',
     * }
     */
    protected function casts(): array
    {
        return [
            'reason_category' => ReviewReportReason::class,
            'status' => ReviewReportStatus::class,
            'resolved_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<PropertyReview, $this>
     */
    public function review(): BelongsTo
    {
        return $this->belongsTo(PropertyReview::class, 'property_review_id');
    }

    /**
     * @return BelongsTo<Admin, $this>
     */
    public function assignedAdmin(): BelongsTo
    {
        return $this->belongsTo(Admin::class, 'assigned_admin_id');
    }

    /**
     * @return BelongsTo<Admin, $this>
     */
    public function resolvedByAdmin(): BelongsTo
    {
        return $this->belongsTo(Admin::class, 'resolved_by_admin_id');
    }
}

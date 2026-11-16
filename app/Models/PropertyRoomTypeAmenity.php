<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\AmenityAvailability;
use App\Enums\AmenityVerificationStatus;
use Database\Factories\PropertyRoomTypeAmenityFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;

class PropertyRoomTypeAmenity extends Model
{
    /** @use HasFactory<PropertyRoomTypeAmenityFactory> */
    use HasFactory;

    /**
     * @var list<string>
     */
    protected $guarded = [];

    /**
     * @var list<string>
     */
    protected $hidden = [
        'internal_reviewer_notes',
    ];

    /**
     * @return array{
     *     availability: 'App\\Enums\\AmenityAvailability',
     *     status: 'App\\Enums\\AmenityVerificationStatus',
     *     revision_number: 'integer',
     *     is_current: 'boolean',
     *     is_customer_visible: 'boolean',
     *     declaration_accepted_at: 'datetime',
     *     submitted_at: 'datetime',
     *     under_review_at: 'datetime',
     *     reviewed_at: 'datetime',
     *     approved_at: 'datetime',
     *     approved_snapshot: 'array',
     * }
     */
    protected function casts(): array
    {
        return [
            'availability' => AmenityAvailability::class,
            'status' => AmenityVerificationStatus::class,
            'revision_number' => 'integer',
            'is_current' => 'boolean',
            'is_customer_visible' => 'boolean',
            'declaration_accepted_at' => 'datetime',
            'submitted_at' => 'datetime',
            'under_review_at' => 'datetime',
            'reviewed_at' => 'datetime',
            'approved_at' => 'datetime',
            'approved_snapshot' => 'array',
        ];
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
     * @return BelongsTo<Amenity, $this>
     */
    public function amenity(): BelongsTo
    {
        return $this->belongsTo(Amenity::class);
    }

    /**
     * @return MorphMany<AmenityAssignmentEvent, $this>
     */
    public function events(): MorphMany
    {
        return $this->morphMany(AmenityAssignmentEvent::class, 'assignable')
            ->orderByDesc('created_at')
            ->orderByDesc('id');
    }

    /**
     * @return BelongsTo<self, $this>
     */
    public function parent(): BelongsTo
    {
        return $this->belongsTo(self::class, 'parent_property_room_type_amenity_id');
    }

    /**
     * @return BelongsTo<self, $this>
     */
    public function supersededBy(): BelongsTo
    {
        return $this->belongsTo(self::class, 'superseded_by_property_room_type_amenity_id');
    }

    /**
     * @return HasMany<self, $this>
     */
    public function revisions(): HasMany
    {
        return $this->hasMany(self::class, 'parent_property_room_type_amenity_id')->orderBy('revision_number');
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
    public function reviewedByAdmin(): BelongsTo
    {
        return $this->belongsTo(Admin::class, 'reviewed_by_admin_id');
    }

    public function isApprovedCurrent(): bool
    {
        return $this->status->isActiveOffer() && $this->is_current && $this->superseded_by_property_room_type_amenity_id === null;
    }

    /**
     * @return array<string, mixed>
     */
    public function toSummaryArray(): array
    {
        $this->loadMissing(['amenity.category', 'roomType']);

        return [
            'id' => $this->id,
            'scope' => 'room_type',
            'property_id' => $this->property_id,
            'property_room_type_id' => $this->property_room_type_id,
            'room_type_name' => $this->roomType?->name,
            'amenity_id' => $this->amenity_id,
            'assignment_reference' => $this->assignment_reference,
            'assignment_group_id' => $this->assignment_group_id,
            'availability' => $this->availability->value,
            'availability_label' => $this->availability->label(),
            'status' => $this->status->value,
            'status_label' => $this->status->label(),
            'revision_number' => $this->revision_number,
            'is_current' => $this->is_current,
            'is_customer_visible' => $this->is_customer_visible,
            'is_editable' => $this->status->isEditableByOwner(),
            'can_submit' => $this->status->canSubmitByOwner(),
            'is_approved_current' => $this->isApprovedCurrent(),
            'details' => $this->details,
            'requested_information' => $this->requested_information,
            'decision_reason' => $this->decision_reason,
            'submitted_at' => $this->submitted_at?->toISOString(),
            'under_review_at' => $this->under_review_at?->toISOString(),
            'reviewed_at' => $this->reviewed_at?->toISOString(),
            'approved_at' => $this->approved_at?->toISOString(),
            'amenity' => $this->amenity?->toAdminArray(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function toAdminQueueArray(): array
    {
        $this->loadMissing([
            'amenity.category',
            'roomType:id,name,property_id',
            'property:id,name,property_reference,owner_id,city_id',
            'property.owner:id,name,email,status',
            'property.city:id,name',
            'assignedAdmin:id,name',
        ]);

        $property = $this->property;
        $owner = $property?->owner;
        $city = $property?->city;
        $amenity = $this->amenity;

        return [
            'id' => $this->id,
            'scope' => 'room_type',
            'assignment_reference' => $this->assignment_reference,
            'property_id' => $this->property_id,
            'property_room_type_id' => $this->property_room_type_id,
            'room_type_name' => $this->roomType?->name,
            'property_name' => $property?->name,
            'property_reference' => $property?->property_reference,
            'owner_name' => $owner instanceof Owner ? $owner->name : null,
            'owner_email' => $owner instanceof Owner ? $owner->email : null,
            'city_name' => $city instanceof City ? $city->name : null,
            'amenity_name' => $amenity?->name,
            'amenity_code' => $amenity?->code,
            'category_name' => $amenity?->category?->name,
            'availability' => $this->availability->value,
            'availability_label' => $this->availability->label(),
            'status' => $this->status->value,
            'status_label' => $this->status->label(),
            'revision_number' => $this->revision_number,
            'is_current' => $this->is_current,
            'submitted_at' => $this->submitted_at?->toISOString(),
            'assigned_reviewer_name' => $this->assignedAdmin?->name,
            'reviewed_at' => $this->reviewed_at?->toISOString(),
            'approved_at' => $this->approved_at?->toISOString(),
        ];
    }
}

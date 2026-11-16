<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\AccommodationCategory;
use App\Enums\PropertyGenderPolicy;
use App\Enums\PropertyOperationalStatus;
use Database\Factories\PropertyFactory;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

/**
 * @property-read ?PropertyVerificationApplication $activeVerificationApplication
 * @property-read ?PropertyVerificationApplication $latestVerificationApplication
 * @property-read ?PropertyVerificationApplication $latestApprovedApplication
 */
class Property extends Model
{
    /** @use HasFactory<PropertyFactory> */
    use HasFactory;

    /**
     * Controlled mutations go through explicit transactional actions.
     *
     * @var list<string>
     */
    protected $guarded = [];

    /**
     * @return array{
     *     latitude: 'decimal:7',
     *     longitude: 'decimal:7',
     *     status: 'App\\Enums\\PropertyOperationalStatus',
     *     is_verified: 'boolean',
     *     booking_eligible: 'boolean',
     *     approved_at: 'datetime',
     *     approved_snapshot: 'array',
     *     food_provided: 'boolean',
     *     breakfast_included: 'boolean',
     *     lunch_included: 'boolean',
     *     dinner_included: 'boolean',
     * }
     */
    protected function casts(): array
    {
        return [
            'latitude' => 'decimal:7',
            'longitude' => 'decimal:7',
            'status' => PropertyOperationalStatus::class,
            'is_verified' => 'boolean',
            'booking_eligible' => 'boolean',
            'approved_at' => 'datetime',
            'approved_snapshot' => 'array',
            'food_provided' => 'boolean',
            'breakfast_included' => 'boolean',
            'lunch_included' => 'boolean',
            'dinner_included' => 'boolean',
        ];
    }

    /**
     * Public cover image for the property, sourced from published media.
     */
    public function coverImageUrl(): ?string
    {
        $published = $this->media->filter(
            fn (PropertyMedia $item): bool => $item->isPubliclyPublished(),
        );

        return $published->firstWhere('is_cover', true)?->publicOptimizedUrl()
            ?? $published->first()?->publicOptimizedUrl();
    }

    /**
     * @return BelongsTo<Owner, $this>
     */
    public function owner(): BelongsTo
    {
        return $this->belongsTo(Owner::class);
    }

    /**
     * @return BelongsTo<PropertyCategory, $this>
     */
    public function category(): BelongsTo
    {
        return $this->belongsTo(PropertyCategory::class, 'property_category_id');
    }

    /**
     * @return BelongsTo<City, $this>
     */
    public function city(): BelongsTo
    {
        return $this->belongsTo(City::class);
    }

    /**
     * @return BelongsTo<Admin, $this>
     */
    public function approvedByAdmin(): BelongsTo
    {
        return $this->belongsTo(Admin::class, 'approved_by_admin_id');
    }

    /**
     * @return BelongsTo<PropertyVerificationApplication, $this>
     */
    public function latestApprovedApplication(): BelongsTo
    {
        return $this->belongsTo(PropertyVerificationApplication::class, 'latest_approved_application_id');
    }

    /**
     * @return HasMany<PropertyRoomType, $this>
     */
    public function roomTypes(): HasMany
    {
        return $this->hasMany(PropertyRoomType::class)
            ->orderBy('display_order')
            ->orderBy('id');
    }

    /**
     * @return HasMany<PropertyRoom, $this>
     */
    public function rooms(): HasMany
    {
        return $this->hasMany(PropertyRoom::class)
            ->orderBy('room_number')
            ->orderBy('id');
    }

    /**
     * @return HasMany<PropertyMedia, $this>
     */
    public function media(): HasMany
    {
        return $this->hasMany(PropertyMedia::class)
            ->where('is_archived', false)
            ->orderByDesc('is_cover')
            ->orderBy('sort_order')
            ->orderBy('id');
    }

    /**
     * @return HasMany<Reservation, $this>
     */
    public function reservations(): HasMany
    {
        return $this->hasMany(Reservation::class)
            ->orderByDesc('created_at')
            ->orderByDesc('id');
    }

    /**
     * @return HasMany<PropertyAmenity, $this>
     */
    public function amenityAssignments(): HasMany
    {
        return $this->hasMany(PropertyAmenity::class)
            ->orderByDesc('revision_number')
            ->orderByDesc('id');
    }

    /**
     * @return HasMany<PropertyAmenity, $this>
     */
    public function currentAmenityAssignments(): HasMany
    {
        return $this->hasMany(PropertyAmenity::class)
            ->where('is_current', true)
            ->orderByDesc('id');
    }

    /**
     * @return HasMany<PropertyRoomTypeAmenity, $this>
     */
    public function roomTypeAmenityAssignments(): HasMany
    {
        return $this->hasMany(PropertyRoomTypeAmenity::class)
            ->orderByDesc('revision_number')
            ->orderByDesc('id');
    }

    /**
     * @return HasMany<PropertyAvailabilityBlock, $this>
     */
    public function availabilityBlocks(): HasMany
    {
        return $this->hasMany(PropertyAvailabilityBlock::class)
            ->orderByDesc('start_date')
            ->orderByDesc('id');
    }

    /**
     * @return HasMany<PropertyVerificationApplication, $this>
     */
    public function verificationApplications(): HasMany
    {
        return $this->hasMany(PropertyVerificationApplication::class)
            ->orderByDesc('id');
    }

    /**
     * @return HasOne<PropertyVerificationApplication, $this>
     */
    public function activeVerificationApplication(): HasOne
    {
        return $this->hasOne(PropertyVerificationApplication::class, 'active_property_id', 'id');
    }

    /**
     * @return HasOne<PropertyVerificationApplication, $this>
     */
    public function latestVerificationApplication(): HasOne
    {
        return $this->hasOne(PropertyVerificationApplication::class)
            ->latestOfMany('id');
    }

    /**
     * @return HasMany<PropertyVerificationEvent, $this>
     */
    public function verificationEvents(): HasMany
    {
        return $this->hasMany(PropertyVerificationEvent::class)
            ->orderByDesc('created_at')
            ->orderByDesc('id');
    }

    /**
     * @return HasMany<PropertyReview, $this>
     */
    public function reviews(): HasMany
    {
        return $this->hasMany(PropertyReview::class);
    }

    /**
     * @return HasOne<PropertyRatingSummary, $this>
     */
    public function ratingSummary(): HasOne
    {
        return $this->hasOne(PropertyRatingSummary::class);
    }

    /**
     * Build a canonical immutable snapshot of the approved property attributes.
     *
     * @return array<string, mixed>
     */
    public function toApprovedPropertyFieldsSnapshot(): array
    {
        $this->loadMissing(['category', 'city']);

        return [
            'property_category_id' => $this->property_category_id,
            'category_name' => $this->category?->name,
            'city_id' => $this->city_id,
            'city_name' => $this->city?->name,
            'name' => $this->name,
            'description' => $this->description,
            'contact_person_name' => $this->contact_person_name,
            'contact_phone' => $this->contact_phone,
            'contact_email' => $this->contact_email,
            'address_line_1' => $this->address_line_1,
            'address_line_2' => $this->address_line_2,
            'locality' => $this->locality,
            'landmark' => $this->landmark,
            'postal_code' => $this->postal_code,
            'state' => $this->state,
            'country_code' => $this->country_code,
            'latitude' => $this->latitude !== null ? (string) $this->latitude : null,
            'longitude' => $this->longitude !== null ? (string) $this->longitude : null,
            'food_provided' => (bool) $this->food_provided,
            'breakfast_included' => (bool) $this->breakfast_included,
            'lunch_included' => (bool) $this->lunch_included,
            'dinner_included' => (bool) $this->dinner_included,
        ];
    }

    /**
     * Merge staged amendment values for the currently edited revision without overwriting approved fields.
     *
     * @return array<string, mixed>
     */
    public function effectiveFieldsForRevision(?PropertyVerificationApplication $application = null): array
    {
        $approved = $this->toApprovedPropertyFieldsSnapshot();

        if (
            $application instanceof PropertyVerificationApplication
            && $application->is_amendment
            && is_array($application->proposed_property_data)
            && $application->proposed_property_data !== []
        ) {
            return [
                ...$approved,
                ...$application->proposed_property_data,
            ];
        }

        return $approved;
    }

    public function hasApprovedBaseline(): bool
    {
        return $this->is_verified && $this->latest_approved_application_id !== null;
    }

    public function canEditDirectlyWithoutAmendment(?PropertyVerificationApplication $application = null): bool
    {
        if (! $this->hasApprovedBaseline()) {
            if ($application instanceof PropertyVerificationApplication) {
                return $application->status->isEditableByOwner();
            }

            return true;
        }

        if (
            $application instanceof PropertyVerificationApplication
            && $application->is_amendment
            && $application->status->isEditableByOwner()
        ) {
            return true;
        }

        return false;
    }

    /**
     * @return array<string, bool>
     */
    public function foodSummary(): array
    {
        $provided = (bool) $this->food_provided;

        return [
            'food_provided' => $provided,
            'breakfast_included' => $provided && (bool) $this->breakfast_included,
            'lunch_included' => $provided && (bool) $this->lunch_included,
            'dinner_included' => $provided && (bool) $this->dinner_included,
        ];
    }

    public function accommodationCategory(): ?AccommodationCategory
    {
        return $this->category?->accommodationCategory();
    }

    public function getGenderEligibilityAttribute(): string
    {
        $policies = $this->roomTypes
            ->map(static fn ($r): string => $r->gender_policy instanceof PropertyGenderPolicy ? $r->gender_policy->value : (string) $r->gender_policy)
            ->unique()
            ->filter()
            ->values();

        if ($policies->count() === 1) {
            return match ($policies->first()) {
                'male_only' => 'Male Only',
                'female_only' => 'Female Only',
                default => 'Both',
            };
        }

        return 'Both';
    }

    public function isHostelsPg(): bool
    {
        return $this->category?->isHostelsPg()
            ?? ($this->accommodationCategory() === AccommodationCategory::HostelsPg);
    }

    public function isHomestay(): bool
    {
        return $this->category?->isHomestays()
            ?? ($this->accommodationCategory() === AccommodationCategory::Homestays);
    }

    public function isCoLiving(): bool
    {
        return $this->category?->isCoLiving()
            ?? ($this->accommodationCategory() === AccommodationCategory::CoLiving);
    }

    /**
     * @param  Builder<self>  $query
     * @return Builder<self>
     */
    #[Scope]
    protected function hostelsPg(Builder $query): Builder
    {
        return $query->whereHas('category', static fn (Builder $q) => $q->where('slug', PropertyCategory::SLUG_HOSTELS_PG));
    }

    /**
     * @param  Builder<self>  $query
     * @return Builder<self>
     */
    #[Scope]
    protected function homestays(Builder $query): Builder
    {
        return $query->whereHas('category', static fn (Builder $q) => $q->where('slug', PropertyCategory::SLUG_HOMESTAYS));
    }

    /**
     * @param  Builder<self>  $query
     * @return Builder<self>
     */
    #[Scope]
    protected function coLiving(Builder $query): Builder
    {
        return $query->whereHas('category', static fn (Builder $q) => $q->where('slug', PropertyCategory::SLUG_CO_LIVING));
    }

    /**
     * @param  Builder<self>  $query
     * @return Builder<self>
     */
    #[Scope]
    protected function ofCategory(Builder $query, string|int|AccommodationCategory $category): Builder
    {
        if ($category instanceof AccommodationCategory) {
            $category = $category->value;
        }

        if (is_numeric($category)) {
            return $query->where('property_category_id', (int) $category);
        }

        return $query->whereHas('category', static function (Builder $q) use ($category): void {
            $q->where('slug', (string) $category)
                ->orWhere('code', (string) $category);
        });
    }
}

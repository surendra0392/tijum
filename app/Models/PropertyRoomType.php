<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\PropertyGenderPolicy;
use App\Enums\PropertyGuestComposition;
use App\Enums\PropertyRoomStatus;
use App\Enums\PropertyRoomTypeMode;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PropertyRoomType extends Model
{
    /**
     * Room-type attributes are mutated via controlled domain actions.
     *
     * @var list<string>
     */
    protected $guarded = [];

    /**
     * @return array{
     *     accommodation_mode: 'App\\Enums\\PropertyRoomTypeMode',
     *     sharing_capacity: 'integer',
     *     max_guests_per_room: 'integer',
     *     is_air_conditioned: 'boolean',
     *     gender_policy: 'App\\Enums\\PropertyGenderPolicy',
     *     guest_composition_policy: 'array',
     *     early_check_in_enabled: 'boolean',
     *     is_active: 'boolean',
     *     is_approved_version: 'boolean',
     *     pending_amendment_data: 'array',
     *     display_order: 'integer',
     *     daily_rate_minor: 'integer',
     *     weekly_rate_minor: 'integer',
     *     monthly_rate_minor: 'integer',
     * }
     */
    protected function casts(): array
    {
        return [
            'accommodation_mode' => PropertyRoomTypeMode::class,
            'sharing_capacity' => 'integer',
            'max_guests_per_room' => 'integer',
            'is_air_conditioned' => 'boolean',
            'gender_policy' => PropertyGenderPolicy::class,
            'guest_composition_policy' => 'array',
            'early_check_in_enabled' => 'boolean',
            'is_active' => 'boolean',
            'is_approved_version' => 'boolean',
            'pending_amendment_data' => 'array',
            'display_order' => 'integer',
            'daily_rate_minor' => 'integer',
            'weekly_rate_minor' => 'integer',
            'monthly_rate_minor' => 'integer',
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
     * @return BelongsTo<PropertyVerificationApplication, $this>
     */
    public function amendmentApplication(): BelongsTo
    {
        return $this->belongsTo(PropertyVerificationApplication::class, 'amendment_application_id');
    }

    /**
     * @return HasMany<PropertyRoom, $this>
     */
    public function rooms(): HasMany
    {
        return $this->hasMany(PropertyRoom::class, 'property_room_type_id')
            ->orderBy('room_number')
            ->orderBy('id');
    }

    /**
     * @return HasMany<PropertyRoomTypeAmenity, $this>
     */
    public function amenityAssignments(): HasMany
    {
        return $this->hasMany(PropertyRoomTypeAmenity::class, 'property_room_type_id')
            ->orderByDesc('revision_number')
            ->orderByDesc('id');
    }

    /**
     * @return HasMany<PropertyRoomTypeAmenity, $this>
     */
    public function currentAmenityAssignments(): HasMany
    {
        return $this->hasMany(PropertyRoomTypeAmenity::class)
            ->where('is_current', true)
            ->orderByDesc('id');
    }

    /**
     * @return HasMany<PropertyAvailabilityBlock, $this>
     */
    public function availabilityBlocks(): HasMany
    {
        return $this->hasMany(PropertyAvailabilityBlock::class, 'property_room_type_id')
            ->orderByDesc('start_date')
            ->orderByDesc('id');
    }

    /**
     * @return HasMany<PropertyMedia, $this>
     */
    public function media(): HasMany
    {
        return $this->hasMany(PropertyMedia::class, 'property_room_type_id')
            ->where('is_archived', false)
            ->orderBy('sort_order')
            ->orderBy('id');
    }

    /**
     * @return HasMany<Reservation, $this>
     */
    public function reservations(): HasMany
    {
        return $this->hasMany(Reservation::class, 'property_room_type_id')
            ->orderByDesc('created_at')
            ->orderByDesc('id');
    }

    /**
     * @return list<string>
     */
    public function guestCompositionValues(): array
    {
        $policy = $this->guest_composition_policy;

        return array_values(array_filter(
            $policy,
            static fn (mixed $value): bool => is_string($value) && PropertyGuestComposition::tryFrom($value) !== null,
        ));
    }

    /**
     * @return list<string>
     */
    public function guestCompositionLabels(): array
    {
        return array_map(
            static fn (string $value): string => PropertyGuestComposition::from($value)->label(),
            $this->guestCompositionValues(),
        );
    }

    /**
     * Merge pending amendment fields without altering committed approved baseline columns.
     *
     * @return array<string, mixed>
     */
    public function effectiveAttributes(?PropertyVerificationApplication $application = null): array
    {
        $pending = (
            $application instanceof PropertyVerificationApplication
            && $application->is_amendment
            && $this->pending_changes_application_id === $application->id
            && is_array($this->pending_amendment_data)
        ) ? $this->pending_amendment_data : [];

        return [
            'name' => $pending['name'] ?? $this->name,
            'accommodation_mode' => $pending['accommodation_mode'] ?? $this->accommodation_mode->value,
            'sharing_capacity' => array_key_exists('sharing_capacity', $pending)
                ? $pending['sharing_capacity']
                : $this->sharing_capacity,
            'max_guests_per_room' => $pending['max_guests_per_room'] ?? $this->max_guests_per_room,
            'is_air_conditioned' => array_key_exists('is_air_conditioned', $pending)
                ? (bool) $pending['is_air_conditioned']
                : $this->is_air_conditioned,
            'gender_policy' => $pending['gender_policy'] ?? $this->gender_policy->value,
            'guest_composition_policy' => $pending['guest_composition_policy'] ?? $this->guestCompositionValues(),
            'early_check_in_enabled' => array_key_exists('early_check_in_enabled', $pending)
                ? (bool) $pending['early_check_in_enabled']
                : $this->early_check_in_enabled,
            'description' => array_key_exists('description', $pending)
                ? $pending['description']
                : $this->description,
            'is_active' => array_key_exists('is_active', $pending)
                ? (bool) $pending['is_active']
                : $this->is_active,
            'display_order' => $pending['display_order'] ?? $this->display_order,
            'daily_rate_minor' => array_key_exists('daily_rate_minor', $pending)
                ? $pending['daily_rate_minor']
                : $this->daily_rate_minor,
            'weekly_rate_minor' => array_key_exists('weekly_rate_minor', $pending)
                ? $pending['weekly_rate_minor']
                : $this->weekly_rate_minor,
            'monthly_rate_minor' => array_key_exists('monthly_rate_minor', $pending)
                ? $pending['monthly_rate_minor']
                : $this->monthly_rate_minor,
        ];
    }

    public function pricingBasis(): string
    {
        return $this->accommodation_mode === PropertyRoomTypeMode::Shared ? 'per_guest' : 'per_room';
    }

    /**
     * @return array{daily: bool, weekly: bool, monthly: bool}
     */
    public function configuredRateFlags(): array
    {
        return [
            'daily' => $this->daily_rate_minor !== null && $this->daily_rate_minor > 0,
            'weekly' => $this->weekly_rate_minor !== null && $this->weekly_rate_minor > 0,
            'monthly' => $this->monthly_rate_minor !== null && $this->monthly_rate_minor > 0,
        ];
    }

    public function hasAnyDirectRate(): bool
    {
        $flags = $this->configuredRateFlags();

        return $flags['daily'] || $flags['weekly'] || $flags['monthly'];
    }

    /**
     * @return array<string, mixed>
     */
    public function toPortalArray(?PropertyVerificationApplication $application = null): array
    {
        $effective = $this->effectiveAttributes($application);
        $mode = PropertyRoomTypeMode::from((string) $effective['accommodation_mode']);
        $genderPolicy = PropertyGenderPolicy::from((string) $effective['gender_policy']);
        $composition = is_array($effective['guest_composition_policy'])
            ? array_values(array_filter($effective['guest_composition_policy'], 'is_string'))
            : [];
        $compositionLabels = array_map(
            static fn (string $value): string => PropertyGuestComposition::from($value)->label(),
            $composition,
        );

        $roomsCollection = $this->relationLoaded('rooms') ? $this->rooms : null;
        $roomsCount = $roomsCollection !== null ? $roomsCollection->count() : (int) ($this->rooms_count ?? $this->rooms()->count());
        $activeRoomsCount = $roomsCollection !== null
            ? $roomsCollection->where('operational_status', PropertyRoomStatus::Active)->count()
            : $this->rooms()->where('operational_status', PropertyRoomStatus::Active->value)->count();
        $maxGuests = (int) $effective['max_guests_per_room'];

        $roomPhotosCount = $this->relationLoaded('media')
            ? $this->media->where('moderation_status', '!=', 'rejected')->count()
            : (int) ($this->media_count ?? $this->media()->where('moderation_status', '!=', 'rejected')->count());

        $daily = $effective['daily_rate_minor'] ?? null;
        $weekly = $effective['weekly_rate_minor'] ?? null;
        $monthly = $effective['monthly_rate_minor'] ?? null;

        return [
            'id' => $this->id,
            'property_id' => $this->property_id,
            'name' => (string) $effective['name'],
            'slug' => $this->slug,
            'accommodation_mode' => $mode->value,
            'accommodation_mode_label' => $mode->label(),
            'sharing_capacity' => $effective['sharing_capacity'] !== null ? (int) $effective['sharing_capacity'] : null,
            'max_guests_per_room' => $maxGuests,
            'is_air_conditioned' => (bool) $effective['is_air_conditioned'],
            'gender_policy' => $genderPolicy->value,
            'gender_policy_label' => $genderPolicy->label(),
            'guest_composition_policy' => $composition,
            'guest_composition_labels' => $compositionLabels,
            'early_check_in_enabled' => (bool) $effective['early_check_in_enabled'],
            'description' => $effective['description'],
            'is_active' => (bool) $effective['is_active'],
            'is_approved_version' => $this->is_approved_version,
            'has_pending_amendment' => $this->pending_changes_application_id !== null
                || $this->amendment_application_id !== null,
            'display_order' => (int) $effective['display_order'],
            'rooms_count' => $roomsCount,
            'active_rooms_count' => $activeRoomsCount,
            'total_active_capacity' => $maxGuests * $activeRoomsCount,
            'room_photos_count' => $roomPhotosCount,
            'pricing_basis' => $mode === PropertyRoomTypeMode::Shared ? 'per_guest' : 'per_room',
            'daily_rate_minor' => $daily !== null ? (int) $daily : null,
            'weekly_rate_minor' => $weekly !== null ? (int) $weekly : null,
            'monthly_rate_minor' => $monthly !== null ? (int) $monthly : null,
            'has_daily_rate' => $daily !== null && (int) $daily > 0,
            'has_weekly_rate' => $weekly !== null && (int) $weekly > 0,
            'has_monthly_rate' => $monthly !== null && (int) $monthly > 0,
            'has_any_direct_rate' => ($daily !== null && (int) $daily > 0)
                || ($weekly !== null && (int) $weekly > 0)
                || ($monthly !== null && (int) $monthly > 0),
            'currency_code' => (string) config('tijum.pricing.currency_code', 'INR'),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}

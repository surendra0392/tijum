<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\AmenityApplicabilityScope;
use Database\Factories\AmenityFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Amenity extends Model
{
    /** @use HasFactory<AmenityFactory> */
    use HasFactory;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'amenity_category_id',
        'code',
        'name',
        'slug',
        'description',
        'applicability_scope',
        'icon_key',
        'is_customer_visible',
        'requires_review',
        'display_order',
        'is_active',
    ];

    /**
     * @return array{
     *     applicability_scope: 'App\\Enums\\AmenityApplicabilityScope',
     *     is_customer_visible: 'boolean',
     *     requires_review: 'boolean',
     *     display_order: 'integer',
     *     is_active: 'boolean',
     * }
     */
    protected function casts(): array
    {
        return [
            'applicability_scope' => AmenityApplicabilityScope::class,
            'is_customer_visible' => 'boolean',
            'requires_review' => 'boolean',
            'display_order' => 'integer',
            'is_active' => 'boolean',
        ];
    }

    /**
     * @return BelongsTo<AmenityCategory, $this>
     */
    public function category(): BelongsTo
    {
        return $this->belongsTo(AmenityCategory::class, 'amenity_category_id');
    }

    /**
     * @return HasMany<PropertyAmenity, $this>
     */
    public function propertyAssignments(): HasMany
    {
        return $this->hasMany(PropertyAmenity::class);
    }

    /**
     * @return HasMany<PropertyRoomTypeAmenity, $this>
     */
    public function roomTypeAssignments(): HasMany
    {
        return $this->hasMany(PropertyRoomTypeAmenity::class);
    }

    /**
     * @param  Builder<self>  $query
     * @return Builder<self>
     */
    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }

    /**
     * @param  Builder<self>  $query
     * @return Builder<self>
     */
    public function scopeOrdered(Builder $query): Builder
    {
        return $query->orderBy('display_order')->orderBy('name');
    }

    public function isReferencedOrHistorical(): bool
    {
        return $this->propertyAssignments()->exists() || $this->roomTypeAssignments()->exists();
    }

    /**
     * @return array<string, mixed>
     */
    public function toAdminArray(): array
    {
        $this->loadMissing('category');

        return [
            'id' => $this->id,
            'amenity_category_id' => $this->amenity_category_id,
            'category' => $this->category?->toOptionArray(),
            'code' => $this->code,
            'name' => $this->name,
            'slug' => $this->slug,
            'description' => $this->description,
            'applicability_scope' => $this->applicability_scope->value,
            'applicability_scope_label' => $this->applicability_scope->label(),
            'applies_to_property' => $this->applicability_scope->appliesToProperty(),
            'applies_to_room_type' => $this->applicability_scope->appliesToRoomType(),
            'icon_key' => $this->icon_key,
            'is_customer_visible' => $this->is_customer_visible,
            'requires_review' => $this->requires_review,
            'display_order' => $this->display_order,
            'is_active' => $this->is_active,
        ];
    }
}

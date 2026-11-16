<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\AccommodationCategory;
use Database\Factories\PropertyCategoryFactory;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PropertyCategory extends Model
{
    /** @use HasFactory<PropertyCategoryFactory> */
    use HasFactory;

    public const string SLUG_HOSTELS_PG = 'hostels-pg';

    public const string SLUG_HOMESTAYS = 'homestays';

    public const string SLUG_CO_LIVING = 'co-living';

    /**
     * @var list<string>
     */
    public const array CANONICAL_SLUGS = [
        self::SLUG_HOSTELS_PG,
        self::SLUG_HOMESTAYS,
        self::SLUG_CO_LIVING,
    ];

    /**
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'slug',
        'code',
        'description',
        'is_active',
        'sort_order',
    ];

    /**
     * @return array{
     *     is_active: 'boolean',
     *     sort_order: 'integer',
     * }
     */
    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'sort_order' => 'integer',
        ];
    }

    /**
     * @return HasMany<Property, $this>
     */
    public function properties(): HasMany
    {
        return $this->hasMany(Property::class);
    }

    /**
     * @param  Builder<self>  $query
     * @return Builder<self>
     */
    #[Scope]
    protected function active(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }

    /**
     * @param  Builder<self>  $query
     * @return Builder<self>
     */
    #[Scope]
    protected function ordered(Builder $query): Builder
    {
        return $query->orderBy('sort_order')->orderBy('name');
    }

    /**
     * @param  Builder<self>  $query
     * @return Builder<self>
     */
    #[Scope]
    protected function canonical(Builder $query): Builder
    {
        return $query->whereIn('slug', self::CANONICAL_SLUGS);
    }

    /**
     * @param  Builder<self>  $query
     * @return Builder<self>
     */
    #[Scope]
    protected function hostelsPg(Builder $query): Builder
    {
        return $query->where('slug', self::SLUG_HOSTELS_PG);
    }

    /**
     * @param  Builder<self>  $query
     * @return Builder<self>
     */
    #[Scope]
    protected function homestays(Builder $query): Builder
    {
        return $query->where('slug', self::SLUG_HOMESTAYS);
    }

    /**
     * @param  Builder<self>  $query
     * @return Builder<self>
     */
    #[Scope]
    protected function coLiving(Builder $query): Builder
    {
        return $query->where('slug', self::SLUG_CO_LIVING);
    }

    public function accommodationCategory(): ?AccommodationCategory
    {
        return AccommodationCategory::tryFromLegacy($this->slug)
            ?? AccommodationCategory::tryFromLegacy($this->code);
    }

    public function isHostelsPg(): bool
    {
        return $this->slug === self::SLUG_HOSTELS_PG;
    }

    public function isHomestays(): bool
    {
        return $this->slug === self::SLUG_HOMESTAYS;
    }

    public function isCoLiving(): bool
    {
        return $this->slug === self::SLUG_CO_LIVING;
    }

    /**
     * @return array{
     *     id: int,
     *     name: string,
     *     slug: string,
     *     code: string,
     *     description: string|null,
     *     is_active: bool,
     *     sort_order: int,
     * }
     */
    public function toOptionArray(): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'slug' => $this->slug,
            'code' => $this->code,
            'description' => $this->description,
            'is_active' => $this->is_active,
            'sort_order' => (int) $this->sort_order,
        ];
    }
}

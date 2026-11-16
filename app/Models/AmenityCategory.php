<?php

declare(strict_types=1);

namespace App\Models;

use Database\Factories\AmenityCategoryFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AmenityCategory extends Model
{
    /** @use HasFactory<AmenityCategoryFactory> */
    use HasFactory;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'code',
        'name',
        'slug',
        'description',
        'display_order',
        'is_active',
    ];

    /**
     * @return array{
     *     display_order: 'integer',
     *     is_active: 'boolean',
     * }
     */
    protected function casts(): array
    {
        return [
            'display_order' => 'integer',
            'is_active' => 'boolean',
        ];
    }

    /**
     * @return HasMany<Amenity, $this>
     */
    public function amenities(): HasMany
    {
        return $this->hasMany(Amenity::class)->orderBy('display_order')->orderBy('name');
    }

    /**
     * @return HasMany<Amenity, $this>
     */
    public function activeAmenities(): HasMany
    {
        return $this->hasMany(Amenity::class)->where('is_active', true)->orderBy('display_order')->orderBy('name');
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

    /**
     * @return array{id: int, code: string, name: string, slug: string, description: ?string, display_order: int, is_active: bool}
     */
    public function toOptionArray(): array
    {
        return [
            'id' => $this->id,
            'code' => $this->code,
            'name' => $this->name,
            'slug' => $this->slug,
            'description' => $this->description,
            'display_order' => $this->display_order,
            'is_active' => $this->is_active,
        ];
    }
}

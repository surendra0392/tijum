<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\Pivot;

class City extends Model
{
    /**
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'slug',
        'state',
        'state_code',
        'country_code',
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
     * @return BelongsToMany<Owner, $this, Pivot>
     */
    public function owners(): BelongsToMany
    {
        return $this->belongsToMany(Owner::class, 'owner_operating_cities')->withTimestamps();
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
     * @return array{
     *     id: int,
     *     name: string,
     *     slug: string,
     *     state: string,
     *     state_code: string|null,
     *     country_code: string,
     *     is_active: bool,
     * }
     */
    public function toSelectorArray(): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'slug' => $this->slug,
            'state' => $this->state,
            'state_code' => $this->state_code,
            'country_code' => $this->country_code,
            'is_active' => $this->is_active,
        ];
    }
}

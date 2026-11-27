<?php

declare(strict_types=1);

namespace App\Http\Resources\Api\V1;

use App\Models\City;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin City
 */
class CityResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'slug' => $this->slug,
            'state' => $this->state,
            'is_active' => (bool) $this->is_active,
            'property_count' => $this->whenCounted('properties', $this->properties_count, 0),
            'discovery_url' => url("/stays-in-{$this->slug}"),
        ];
    }
}

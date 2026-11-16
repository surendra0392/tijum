<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\OwnerEntityType;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OwnerBusinessProfile extends Model
{
    /**
     * Attributes populated strictly by validated owner input; owner_id is assigned explicitly.
     *
     * @var list<string>
     */
    protected $fillable = [
        'entity_type',
        'legal_business_name',
        'display_business_name',
        'primary_contact_name',
        'primary_contact_designation',
        'business_email',
        'business_address_line_1',
        'business_address_line_2',
        'locality',
        'postal_code',
        'city',
        'state',
        'country_code',
        'website_url',
        'description',
    ];

    /**
     * @return array{
     *     entity_type: 'App\\Enums\\OwnerEntityType',
     * }
     */
    protected function casts(): array
    {
        return [
            'entity_type' => OwnerEntityType::class,
        ];
    }

    /**
     * @return BelongsTo<Owner, $this>
     */
    public function owner(): BelongsTo
    {
        return $this->belongsTo(Owner::class);
    }

    public function isComplete(): bool
    {
        if (
            blank($this->display_business_name)
            || blank($this->primary_contact_name)
            || blank($this->business_address_line_1)
            || blank($this->city)
            || blank($this->state)
            || blank($this->country_code)
        ) {
            return false;
        }

        if ($this->entity_type->requiresLegalBusinessName() && blank($this->legal_business_name)) {
            return false;
        }

        return true;
    }

    /**
     * @return array{
     *     id: int,
     *     entity_type: string,
     *     entity_type_label: string,
     *     legal_business_name: string|null,
     *     display_business_name: string,
     *     primary_contact_name: string,
     *     primary_contact_designation: string|null,
     *     business_email: string|null,
     *     business_address_line_1: string,
     *     business_address_line_2: string|null,
     *     locality: string|null,
     *     postal_code: string|null,
     *     city: string,
     *     state: string,
     *     country_code: string,
     *     website_url: string|null,
     *     description: string|null,
     *     is_complete: bool,
     *     updated_at: string|null,
     * }
     */
    public function toPortalArray(): array
    {
        return [
            'id' => $this->id,
            'entity_type' => $this->entity_type->value,
            'entity_type_label' => $this->entity_type->label(),
            'legal_business_name' => $this->legal_business_name,
            'display_business_name' => $this->display_business_name,
            'primary_contact_name' => $this->primary_contact_name,
            'primary_contact_designation' => $this->primary_contact_designation,
            'business_email' => $this->business_email,
            'business_address_line_1' => $this->business_address_line_1,
            'business_address_line_2' => $this->business_address_line_2,
            'locality' => $this->locality,
            'postal_code' => $this->postal_code,
            'city' => $this->city,
            'state' => $this->state,
            'country_code' => $this->country_code,
            'website_url' => $this->website_url,
            'description' => $this->description,
            'is_complete' => $this->isComplete(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}

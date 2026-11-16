<?php

declare(strict_types=1);

namespace App\Http\Resources\Api\V1;

use App\Models\Owner;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Owner
 */
class OwnerProfileResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'phone' => $this->phone,
            'status' => $this->status->value,
            'status_label' => $this->status->label(),
            'is_verified' => $this->hasVerifiedEmail(),
            'can_sign_in' => $this->canSignIn(),
            'account_type' => 'partner',
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}

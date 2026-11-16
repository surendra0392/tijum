<?php

declare(strict_types=1);

namespace App\Http\Requests\Reservations;

use App\Enums\PropertyGuestComposition;
use App\Models\Property;
use App\Models\PropertyRoomType;
use App\Models\User;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreReservationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() instanceof User;
    }

    /**
     * @return array<string, list<mixed>>
     */
    public function rules(): array
    {
        $isBookingForOther = $this->input('booking_for') === 'other';

        return [
            'submission_token' => ['required', 'uuid'],
            'property_id' => ['required', 'integer', Rule::exists(Property::class, 'id')],
            'property_room_type_id' => ['required', 'integer', Rule::exists(PropertyRoomType::class, 'id')->where('property_id', $this->input('property_id'))],
            'check_in_date' => ['required', 'date', 'after_or_equal:today'],
            'duration_type' => ['required', Rule::in(['daily', 'weekly', 'monthly'])],
            'duration_quantity' => ['required', 'integer', 'min:1', 'max:30'],
            'quantity' => ['required', 'integer', 'min:1', 'max:100'],
            'guest_count' => ['required', 'integer', 'min:1', 'max:100', 'same:quantity'],
            'guest_gender' => ['required', Rule::in(['male', 'female', 'mixed'])],
            'guest_composition' => ['required', Rule::enum(PropertyGuestComposition::class)],
            'booking_for' => ['nullable', Rule::in(['self', 'other'])],
            'contact_name' => ['required', 'string', 'min:2', 'max:100'],
            'contact_email' => ['required', 'email', 'max:150'],
            'contact_phone' => $isBookingForOther
                ? ['required', 'string', 'regex:/^[6-9]\d{9}$/']
                : ['required', 'string', 'max:50'],
            'early_check_in_requested' => ['sometimes', 'boolean'],
            'requested_arrival_time' => ['exclude_unless:early_check_in_requested,true', 'required', 'date_format:H:i'],
            'coupon_code' => ['nullable', 'string', 'max:50'],
            'points_to_redeem' => ['nullable', 'integer', 'min:0'],
        ];
    }

    protected function prepareForValidation(): void
    {
        if ($this->input('booking_for') === 'self' && $this->user() instanceof User) {
            $user = $this->user();
            $this->merge([
                'contact_name' => $user->name,
                'contact_email' => $user->email,
                'contact_phone' => $user->phone ?: '9876543210',
            ]);
        } elseif ($this->input('booking_for') === 'other' && $this->has('contact_phone')) {
            $digits = preg_replace('/\D+/', '', (string) $this->input('contact_phone')) ?? '';
            $this->merge([
                'contact_phone' => $digits,
            ]);
        }
    }

    protected function withValidator(Validator $validator): void
    {
        $validator->after(function ($validator): void {
            if ((int) $this->input('guest_count') !== (int) $this->input('quantity')) {
                $validator->errors()->add('guest_count', 'Guest count must equal the quantity.');
            }
        });
    }
}

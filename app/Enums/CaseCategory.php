<?php

declare(strict_types=1);

namespace App\Enums;

enum CaseCategory: string
{
    case OwnerCancelled = 'owner_cancelled';
    case PropertyUnavailable = 'property_unavailable';
    case PropertyMismatch = 'property_mismatch';
    case RoomMismatch = 'room_mismatch';
    case FoodNotProvided = 'food_not_provided';
    case BookingProblem = 'booking_problem';
    case PaymentProblem = 'payment_problem';
    case RefundRequest = 'refund_request';
    case SafetyConcern = 'safety_concern';
    case CustomerOther = 'customer_other';

    public function label(): string
    {
        return match ($this) {
            self::OwnerCancelled => 'Host/Owner Cancelled Stay',
            self::PropertyUnavailable => 'Property Unavailable Upon Arrival',
            self::PropertyMismatch => 'Property Differs from Description',
            self::RoomMismatch => 'Room Category or AC/Non-AC Mismatch',
            self::FoodNotProvided => 'Promised Meal Inclusions Not Provided',
            self::BookingProblem => 'Stay Booking Issue',
            self::PaymentProblem => 'Payment or Transaction Problem',
            self::RefundRequest => 'Cancellation & Refund Request',
            self::SafetyConcern => 'Safety or Urgent Habitation Concern',
            self::CustomerOther => 'General Stay Issue',
        };
    }

    public function isSafetyUrgent(): bool
    {
        return $this === self::SafetyConcern;
    }

    /**
     * @return list<string>
     */
    public static function values(): array
    {
        return array_map(static fn (self $case): string => $case->value, self::cases());
    }
}

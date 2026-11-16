<?php

declare(strict_types=1);

namespace App\Policies;

use App\Enums\ReservationStatus;
use App\Models\Admin;
use App\Models\Owner;
use App\Models\Property;
use App\Models\PropertyRoomType;
use App\Models\Reservation;
use App\Models\User;

class ReservationPolicy
{
    public function viewByUser(User $user, Reservation $reservation): bool
    {
        return $reservation->user_id === $user->id;
    }

    public function createByUser(User $user, Property $property, PropertyRoomType $roomType): bool
    {
        return $roomType->property_id === $property->id;
    }

    public function cancelByUser(User $user, Reservation $reservation): bool
    {
        return $reservation->user_id === $user->id
            && $reservation->status->canBeCancelled();
    }

    public function payByUser(User $user, Reservation $reservation): bool
    {
        return $reservation->user_id === $user->id
            && $reservation->status === ReservationStatus::AwaitingPayment
            && ($reservation->payment_deadline_at === null || $reservation->payment_deadline_at->isFuture());
    }

    public function receiptByUser(User $user, Reservation $reservation): bool
    {
        return $reservation->user_id === $user->id
            && $reservation->status === ReservationStatus::Confirmed;
    }

    public function viewByOwner(Owner $owner, Reservation $reservation): bool
    {
        return $this->propertyBelongsToOwner($owner, $reservation->property_id);
    }

    public function cancelByOwner(Owner $owner, Reservation $reservation): bool
    {
        return $this->viewByOwner($owner, $reservation)
            && in_array($reservation->status, [ReservationStatus::AwaitingPayment, ReservationStatus::Confirmed], true);
    }

    public function allocateByOwner(Owner $owner, Reservation $reservation): bool
    {
        return $this->viewByOwner($owner, $reservation)
            && $reservation->status === ReservationStatus::Confirmed;
    }

    public function viewAnyByAdmin(Admin $admin): bool
    {
        return $admin->isActive()
            && ($admin->hasPermission('bookings.view') || $admin->hasPermission('bookings.manage'));
    }

    public function viewByAdmin(Admin $admin, Reservation $reservation): bool
    {
        return $this->viewAnyByAdmin($admin);
    }

    public function refundByAdmin(Admin $admin, Reservation $reservation): bool
    {
        return $admin->isActive()
            && $admin->hasPermission('bookings.manage');
    }

    private function propertyBelongsToOwner(Owner $owner, int $propertyId): bool
    {
        return $owner->id === (int) Property::query()->whereKey($propertyId)->value('owner_id');
    }
}

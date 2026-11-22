<?php

declare(strict_types=1);

namespace Tests\Support;

use App\Enums\ConsentAction;
use App\Enums\ConsentStatus;
use App\Enums\NotificationCategory;
use App\Enums\NotificationChannel;
use App\Models\Admin;
use App\Models\Owner;
use App\Models\User;
use App\Services\Notifications\NotificationPreferenceService;
use Illuminate\Database\Eloquent\Model;

trait NotificationTestHelpers
{
    use ReservationTestHelpers;

    protected function createCustomer(string $phone = '+919876543210'): User
    {
        return User::factory()->create([
            'phone' => $phone,
            'phone_verified_at' => now(),
        ]);
    }

    protected function createPartner(string $phone = '+919876543211'): Owner
    {
        return Owner::factory()->active()->create([
            'phone' => $phone,
        ]);
    }

    protected function createAdminUser(string $role = 'super_admin'): Admin
    {
        return Admin::factory()->withTwoFactor()->create([
            'role' => $role,
            'is_active' => true,
        ]);
    }

    protected function optInWhatsApp(Model $recipient): void
    {
        app(NotificationPreferenceService::class)->recordConsent(
            recipient: $recipient,
            channel: NotificationChannel::WhatsApp,
            category: NotificationCategory::OperationalUpdate,
            status: ConsentStatus::OptedIn,
            action: ConsentAction::Granted,
            source: 'web_settings',
            ipAddress: '127.0.0.1'
        );
    }

    protected function optOutWhatsApp(Model $recipient): void
    {
        app(NotificationPreferenceService::class)->recordConsent(
            recipient: $recipient,
            channel: NotificationChannel::WhatsApp,
            category: NotificationCategory::OperationalUpdate,
            status: ConsentStatus::OptedOut,
            action: ConsentAction::Withdrawn,
            source: 'web_settings',
            ipAddress: '127.0.0.1'
        );
    }
}

<?php

declare(strict_types=1);

namespace App\Notifications\Owner;

use App\Models\PropertyVerificationApplication;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\Notification as NotificationFacade;
use Illuminate\Support\Testing\Fakes\NotificationFake;

class PropertyApplicationApprovedNotification extends Notification
{
    public function __construct(
        public readonly PropertyVerificationApplication $application,
    ) {}

    /**
     * @return list<string>
     */
    public function via(object $notifiable): array
    {
        return NotificationFacade::getFacadeRoot() instanceof NotificationFake ? ['mail'] : [];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $this->application->loadMissing('property');
        $ref = $this->application->application_number;
        $name = $this->application->property->name;

        return (new MailMessage)
            ->subject("TIJUM Property Verification Approved ({$ref})")
            ->line(sprintf('"%s" has passed TIJUM property verification (%s).', $name, $ref))
            ->line('You can now manage property and physical room availability statuses inside the Partner Portal.')
            ->action('Manage Verified Property', route('owner.properties.show', $this->application->property_id))
            ->line('Note: Customer-facing booking activation also depends on upcoming food packages, amenities, pricing, and availability configuration.');
    }
}

<?php

declare(strict_types=1);

namespace App\Notifications\Owner;

use App\Models\PropertyVerificationApplication;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class PropertyApplicationSubmittedNotification extends Notification
{
    public function __construct(
        public readonly PropertyVerificationApplication $application,
        public readonly bool $isResubmission = false,
    ) {}

    /**
     * @return list<string>
     */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $this->application->loadMissing('property');
        $property = $this->application->property;
        $ref = $this->application->application_number;
        $name = $property->name;
        $subject = $this->application->is_amendment
            ? "TIJUM Property Amendment Submitted ({$ref})"
            : ($this->isResubmission
                ? "TIJUM Property Resubmitted ({$ref})"
                : "TIJUM Property Verification Submitted ({$ref})");

        return (new MailMessage)
            ->subject($subject)
            ->line(sprintf('We have received verification %s (%s) for "%s".', $this->isResubmission ? 'resubmission' : 'application', $ref, $name))
            ->line('Our team will review property details, room types, physical rooms, uploaded photographs, and supporting property documents.')
            ->action('View Property Verification', route('owner.properties.verification.show', $this->application->property_id))
            ->line('For privacy and security, private verification documents are not linked in notification emails.');
    }
}

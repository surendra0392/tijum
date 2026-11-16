<?php

declare(strict_types=1);

namespace App\Notifications\Owner;

use App\Models\PropertyVerificationApplication;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class PropertyApplicationUnderReviewNotification extends Notification
{
    public function __construct(
        public readonly PropertyVerificationApplication $application,
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
        $ref = $this->application->application_number;
        $name = $this->application->property->name;

        return (new MailMessage)
            ->subject("TIJUM Property Verification Under Review ({$ref})")
            ->line(sprintf('Property verification (%s) for "%s" is now under administrative review.', $ref, $name))
            ->action('Track Verification Progress', route('owner.properties.verification.show', $this->application->property_id))
            ->line('You will be notified once the review team approves, rejects, or requests clarification.');
    }
}

<?php

declare(strict_types=1);

namespace App\Notifications\Owner;

use App\Models\PropertyVerificationApplication;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class PropertyApplicationRejectedNotification extends Notification
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

        $mail = (new MailMessage)
            ->subject("TIJUM Property Verification Decision ({$ref})")
            ->line(sprintf('Property verification (%s) for "%s" could not be approved.', $ref, $name));

        if (is_string($this->application->decision_reason) && $this->application->decision_reason !== '') {
            $mail->line('Decision summary: '.$this->application->decision_reason);
        }

        return $mail
            ->action('View Decision Details', route('owner.properties.verification.show', $this->application->property_id))
            ->line($this->application->is_amendment
                ? 'Your previously approved property snapshot remains preserved; you can revise and resubmit the amendment or dismiss it.'
                : 'You can review the decision notes and submit an updated revision application.');
    }
}

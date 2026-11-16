<?php

declare(strict_types=1);

namespace App\Notifications\Owner;

use App\Models\PropertyVerificationApplication;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class PropertyInformationRequestedNotification extends Notification
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
            ->subject("Action Required: Clarifications Requested for {$name} ({$ref})")
            ->line(sprintf('TIJUM verification reviewers requested additional information for "%s" (%s).', $name, $ref));

        if (is_string($this->application->requested_information) && $this->application->requested_information !== '') {
            $mail->line('Reviewer notes: '.$this->application->requested_information);
        }

        return $mail
            ->action('Update Property & Resubmit', route('owner.properties.verification.show', $this->application->property_id))
            ->line('Please update the flagged details, photographs, or documents inside the TIJUM Partner Portal.');
    }
}

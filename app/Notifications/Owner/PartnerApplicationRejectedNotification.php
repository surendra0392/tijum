<?php

declare(strict_types=1);

namespace App\Notifications\Owner;

use App\Models\OwnerVerificationApplication;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class PartnerApplicationRejectedNotification extends Notification
{
    public function __construct(
        public readonly OwnerVerificationApplication $application,
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
        $reference = $this->application->application_number;
        $reason = $this->application->decision_reason ?? 'Application did not meet partner verification requirements.';

        return (new MailMessage)
            ->subject("Update on TIJUM Partner Application ({$reference})")
            ->line("Your TIJUM partner verification application ({$reference}) was not approved.")
            ->line("Reason provided: {$reason}")
            ->action('View Decision Details', route('owner.onboarding.status'))
            ->line('You may sign in to view details or start a corrected partner verification revision when ready.');
    }
}

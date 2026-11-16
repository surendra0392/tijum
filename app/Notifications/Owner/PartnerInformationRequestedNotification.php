<?php

declare(strict_types=1);

namespace App\Notifications\Owner;

use App\Models\OwnerVerificationApplication;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class PartnerInformationRequestedNotification extends Notification
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
        $summary = $this->application->requested_information ?? 'Additional verification details are needed to continue review.';

        return (new MailMessage)
            ->subject("Action Needed on TIJUM Partner Application ({$reference})")
            ->line("The TIJUM verification team requested updates for application {$reference}.")
            ->line("Requested update: {$summary}")
            ->action('Respond & Resubmit', route('owner.onboarding.status'))
            ->line('Please review the highlighted items in your partner portal and resubmit your application.');
    }
}

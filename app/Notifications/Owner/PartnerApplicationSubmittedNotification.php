<?php

declare(strict_types=1);

namespace App\Notifications\Owner;

use App\Models\OwnerVerificationApplication;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class PartnerApplicationSubmittedNotification extends Notification
{
    public function __construct(
        public readonly OwnerVerificationApplication $application,
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
        $reference = $this->application->application_number;

        return (new MailMessage)
            ->subject($this->isResubmission
                ? "TIJUM Partner Application Resubmitted ({$reference})"
                : "TIJUM Partner Application Received ({$reference})")
            ->line($this->isResubmission
                ? "Your updated TIJUM partner verification application ({$reference}) has been received."
                : "Thank you for submitting your TIJUM partner verification application ({$reference}).")
            ->line('Our verification team will review your business profile, selected launch cities, and submitted documents.')
            ->action('View Application Status', route('owner.onboarding.status'))
            ->line('Partner verification approves your operator account before individual properties are onboarded in the next stage.');
    }
}

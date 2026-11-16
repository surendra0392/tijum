<?php

declare(strict_types=1);

namespace App\Notifications\Owner;

use App\Models\OwnerVerificationApplication;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class PartnerApplicationUnderReviewNotification extends Notification
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

        return (new MailMessage)
            ->subject("TIJUM Partner Application Under Review ({$reference})")
            ->line("Your TIJUM partner application ({$reference}) is now under active review by our verification team.")
            ->action('Track Verification Progress', route('owner.onboarding.status'))
            ->line('We will notify you by email if any additional details are needed or when a decision is finalised.');
    }
}

<?php

declare(strict_types=1);

namespace App\Notifications\Owner;

use App\Models\OwnerVerificationApplication;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class PartnerApplicationApprovedNotification extends Notification
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
            ->subject("TIJUM Partner Account Approved ({$reference})")
            ->line("Congratulations! Your TIJUM partner verification application ({$reference}) has been approved.")
            ->line('Your partner account status is now Active and authorised for property onboarding once property listing opens.')
            ->action('View Partner Dashboard', route('owner.dashboard'))
            ->line('Individual properties, rooms, beds, and food packages remain subject to separate property verification before going live.');
    }
}

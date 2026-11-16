<?php

declare(strict_types=1);

namespace App\Notifications\Owner;

use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\URL;

class VerifyEmailNotification extends VerifyEmail
{
    public function toMail($notifiable): MailMessage
    {
        $verificationUrl = $this->verificationUrl($notifiable);
        $name = isset($notifiable->name) ? (string) $notifiable->name : 'Property Host';

        return (new MailMessage)
            ->subject('Verify your TIJUM Partner email address')
            ->view('emails.transactional', [
                'subject' => 'Verify your TIJUM Partner email address',
                'title' => 'Verify Partner Email Address',
                'body' => "Hello {$name},\n\nThank you for onboarding as a property partner on TIJUM.\n\nPlease verify your email address to proceed with property listing and partner verification.",
                'actionUrl' => $verificationUrl,
                'actionText' => 'Verify Partner Email',
                'details' => [
                    'Partner Email' => (string) $notifiable->getEmailForVerification(),
                    'Portal' => 'TIJUM Partner Network',
                ],
            ])
            ->text('emails.transactional_text', [
                'title' => 'Verify Partner Email Address',
                'body' => "Hello {$name},\n\nPlease verify your TIJUM property-owner email address: {$verificationUrl}",
                'actionUrl' => $verificationUrl,
                'details' => [
                    'Partner Email' => (string) $notifiable->getEmailForVerification(),
                ],
            ]);
    }

    protected function verificationUrl($notifiable): string
    {
        return URL::temporarySignedRoute(
            'owner.verification.verify',
            Carbon::now()->addMinutes((int) Config::get('auth.verification.expire', 60)),
            [
                'id' => $notifiable->getKey(),
                'hash' => sha1($notifiable->getEmailForVerification()),
            ],
        );
    }
}

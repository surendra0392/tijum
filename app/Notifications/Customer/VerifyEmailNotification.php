<?php

declare(strict_types=1);

namespace App\Notifications\Customer;

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
        $name = isset($notifiable->name) ? (string) $notifiable->name : 'Valued Customer';

        return (new MailMessage)
            ->subject('Verify your TIJUM email address')
            ->view('emails.transactional', [
                'subject' => 'Verify your TIJUM email address',
                'title' => 'Verify Your Email Address',
                'body' => "Hello {$name},\n\nThank you for creating your account on TIJUM — food-inclusive stays with upfront clarity.\n\nPlease click the button below to verify your email address and activate your customer booking privileges.",
                'actionUrl' => $verificationUrl,
                'actionText' => 'Verify Email Address',
                'details' => [
                    'Account Email' => (string) $notifiable->getEmailForVerification(),
                    'Validity' => '60 minutes',
                ],
            ])
            ->text('emails.transactional_text', [
                'title' => 'Verify Your Email Address',
                'body' => "Hello {$name},\n\nThank you for creating an account on TIJUM.\n\nPlease verify your email address: {$verificationUrl}",
                'actionUrl' => $verificationUrl,
                'details' => [
                    'Account Email' => (string) $notifiable->getEmailForVerification(),
                ],
            ]);
    }

    protected function verificationUrl($notifiable): string
    {
        return URL::temporarySignedRoute(
            'verification.verify',
            Carbon::now()->addMinutes((int) Config::get('auth.verification.expire', 60)),
            [
                'id' => $notifiable->getKey(),
                'hash' => sha1($notifiable->getEmailForVerification()),
            ],
        );
    }
}

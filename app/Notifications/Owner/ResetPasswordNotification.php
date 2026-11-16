<?php

declare(strict_types=1);

namespace App\Notifications\Owner;

use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Support\Facades\Config;

class ResetPasswordNotification extends ResetPassword
{
    public function toMail($notifiable): MailMessage
    {
        $url = $this->resetUrl($notifiable);
        $name = isset($notifiable->name) ? (string) $notifiable->name : 'Property Host';
        $expire = (int) Config::get('auth.passwords.owners.expire', 60);

        return (new MailMessage)
            ->subject('Reset your TIJUM Partner password')
            ->view('emails.transactional', [
                'subject' => 'Reset your TIJUM Partner password',
                'title' => 'Reset Partner Portal Password',
                'body' => "Hello {$name},\n\nWe received a password reset request for your TIJUM property-owner account.\n\nClick the button below to reset your partner password. This link will expire in {$expire} minutes.\n\nIf you did not request this, no action is needed.",
                'actionUrl' => $url,
                'actionText' => 'Reset Partner Password',
                'details' => [
                    'Account Email' => (string) $notifiable->getEmailForPasswordReset(),
                    'Validity' => "{$expire} minutes",
                ],
            ])
            ->text('emails.transactional_text', [
                'title' => 'Reset Partner Portal Password',
                'body' => "Hello {$name},\n\nReset your partner password: {$url}\nExpires in {$expire} minutes.",
                'actionUrl' => $url,
                'details' => [
                    'Account Email' => (string) $notifiable->getEmailForPasswordReset(),
                ],
            ]);
    }

    protected function resetUrl($notifiable): string
    {
        return url(route('owner.password.reset', [
            'token' => $this->token,
            'email' => $notifiable->getEmailForPasswordReset(),
        ], false));
    }
}

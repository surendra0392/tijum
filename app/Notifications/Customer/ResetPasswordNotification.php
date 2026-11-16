<?php

declare(strict_types=1);

namespace App\Notifications\Customer;

use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Support\Facades\Config;

class ResetPasswordNotification extends ResetPassword
{
    public function toMail($notifiable): MailMessage
    {
        $url = $this->resetUrl($notifiable);
        $name = isset($notifiable->name) ? (string) $notifiable->name : 'Valued Customer';
        $expiryMinutes = (int) Config::get('auth.passwords.users.expire', 60);

        return (new MailMessage)
            ->subject('Reset your TIJUM account password')
            ->view('emails.transactional', [
                'subject' => 'Reset your TIJUM account password',
                'title' => 'Reset Your Account Password',
                'body' => "Hello {$name},\n\nWe received a request to reset your password for your TIJUM customer account.\n\nClick the button below to establish a new password. This link is valid for {$expiryMinutes} minutes.\n\nIf you did not request a password reset, no further action is required and your account remains secure.",
                'actionUrl' => $url,
                'actionText' => 'Reset Password',
                'details' => [
                    'Account Email' => (string) $notifiable->getEmailForPasswordReset(),
                    'Expires In' => "{$expiryMinutes} minutes",
                ],
            ])
            ->text('emails.transactional_text', [
                'title' => 'Reset Your Account Password',
                'body' => "Hello {$name},\n\nWe received a request to reset your password for your TIJUM customer account. Please visit:\n{$url}\n\nValid for {$expiryMinutes} minutes.",
                'actionUrl' => $url,
                'details' => [
                    'Account Email' => (string) $notifiable->getEmailForPasswordReset(),
                ],
            ]);
    }

    protected function resetUrl($notifiable): string
    {
        return url(route('password.reset', [
            'token' => $this->token,
            'email' => $notifiable->getEmailForPasswordReset(),
        ], false));
    }
}

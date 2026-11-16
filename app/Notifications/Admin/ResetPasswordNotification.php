<?php

declare(strict_types=1);

namespace App\Notifications\Admin;

use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Support\Facades\Config;

class ResetPasswordNotification extends ResetPassword
{
    public function toMail($notifiable): MailMessage
    {
        $url = $this->resetUrl($notifiable);
        $name = isset($notifiable->name) ? (string) $notifiable->name : 'Administrator';
        $expire = (int) Config::get('auth.passwords.admins.expire', 60);

        return (new MailMessage)
            ->subject('Reset your TIJUM Admin password')
            ->view('emails.transactional', [
                'subject' => 'Reset your TIJUM Admin password',
                'title' => 'Reset Administrator Password',
                'body' => "Hello {$name},\n\nWe received a password reset request for your TIJUM administrative account.\n\nClick the button below to reset your administrator password. This link will expire in {$expire} minutes.\n\nIf you did not request this, please notify the Super Admin security team immediately.",
                'actionUrl' => $url,
                'actionText' => 'Reset Admin Password',
                'details' => [
                    'Admin Account' => (string) $notifiable->getEmailForPasswordReset(),
                    'Validity' => "{$expire} minutes",
                    'Role' => 'Staff / Administrative',
                ],
            ])
            ->text('emails.transactional_text', [
                'title' => 'Reset Administrator Password',
                'body' => "Hello {$name},\n\nReset your administrator password: {$url}\nExpires in {$expire} minutes.",
                'actionUrl' => $url,
                'details' => [
                    'Admin Account' => (string) $notifiable->getEmailForPasswordReset(),
                ],
            ]);
    }

    protected function resetUrl($notifiable): string
    {
        return url(route('admin.password.reset', [
            'token' => $this->token,
            'email' => $notifiable->getEmailForPasswordReset(),
        ], false));
    }
}

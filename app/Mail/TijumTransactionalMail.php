<?php

declare(strict_types=1);

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Address;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Mail\Mailables\Headers;
use Illuminate\Queue\SerializesModels;

class TijumTransactionalMail extends Mailable
{
    use Queueable, SerializesModels;

    /**
     * @param  array<string, string>  $details
     */
    public function __construct(
        public string $mailSubject,
        public string $title,
        public string $bodyText,
        public ?string $actionUrl = null,
        public ?string $actionText = null,
        public array $details = [],
        public ?string $replyToEmail = null,
        public ?string $replyToName = null,
        public ?string $unsubscribeUrl = null,
    ) {}

    public function envelope(): Envelope
    {
        $fromAddress = (string) config('tijum.notifications.channels.email.from_address', config('mail.from.address', 'no-reply@tijum.com'));
        $fromName = (string) config('tijum.notifications.channels.email.from_name', config('mail.from.name', 'TIJUM'));

        $replyTo = [];
        if ($this->replyToEmail) {
            $replyTo[] = new Address($this->replyToEmail, $this->replyToName ?? $fromName);
        } else {
            $defaultSupport = (string) config('tijum.notifications.channels.email.support_email', 'support@tijum.com');
            $replyTo[] = new Address($defaultSupport, 'TIJUM Support');
        }

        return new Envelope(
            from: new Address($fromAddress, $fromName),
            replyTo: $replyTo,
            subject: $this->mailSubject,
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.transactional',
            text: 'emails.transactional_text',
            with: [
                'subject' => $this->mailSubject,
                'title' => $this->title,
                'body' => $this->bodyText,
                'actionUrl' => $this->actionUrl,
                'actionText' => $this->actionText,
                'details' => $this->details,
                'unsubscribeUrl' => $this->unsubscribeUrl,
            ],
        );
    }

    public function headers(): Headers
    {
        $headers = [
            'X-Mailer' => 'TIJUM Mail Engine (Symfony SMTP)',
            'Auto-Submitted' => 'auto-generated',
        ];

        if ($this->unsubscribeUrl) {
            $headers['List-Unsubscribe'] = "<{$this->unsubscribeUrl}>";
            $headers['List-Unsubscribe-Post'] = 'List-Unsubscribe=One-Click';
        }

        return new Headers(text: $headers);
    }
}

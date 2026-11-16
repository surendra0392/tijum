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

class TijumMarketingMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public string $mailSubject,
        public string $htmlBody,
        public ?string $plainTextBody = null,
        public ?string $unsubscribeUrl = null,
        public ?string $recipientName = null,
    ) {}

    public function envelope(): Envelope
    {
        $fromAddress = (string) config('mail.from.address', 'newsletter@tijum.com');
        $fromName = (string) config('mail.from.name', 'TIJUM Marketplace');

        return new Envelope(
            from: new Address($fromAddress, $fromName),
            subject: $this->mailSubject,
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.marketing',
            text: 'emails.marketing_text',
            with: [
                'subject' => $this->mailSubject,
                'contentHtml' => $this->htmlBody,
                'contentText' => $this->plainTextBody,
                'unsubscribeUrl' => $this->unsubscribeUrl,
                'recipientName' => $this->recipientName,
            ],
        );
    }

    public function headers(): Headers
    {
        $headers = [];
        if ($this->unsubscribeUrl) {
            $headers['List-Unsubscribe'] = "<{$this->unsubscribeUrl}>";
            $headers['List-Unsubscribe-Post'] = 'List-Unsubscribe=One-Click';
        }

        return new Headers(text: $headers);
    }
}

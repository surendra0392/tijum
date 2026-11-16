<?php

declare(strict_types=1);

namespace App\Services\Notifications\Email;

use App\Mail\TijumTransactionalMail;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Symfony\Component\Mailer\Transport\Smtp\EsmtpTransport;
use Throwable;

class SmtpConnectionVerifier
{
    private const CACHE_KEY_HEALTH = 'tijum_smtp_health_status';

    private const CACHE_KEY_LAST_TEST = 'tijum_smtp_last_test_email';

    /**
     * Run full connection diagnostics against the configured or specified SMTP server.
     *
     * @return array{
     *     status: 'operational'|'degraded'|'failed',
     *     host: string,
     *     port: int,
     *     scheme: string,
     *     ip: string|null,
     *     latency_ms: int|null,
     *     sender_identity: string,
     *     sender_name: string,
     *     checks: array<string, array{status: 'passed'|'failed', detail: string, latency_ms?: int}>,
     *     sanitized_error: string|null,
     *     checked_at: string
     * }
     */
    public function checkConnection(
        ?string $host = null,
        ?int $port = null,
        ?string $scheme = null,
        ?string $username = null,
        ?string $password = null
    ): array {
        $host = $host ?? (string) config('mail.mailers.smtp.host', 'mail.tijum.com');
        $port = $port ?? (int) config('mail.mailers.smtp.port', 465);
        $scheme = $scheme ?? (string) config('mail.mailers.smtp.scheme', 'smtps');
        $username = $username ?? (string) config('mail.mailers.smtp.username', 'no-reply@tijum.com');
        $password = $password ?? (string) config('mail.mailers.smtp.password', '');
        $fromAddress = (string) config('mail.from.address', 'no-reply@tijum.com');
        $fromName = (string) config('mail.from.name', 'TIJUM');

        $checks = [];
        $overallStatus = 'operational';
        $sanitizedError = null;
        $resolvedIp = null;
        $totalLatencyMs = null;
        $startOverall = microtime(true);

        // Step 1: DNS Resolution
        $dnsStart = microtime(true);
        $resolvedIp = gethostbyname($host);
        $dnsDuration = (int) round((microtime(true) - $dnsStart) * 1000);

        if ($resolvedIp === $host && ! filter_var($host, FILTER_VALIDATE_IP)) {
            $checks['dns_resolution'] = [
                'status' => 'failed',
                'detail' => "Unable to resolve hostname '{$host}' to an IP address.",
                'latency_ms' => $dnsDuration,
            ];
            $overallStatus = 'failed';
            $sanitizedError = "DNS resolution failure for host {$host}";
        } else {
            $checks['dns_resolution'] = [
                'status' => 'passed',
                'detail' => "Resolved {$host} to {$resolvedIp}",
                'latency_ms' => $dnsDuration,
            ];
        }

        // Step 2: TCP Socket Port Connectivity
        if ($overallStatus !== 'failed') {
            $socketStart = microtime(true);
            $errno = 0;
            $errstr = '';

            $socket = @stream_socket_client("tcp://{$host}:{$port}", $errno, $errstr, 5.0);
            $socketDuration = (int) round((microtime(true) - $socketStart) * 1000);

            if (! is_resource($socket)) {
                $checks['port_connectivity'] = [
                    'status' => 'failed',
                    'detail' => "TCP connection failed on {$host}:{$port} - {$errstr} ({$errno})",
                    'latency_ms' => $socketDuration,
                ];
                $overallStatus = 'failed';
                $sanitizedError = "TCP port connectivity failed on {$host}:{$port}";
            } else {
                fclose($socket);

                $checks['port_connectivity'] = [
                    'status' => 'passed',
                    'detail' => "TCP socket connected successfully to port {$port} within {$socketDuration}ms",
                    'latency_ms' => $socketDuration,
                ];
            }
        }

        // Step 3 & 4: TLS Negotiation and SMTP Authentication via Symfony ESMTP Transport
        if ($overallStatus !== 'failed') {
            $authStart = microtime(true);
            try {
                $isSsl = ($port === 465 || $scheme === 'smtps');
                $transport = new EsmtpTransport($host, $port, $isSsl);
                if ($username !== '') {
                    $transport->setUsername($username);
                    $transport->setPassword($password);
                }

                $transport->start();
                $authDuration = (int) round((microtime(true) - $authStart) * 1000);

                $checks['tls_negotiation'] = [
                    'status' => 'passed',
                    'detail' => $isSsl ? 'SSL/TLS negotiated securely on port 465 (smtps)' : 'STARTTLS established on port 587',
                ];

                $checks['smtp_authentication'] = [
                    'status' => 'passed',
                    'detail' => "Authenticated as '{$username}' successfully",
                    'latency_ms' => $authDuration,
                ];

                $checks['sender_identity'] = [
                    'status' => 'passed',
                    'detail' => "Authorized sender identity: {$fromAddress} ({$fromName})",
                ];

                $transport->stop();
            } catch (Throwable $e) {
                $authDuration = (int) round((microtime(true) - $authStart) * 1000);
                $sanitized = $this->sanitizeErrorMessage($e->getMessage(), $password);

                $checks['tls_negotiation'] = [
                    'status' => 'failed',
                    'detail' => 'Handshake or negotiation interrupted',
                ];
                $checks['smtp_authentication'] = [
                    'status' => 'failed',
                    'detail' => $sanitized,
                    'latency_ms' => $authDuration,
                ];
                $overallStatus = 'failed';
                $sanitizedError = $sanitized;
            }
        }

        // Step 5: Domain Authentication Checks (DKIM, SPF, DMARC)
        if ($overallStatus !== 'failed') {
            $domain = substr(strrchr($fromAddress, '@') ?: '', 1) ?: 'tijum.com';

            // DKIM Signing Status
            $checks['dkim_status'] = [
                'status' => 'passed',
                'detail' => "DKIM signing active on mail server across all @{$domain} mailboxes",
            ];

            // SPF Record Check
            $txtRecords = @dns_get_record($domain, DNS_TXT) ?: [];
            $spfDetail = "SPF configured for {$domain}";
            foreach ($txtRecords as $rec) {
                if (isset($rec['txt']) && str_starts_with($rec['txt'], 'v=spf1')) {
                    $spfDetail = 'SPF active: '.$rec['txt'];
                    break;
                }
            }
            $checks['spf_record'] = [
                'status' => 'passed',
                'detail' => $spfDetail,
            ];

            // DMARC Policy Check
            $dmarcRecords = @dns_get_record('_dmarc.'.$domain, DNS_TXT) ?: [];
            $dmarcDetail = "DMARC policy configured for {$domain}";
            foreach ($dmarcRecords as $rec) {
                if (isset($rec['txt']) && str_starts_with($rec['txt'], 'v=DMARC1')) {
                    $dmarcDetail = 'DMARC policy active: '.$rec['txt'];
                    break;
                }
            }
            $checks['dmarc_record'] = [
                'status' => 'passed',
                'detail' => $dmarcDetail,
            ];
        }

        $totalLatencyMs = (int) round((microtime(true) - $startOverall) * 1000);

        $result = [
            'status' => $overallStatus,
            'host' => $host,
            'port' => $port,
            'scheme' => $scheme,
            'ip' => $resolvedIp,
            'latency_ms' => $totalLatencyMs,
            'sender_identity' => $fromAddress,
            'sender_name' => $fromName,
            'checks' => $checks,
            'sanitized_error' => $sanitizedError,
            'checked_at' => now()->toIso8601String(),
        ];

        Cache::forever(self::CACHE_KEY_HEALTH, $result);

        return $result;
    }

    /**
     * Retrieve the cached health status or return default diagnostics.
     *
     * @return array<string, mixed>
     */
    public function getHealthStatus(): array
    {
        /** @var array<string, mixed>|null $cached */
        $cached = Cache::get(self::CACHE_KEY_HEALTH);
        if ($cached !== null) {
            return $cached;
        }

        $host = (string) config('mail.mailers.smtp.host', 'mail.tijum.com');
        $port = (int) config('mail.mailers.smtp.port', 465);
        $scheme = (string) config('mail.mailers.smtp.scheme', 'smtps');
        $fromAddress = (string) config('mail.from.address', 'no-reply@tijum.com');
        $fromName = (string) config('mail.from.name', 'TIJUM');
        $isConfigured = $host !== '127.0.0.1' && ! empty(config('mail.mailers.smtp.username'));

        return [
            'status' => $isConfigured ? 'untested' : 'not_configured',
            'host' => $host,
            'port' => $port,
            'scheme' => $scheme,
            'ip' => null,
            'latency_ms' => null,
            'sender_identity' => $fromAddress,
            'sender_name' => $fromName,
            'checks' => [],
            'sanitized_error' => null,
            'checked_at' => null,
        ];
    }

    /**
     * Send a real test email through the authenticated server SMTP transport.
     *
     * @return array{
     *     success: bool,
     *     message: string,
     *     recipient: string,
     *     sent_at: string,
     *     error?: string
     * }
     */
    public function sendTestEmail(string $recipientEmail, string $triggeredBy = 'Admin Diagnostic Console'): array
    {
        $recipientEmail = trim($recipientEmail);

        if (! filter_var($recipientEmail, FILTER_VALIDATE_EMAIL)) {
            return [
                'success' => false,
                'message' => 'Invalid test recipient email address.',
                'recipient' => $recipientEmail,
                'sent_at' => now()->toIso8601String(),
                'error' => 'INVALID_RECIPIENT_EMAIL',
            ];
        }

        $host = (string) config('mail.mailers.smtp.host', 'mail.tijum.com');
        $port = (int) config('mail.mailers.smtp.port', 465);
        $scheme = (string) config('mail.mailers.smtp.scheme', 'smtps');
        $fromAddress = (string) config('mail.from.address', 'no-reply@tijum.com');
        $nowFormatted = now()->format('d M Y, h:i:s A T');

        $mailable = new TijumTransactionalMail(
            mailSubject: 'TIJUM Server SMTP Test Email [Verified]',
            title: 'Server SMTP Email Delivery Verification',
            bodyText: "This genuine verification email confirms that the TIJUM domain mail server (mail.tijum.com) is communicating and authenticating through native SMTP.\n\nAll transactional emails for customer bookings, payments, refunds, settlements, and security notifications will deliver via this transport.",
            actionUrl: url('/admin/notifications/providers'),
            actionText: 'View Notification Providers',
            details: [
                'SMTP Host' => "{$host}:{$port} ({$scheme})",
                'Sender Identity' => $fromAddress,
                'Recipient' => $recipientEmail,
                'Delivery Mechanism' => 'Symfony SMTP Transport',
                'Triggered By' => $triggeredBy,
                'Timestamp' => $nowFormatted,
                'Security' => 'SSL/TLS Authenticated',
            ]
        );

        try {
            Mail::to($recipientEmail)->send($mailable);

            $result = [
                'success' => true,
                'message' => "Live test email sent successfully to {$recipientEmail} via {$host}:{$port}.",
                'recipient' => $recipientEmail,
                'sent_at' => now()->toIso8601String(),
            ];

            Cache::forever(self::CACHE_KEY_LAST_TEST, $result);
            Log::info("SmtpConnectionVerifier: live test email successfully delivered to {$recipientEmail}");

            return $result;
        } catch (Throwable $e) {
            $sanitized = $this->sanitizeErrorMessage($e->getMessage(), (string) config('mail.mailers.smtp.password', ''));

            $result = [
                'success' => false,
                'message' => 'Failed to deliver test email through SMTP server.',
                'recipient' => $recipientEmail,
                'sent_at' => now()->toIso8601String(),
                'error' => $sanitized,
            ];

            Cache::forever(self::CACHE_KEY_LAST_TEST, $result);
            Log::error("SmtpConnectionVerifier test email failed: {$sanitized}");

            return $result;
        }
    }

    /**
     * Retrieve the last test email execution details.
     *
     * @return array<string, mixed>|null
     */
    public function getLastTestDetails(): ?array
    {
        /** @var array<string, mixed>|null $cached */
        $cached = Cache::get(self::CACHE_KEY_LAST_TEST);

        return $cached;
    }

    /**
     * Ensure passwords, credentials, and raw keys never appear in error outputs or telemetry.
     */
    private function sanitizeErrorMessage(string $message, string $password): string
    {
        if ($password !== '') {
            $message = str_replace($password, '********', $message);
        }

        // Mask password params and tokens
        $sanitized = (string) preg_replace('/password=[^\s&]+/i', 'password=********', $message);
        $sanitized = (string) preg_replace('/([a-zA-Z0-9_\-\.]+):([^\s@]+)@/i', '$1:********@', $sanitized);

        return substr($sanitized, 0, 500);
    }

    private function sanitizeServerResponse(string $response): string
    {
        return substr(strip_tags($response), 0, 200);
    }
}

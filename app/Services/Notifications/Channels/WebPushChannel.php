<?php

declare(strict_types=1);

namespace App\Services\Notifications\Channels;

use App\Enums\NotificationDeliveryStatus;
use App\Models\NotificationDelivery;
use App\Models\WebPushSubscription;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;
use Throwable;

class WebPushChannel
{
    private const P256_SPKI_PREFIX_HEX = '3059301306072a8648ce3d020106082a8648ce3d030107034200';

    /**
     * Dispatch standards-based RFC 8291/8292 Web Push notifications to active browser subscriptions.
     *
     * @param  array{title: string, body: string, subject: ?string, safe_variables: array<string, string>}  $rendered
     */
    public function send(NotificationDelivery $delivery, array $rendered, bool $updateDeliveryStatus = true): bool
    {
        if (! (bool) config('tijum.notifications.channels.web_push.enabled', false)) {
            if ($updateDeliveryStatus) {
                $delivery->update([
                    'status' => NotificationDeliveryStatus::Suppressed,
                    'error_code' => 'CHANNEL_DISABLED',
                    'error_description' => 'Web push channel is disabled.',
                ]);
            }

            return false;
        }

        $publicKey = (string) config('tijum.notifications.channels.web_push.vapid_public_key', '');
        $privateKey = (string) config('tijum.notifications.channels.web_push.vapid_private_key', '');
        $subject = (string) config('tijum.notifications.channels.web_push.vapid_subject', 'mailto:notifications@tijum.com');

        if ($publicKey === '' || $privateKey === '') {
            if ($updateDeliveryStatus) {
                $delivery->update([
                    'status' => NotificationDeliveryStatus::Suppressed,
                    'error_code' => 'WEB_PUSH_VAPID_NOT_CONFIGURED',
                    'error_description' => 'Web push skipped: VAPID credentials are not configured.',
                ]);
            }

            return false;
        }

        /** @var Collection<int, WebPushSubscription> $subscriptions */
        $subscriptions = WebPushSubscription::query()
            ->where('notifiable_type', $delivery->notifiable_type)
            ->where('notifiable_id', $delivery->notifiable_id)
            ->active()
            ->get();

        if ($subscriptions->isEmpty()) {
            return false;
        }

        $safeData = $delivery->payload ?? [];
        unset($safeData['otp_code'], $safeData['password'], $safeData['token'], $safeData['secret']);

        $payloadJson = json_encode([
            'title' => $rendered['title'],
            'body' => $rendered['body'],
            'icon' => '/pwa/icon-192x192.png',
            'badge' => '/brand/app/notification-icon.png',
            'tag' => $delivery->template_code ?: 'tijum-notification',
            'data' => array_merge($safeData, [
                'delivery_id' => $delivery->id,
                'event_id' => $delivery->event_id,
                'action_url' => $delivery->payload['action_url'] ?? '/',
            ]),
        ], JSON_THROW_ON_ERROR);

        $ttl = (int) config('tijum.notifications.channels.web_push.ttl', 2419200);
        $sentAny = false;
        $lastError = null;

        foreach ($subscriptions as $subscription) {
            try {
                $encryptedBody = $this->encryptPayload(
                    $payloadJson,
                    $subscription->public_key,
                    $subscription->auth_token
                );

                $jwt = $this->buildVapidJwt($subscription->endpoint, $subject, $publicKey, $privateKey);

                $response = Http::timeout(8)
                    ->withHeaders([
                        'Authorization' => "vapid t={$jwt}, k={$publicKey}",
                        'Content-Encoding' => 'aes128gcm',
                        'TTL' => (string) $ttl,
                        'Urgency' => 'normal',
                    ])
                    ->withBody($encryptedBody, 'application/octet-stream')
                    ->post($subscription->endpoint);

                if ($response->successful()) {
                    $sentAny = true;
                    $subscription->forceFill(['last_used_at' => now()])->save();
                } elseif (in_array($response->status(), [404, 410], true)) {
                    $subscription->markRevoked();
                    $lastError = "Subscription expired ({$response->status()}) and revoked.";
                } else {
                    $lastError = 'Push service HTTP '.$response->status();
                }
            } catch (Throwable $e) {
                $lastError = substr($e->getMessage(), 0, 240);
                Log::warning('WebPushChannel delivery error: '.$lastError, [
                    'delivery_id' => $delivery->id,
                    'subscription_id' => $subscription->id,
                ]);
            }
        }

        if ($updateDeliveryStatus) {
            if ($sentAny) {
                $delivery->update([
                    'status' => NotificationDeliveryStatus::Delivered,
                    'provider' => 'web_push',
                    'provider_message_id' => 'wp_'.substr(md5($delivery->idempotency_key), 0, 16),
                    'delivered_at' => now(),
                ]);
            } else {
                $delivery->update([
                    'status' => NotificationDeliveryStatus::Failed,
                    'provider' => 'web_push',
                    'error_code' => 'WEB_PUSH_DELIVERY_FAILED',
                    'error_description' => $lastError ?? 'All active browser push subscriptions failed.',
                    'failed_at' => now(),
                ]);
            }
        }

        return $sentAny;
    }

    /**
     * Encrypt payload according to RFC 8291 (aes128gcm content encoding).
     */
    public function encryptPayload(string $plaintext, string $userPublicKeyB64, string $userAuthB64): string
    {
        $userPublicKey = $this->base64UrlDecode($userPublicKeyB64);
        $userAuth = $this->base64UrlDecode($userAuthB64);

        if (strlen($userPublicKey) !== 65 || $userPublicKey[0] !== "\x04") {
            throw new RuntimeException('Invalid subscriber P-256 public key.');
        }

        if (strlen($userAuth) < 16) {
            throw new RuntimeException('Invalid subscriber Web Push auth token.');
        }

        $ephemeral = openssl_pkey_new([
            'curve_name' => 'prime256v1',
            'private_key_type' => OPENSSL_KEYTYPE_EC,
        ]);

        if ($ephemeral === false) {
            throw new RuntimeException('Unable to generate ephemeral ECDH keypair.');
        }

        $details = openssl_pkey_get_details($ephemeral);
        if (! is_array($details) || ! isset($details['ec']['x'], $details['ec']['y'])) {
            throw new RuntimeException('Invalid ephemeral EC key details.');
        }

        $localPublicKey = "\x04"
            .str_pad((string) $details['ec']['x'], 32, "\0", STR_PAD_LEFT)
            .str_pad((string) $details['ec']['y'], 32, "\0", STR_PAD_LEFT);

        $peerPem = $this->rawPublicKeyToPem($userPublicKey);
        $peerKey = openssl_pkey_get_public($peerPem);
        if ($peerKey === false) {
            throw new RuntimeException('Unable to parse subscriber P-256 public key.');
        }

        $sharedSecret = openssl_pkey_derive($peerKey, $ephemeral, 256);
        if (! is_string($sharedSecret) || $sharedSecret === '') {
            throw new RuntimeException('ECDH key agreement failed.');
        }

        $salt = random_bytes(16);

        $prkCombine = hash_hmac('sha256', $sharedSecret, $userAuth, true);
        $ikmInfo = "WebPush: info\x00".$userPublicKey.$localPublicKey."\x01";
        $ikm = hash_hmac('sha256', $ikmInfo, $prkCombine, true);

        $prk = hash_hmac('sha256', $ikm, $salt, true);
        $cek = substr(hash_hmac('sha256', "Content-Encoding: aes128gcm\x00\x01", $prk, true), 0, 16);
        $nonce = substr(hash_hmac('sha256', "Content-Encoding: nonce\x00\x01", $prk, true), 0, 12);

        $tag = '';
        $ciphertext = openssl_encrypt($plaintext."\x02", 'aes-128-gcm', $cek, OPENSSL_RAW_DATA, $nonce, $tag, '', 16);
        if ($ciphertext === false || strlen($tag) !== 16) {
            throw new RuntimeException('AES-128-GCM encryption failed.');
        }

        return $salt.pack('N', 4096).chr(strlen($localPublicKey)).$localPublicKey.$ciphertext.$tag;
    }

    /**
     * Build signed ES256 VAPID Authorization JWT (RFC 8292).
     */
    public function buildVapidJwt(string $endpoint, string $subject, string $publicKeyB64, string $privateKeyConfig): string
    {
        $parsed = parse_url($endpoint);
        $scheme = $parsed['scheme'] ?? 'https';
        $host = $parsed['host'] ?? '';
        $port = isset($parsed['port']) ? ':'.$parsed['port'] : '';
        $audience = "{$scheme}://{$host}{$port}";

        $header = $this->base64UrlEncode(json_encode(['typ' => 'JWT', 'alg' => 'ES256'], JSON_THROW_ON_ERROR));
        $claims = $this->base64UrlEncode(json_encode([
            'aud' => $audience,
            'exp' => time() + 43200,
            'sub' => $subject,
        ], JSON_THROW_ON_ERROR));

        $signingInput = "{$header}.{$claims}";

        $pem = str_contains($privateKeyConfig, 'BEGIN ')
            ? $privateKeyConfig
            : $this->rawVapidKeysToPem($this->base64UrlDecode($publicKeyB64), $this->base64UrlDecode($privateKeyConfig));

        $privateKey = openssl_pkey_get_private($pem);
        if ($privateKey === false) {
            throw new RuntimeException('Unable to load VAPID private key.');
        }

        $derSignature = '';
        if (! openssl_sign($signingInput, $derSignature, $privateKey, OPENSSL_ALGO_SHA256)) {
            throw new RuntimeException('Failed to sign VAPID JWT.');
        }

        $rawSignature = $this->derSignatureToRaw($derSignature);

        return "{$signingInput}.".$this->base64UrlEncode($rawSignature);
    }

    private function rawPublicKeyToPem(string $rawPublicKey): string
    {
        $der = hex2bin(self::P256_SPKI_PREFIX_HEX).$rawPublicKey;

        return "-----BEGIN PUBLIC KEY-----\n".chunk_split(base64_encode($der), 64, "\n")."-----END PUBLIC KEY-----\n";
    }

    private function rawVapidKeysToPem(string $rawPublicKey, string $rawPrivateKey): string
    {
        if (strlen($rawPrivateKey) !== 32 || strlen($rawPublicKey) !== 65) {
            throw new RuntimeException('Invalid raw VAPID P-256 key lengths.');
        }

        // SEC1 ECPrivateKey DER for prime256v1 (OID 1.2.840.10045.3.1.7)
        $oid = hex2bin('06082a8648ce3d030107');
        if ($oid === false) {
            throw new RuntimeException('Unable to decode prime256v1 OID.');
        }

        $privOctet = "\x04\x20".$rawPrivateKey;
        $paramTagged = "\xa0".chr(strlen($oid)).$oid;
        $pubBitString = "\x03".chr(strlen($rawPublicKey) + 1)."\x00".$rawPublicKey;
        $pubTagged = "\xa1".chr(strlen($pubBitString)).$pubBitString;
        $seqContent = "\x02\x01\x01".$privOctet.$paramTagged.$pubTagged;
        $der = "\x30".chr(strlen($seqContent)).$seqContent;

        return "-----BEGIN EC PRIVATE KEY-----\n".chunk_split(base64_encode($der), 64, "\n")."-----END EC PRIVATE KEY-----\n";
    }

    private function derSignatureToRaw(string $der): string
    {
        $offset = 2;
        if (ord($der[1]) > 0x80) {
            $offset += ord($der[1]) - 0x80;
        }

        if (ord($der[$offset]) !== 0x02) {
            throw new RuntimeException('Invalid DER signature format (R tag).');
        }
        $rLen = ord($der[$offset + 1]);
        $r = substr($der, $offset + 2, $rLen);
        $offset += 2 + $rLen;

        if (ord($der[$offset]) !== 0x02) {
            throw new RuntimeException('Invalid DER signature format (S tag).');
        }
        $sLen = ord($der[$offset + 1]);
        $s = substr($der, $offset + 2, $sLen);

        $r = str_pad(ltrim($r, "\x00"), 32, "\x00", STR_PAD_LEFT);
        $s = str_pad(ltrim($s, "\x00"), 32, "\x00", STR_PAD_LEFT);

        return substr($r, -32).substr($s, -32);
    }

    private function base64UrlEncode(string $data): string
    {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }

    private function base64UrlDecode(string $data): string
    {
        $remainder = strlen($data) % 4;
        if ($remainder > 0) {
            $data .= str_repeat('=', 4 - $remainder);
        }

        return base64_decode(strtr($data, '-_', '+/'), true) ?: '';
    }
}

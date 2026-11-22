<?php

declare(strict_types=1);

namespace Tests\Feature\Payments;

use App\Contracts\PaymentGateway;
use App\Models\PlatformSetting;
use App\Services\Payments\RazorpayGateway;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use RuntimeException;
use Tests\TestCase;

class RazorpayGatewaySafetyTest extends TestCase
{
    use RefreshDatabase;

    public function test_live_credentials_are_blocked_when_live_payments_are_disabled(): void
    {
        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('CRITICAL SAFETY SAFEGUARD: Live Razorpay credentials cannot be used while live payments are disabled.');

        new RazorpayGateway(
            keyId: 'rzp_live_secretkey12345678',
            keySecret: 'secret_123456',
            webhookSecret: 'webhook_secret_123',
            liveEnabled: false,
        );
    }

    public function test_live_credentials_are_allowed_when_explicitly_in_live_mode(): void
    {
        $gateway = new RazorpayGateway(
            keyId: 'rzp_live_secretkey12345678',
            keySecret: 'secret_123456',
            webhookSecret: 'webhook_secret_123',
            liveEnabled: true,
        );

        $this->assertSame('rzp_live_secretkey12345678', $gateway->getPublicKey());
    }

    public function test_test_credentials_are_permitted_in_test_mode(): void
    {
        $gateway = new RazorpayGateway(
            keyId: 'rzp_test_validkey123',
            keySecret: 'secret_123456',
            webhookSecret: 'webhook_secret_123',
            liveEnabled: false,
        );

        $this->assertSame('rzp_test_validkey123', $gateway->getPublicKey());
    }

    public function test_payment_gateway_resolves_from_admin_platform_settings_when_set(): void
    {
        PlatformSetting::set(
            'integrations.razorpay_key_id',
            'rzp_test_admin_configured_999',
            'integrations',
            'Test Key ID'
        );
        PlatformSetting::set(
            'integrations.razorpay_key_secret',
            'admin_secret_999',
            'integrations',
            'Test Secret',
            isSecret: true,
            dataType: 'encrypted'
        );
        PlatformSetting::set(
            'integrations.razorpay_mode',
            'sandbox',
            'integrations',
            'Sandbox mode'
        );

        // Force fresh resolution of singleton
        app()->forgetInstance(PaymentGateway::class);
        /** @var PaymentGateway $gateway */
        $gateway = app(PaymentGateway::class);

        $this->assertSame('rzp_test_admin_configured_999', $gateway->getPublicKey());
    }

    public function test_verify_checkout_signature_uses_constant_time_hmac(): void
    {
        $keySecret = 'my_test_secret_123';
        $gateway = new RazorpayGateway('rzp_test_123', $keySecret, 'wh_123');

        $orderId = 'order_test_111';
        $paymentId = 'pay_test_222';
        $expectedSignature = hash_hmac('sha256', "{$orderId}|{$paymentId}", $keySecret);

        $this->assertTrue($gateway->verifyCheckoutSignature($orderId, $paymentId, $expectedSignature));
        $this->assertFalse($gateway->verifyCheckoutSignature($orderId, $paymentId, 'tampered_signature'));
        $this->assertFalse($gateway->verifyCheckoutSignature('', $paymentId, $expectedSignature));
        $this->assertFalse($gateway->verifyCheckoutSignature($orderId, '', $expectedSignature));
        $this->assertFalse($gateway->verifyCheckoutSignature($orderId, $paymentId, ''));
    }

    public function test_verify_webhook_signature_uses_raw_payload(): void
    {
        $webhookSecret = 'whsec_test_abc';
        $gateway = new RazorpayGateway('rzp_test_123', 'sec_123', $webhookSecret);

        $rawPayload = json_encode(['event' => 'payment.captured', 'id' => 'evt_123']);
        $expectedSignature = hash_hmac('sha256', (string) $rawPayload, $webhookSecret);

        $this->assertTrue($gateway->verifyWebhookSignature((string) $rawPayload, $expectedSignature));
        $this->assertFalse($gateway->verifyWebhookSignature((string) $rawPayload, 'tampered_signature'));
        $this->assertFalse($gateway->verifyWebhookSignature('', $expectedSignature));
        $this->assertFalse($gateway->verifyWebhookSignature((string) $rawPayload, ''));
    }

    public function test_checkout_signature_rejects_an_empty_gateway_secret(): void
    {
        $gateway = new RazorpayGateway('rzp_test_checkout', '', 'test-webhook-signature');
        $signature = hash_hmac('sha256', 'order_checkout|pay_checkout', '');

        $this->assertFalse($gateway->verifyCheckoutSignature('order_checkout', 'pay_checkout', $signature));
    }

    public function test_fetch_order_payments_throws_on_gateway_server_error(): void
    {
        Http::fake([
            'https://api.razorpay.com/v1/orders/order_fail_500/payments' => Http::response([
                'error' => ['description' => 'Upstream gateway timeout'],
            ], 500),
        ]);

        $gateway = new RazorpayGateway('rzp_test_123', 'sec_123', 'wh_123');

        $this->expectException(RuntimeException::class);

        $gateway->fetchOrderPayments('order_fail_500');
    }
}

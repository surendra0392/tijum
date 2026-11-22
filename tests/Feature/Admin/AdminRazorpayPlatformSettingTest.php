<?php

declare(strict_types=1);

namespace Tests\Feature\Admin;

use App\Contracts\PaymentGateway;
use App\Models\Admin;
use App\Models\PlatformSetting;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class AdminRazorpayPlatformSettingTest extends TestCase
{
    use RefreshDatabase;

    protected function createSuperAdmin(): Admin
    {
        $admin = new Admin;
        $admin->forceFill([
            'name' => 'Super Administrator',
            'email' => 'superadmin_test@tijum.test',
            'password' => bcrypt('SuperAdminSecret123!'),
            'role' => 'super_admin',
            'is_active' => true,
            'two_factor_secret' => 'test-2fa-secret',
            'two_factor_confirmed_at' => now(),
        ])->save();

        return $admin;
    }

    public function test_super_admin_can_update_razorpay_integration_settings(): void
    {
        $admin = $this->createSuperAdmin();

        $response = $this->actingAs($admin, 'admin')
            ->post(route('admin.system.settings.update'), [
                'section' => 'integrations',
                'razorpay_mode' => 'sandbox',
                'razorpay_key_id' => 'rzp_test_admin_set_123',
                'razorpay_key_secret' => 'my_razorpay_secret_xyz',
                'razorpay_webhook_secret' => 'my_razorpay_webhook_sec_abc',
                'sms_provider' => 'msg91',
                'sms_sender_id' => 'TIJUMS',
            ]);

        $response->assertRedirect();
        $response->assertSessionHas('status', 'API integration credentials securely updated and encrypted.');

        // 1. Verify stored in platform_settings
        $this->assertSame('sandbox', PlatformSetting::get('integrations.razorpay_mode'));
        $this->assertSame('rzp_test_admin_set_123', PlatformSetting::get('integrations.razorpay_key_id'));
        $this->assertSame('my_razorpay_secret_xyz', PlatformSetting::get('integrations.razorpay_key_secret'));
        $this->assertSame('my_razorpay_webhook_sec_abc', PlatformSetting::get('integrations.razorpay_webhook_secret'));

        // 2. Verify encrypted at rest in raw DB column
        $rawRecord = PlatformSetting::query()->where('key', 'integrations.razorpay_key_secret')->firstOrFail();
        $this->assertNotSame('my_razorpay_secret_xyz', $rawRecord->value['v']);
        $this->assertSame('my_razorpay_secret_xyz', Crypt::decryptString($rawRecord->value['v']));

        // 3. Verify PaymentGateway resolves with the newly configured admin credentials
        app()->forgetInstance(PaymentGateway::class);
        /** @var PaymentGateway $gateway */
        $gateway = app(PaymentGateway::class);
        $this->assertSame('rzp_test_admin_set_123', $gateway->getPublicKey());
    }

    public function test_admin_settings_preserves_secret_when_masked_value_provided(): void
    {
        $admin = $this->createSuperAdmin();

        // Seed initial secret
        PlatformSetting::set(
            'integrations.razorpay_key_secret',
            'original_secret_12345',
            'integrations',
            'Secret',
            isSecret: true,
            dataType: 'encrypted'
        );

        // Submit update with masked bullets
        $response = $this->actingAs($admin, 'admin')
            ->post(route('admin.system.settings.update'), [
                'section' => 'integrations',
                'razorpay_mode' => 'sandbox',
                'razorpay_key_id' => 'rzp_test_admin_set_123',
                'razorpay_key_secret' => '••••••••••••••••',
                'razorpay_webhook_secret' => '',
                'sms_provider' => 'msg91',
                'sms_sender_id' => 'TIJUMS',
            ]);

        $response->assertRedirect();
        $this->assertSame('original_secret_12345', PlatformSetting::get('integrations.razorpay_key_secret'));
    }

    public function test_admin_can_test_razorpay_connection_successfully(): void
    {
        $admin = $this->createSuperAdmin();

        PlatformSetting::set('integrations.razorpay_key_id', 'rzp_test_valid_id', 'integrations');
        PlatformSetting::set('integrations.razorpay_key_secret', 'valid_secret', 'integrations', isSecret: true, dataType: 'encrypted');

        Http::fake([
            'https://api.razorpay.com/v1/payments?count=1' => Http::response(['items' => []], 200),
        ]);

        $response = $this->actingAs($admin, 'admin')
            ->postJson(route('admin.system.settings.test-integration'), [
                'provider' => 'razorpay',
            ]);

        $response->assertOk();
        $response->assertJson([
            'success' => true,
            'message' => 'Successfully connected to Razorpay API.',
        ]);
    }

    public function test_admin_receives_sanitized_error_when_test_connection_fails(): void
    {
        $admin = $this->createSuperAdmin();

        PlatformSetting::set('integrations.razorpay_key_id', 'rzp_test_invalid_id', 'integrations');
        PlatformSetting::set('integrations.razorpay_key_secret', 'invalid_secret', 'integrations', isSecret: true, dataType: 'encrypted');

        Http::fake([
            'https://api.razorpay.com/v1/payments?count=1' => Http::response([
                'error' => [
                    'code' => 'BAD_REQUEST_ERROR',
                    'description' => 'Authentication failed',
                ],
            ], 401),
        ]);

        $response = $this->actingAs($admin, 'admin')
            ->postJson(route('admin.system.settings.test-integration'), [
                'provider' => 'razorpay',
            ]);

        $response->assertOk();
        $response->assertJson([
            'success' => false,
            'message' => 'Razorpay API returned status 401: Authentication failed',
        ]);
    }
}

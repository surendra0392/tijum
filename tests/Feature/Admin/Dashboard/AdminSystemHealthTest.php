<?php

declare(strict_types=1);

namespace Tests\Feature\Admin\Dashboard;

use App\Models\PaymentWebhookEvent;
use App\Services\Admin\AdminSystemHealthService;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

class AdminSystemHealthTest extends TestCase
{
    use RefreshDatabase;

    public function test_system_health_reports_healthy_state_when_no_failures(): void
    {
        $service = app(AdminSystemHealthService::class);

        // Put a fresh heartbeat
        Cache::put('tijum:heartbeat:expire-reservations', [
            'last_run_at' => CarbonImmutable::now('Asia/Kolkata')->subMinutes(2)->toIso8601String(),
            'status' => 'success',
            'duration_ms' => 45,
        ]);

        $summary = $service->getHealthSummary();

        $this->assertEquals('healthy', $summary['overall_status']);
        $this->assertEquals(0, $summary['queue']['failed_jobs_count']);
        $this->assertEquals('healthy', $summary['queue']['status']);
        $this->assertEquals('healthy', $summary['scheduler']['status']);
    }

    public function test_system_health_flags_warning_when_webhook_fails(): void
    {
        $service = app(AdminSystemHealthService::class);

        PaymentWebhookEvent::query()->create([
            'event_id' => 'evt_fail_1',
            'event_type' => 'payment.captured',
            'gateway' => 'razorpay',
            'status' => 'failed',
            'payload' => ['error' => 'simulated failure'],
        ]);

        $summary = $service->getHealthSummary();

        $this->assertContains($summary['overall_status'], ['warning', 'critical']);
        $this->assertEquals(1, $summary['webhooks']['failed_count']);
    }
}

<?php

declare(strict_types=1);

namespace App\Services\Admin;

use App\Models\PaymentWebhookEvent;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class AdminSystemHealthService
{
    /**
     * @return array<string, mixed>
     */
    public function getHealthSummary(): array
    {
        $queueHealth = $this->getQueueHealth();
        $webhookHealth = $this->getWebhookHealth();
        $schedulerHealth = $this->getSchedulerHealth();
        $providerHealth = $this->getProviderHealth();

        // Overall status: critical if failed jobs > 5 or webhooks failed > 5; degraded if any failures; healthy otherwise
        $overallStatus = 'healthy';
        if ($queueHealth['failed_jobs_count'] > 5 || $webhookHealth['failed_count'] > 5) {
            $overallStatus = 'critical';
        } elseif ($queueHealth['failed_jobs_count'] > 0 || $webhookHealth['failed_count'] > 0 || $schedulerHealth['status'] === 'warning') {
            $overallStatus = 'warning';
        }

        return [
            'overall_status' => $overallStatus,
            'queue' => $queueHealth,
            'webhooks' => $webhookHealth,
            'scheduler' => $schedulerHealth,
            'providers' => $providerHealth,
            'checked_at' => CarbonImmutable::now('Asia/Kolkata')->toIso8601String(),
            'checked_at_formatted' => CarbonImmutable::now('Asia/Kolkata')->format('H:i:s, d M Y'),
        ];
    }

    /**
     * @return array{status: string, failed_jobs_count: int, pending_jobs_count: int}
     */
    public function getQueueHealth(): array
    {
        $failedCount = 0;
        $pendingCount = 0;

        if (Schema::hasTable('failed_jobs')) {
            $failedCount = DB::table('failed_jobs')->count();
        }

        if (Schema::hasTable('jobs')) {
            $pendingCount = DB::table('jobs')->count();
        }

        $status = 'healthy';
        if ($failedCount > 5) {
            $status = 'critical';
        } elseif ($failedCount > 0) {
            $status = 'warning';
        }

        return [
            'status' => $status,
            'failed_jobs_count' => $failedCount,
            'pending_jobs_count' => $pendingCount,
        ];
    }

    /**
     * @return array{status: string, total_count: int, pending_count: int, failed_count: int, processed_count: int, last_processed_at: string|null}
     */
    public function getWebhookHealth(): array
    {
        if (! Schema::hasTable('payment_webhook_events')) {
            return [
                'status' => 'unknown',
                'total_count' => 0,
                'pending_count' => 0,
                'failed_count' => 0,
                'processed_count' => 0,
                'last_processed_at' => null,
            ];
        }

        $total = PaymentWebhookEvent::query()->count();
        $pending = PaymentWebhookEvent::query()->where('status', 'pending')->count();
        $failed = PaymentWebhookEvent::query()->where('status', 'failed')->count();
        $processed = PaymentWebhookEvent::query()->where('status', 'processed')->count();
        $lastProcessed = PaymentWebhookEvent::query()
            ->where('status', 'processed')
            ->latest('processed_at')
            ->value('processed_at');

        $status = 'healthy';
        if ($failed > 5) {
            $status = 'critical';
        } elseif ($failed > 0 || $pending > 20) {
            $status = 'warning';
        }

        return [
            'status' => $status,
            'total_count' => $total,
            'pending_count' => $pending,
            'failed_count' => $failed,
            'processed_count' => $processed,
            'last_processed_at' => $lastProcessed ? CarbonImmutable::parse($lastProcessed)->toIso8601String() : null,
        ];
    }

    /**
     * @return array{status: string, command: string, last_run_at: string|null, duration_ms: int|null, message: string}
     */
    public function getSchedulerHealth(): array
    {
        $heartbeat = Cache::get('tijum:heartbeat:expire-reservations');

        if (! is_array($heartbeat) || empty($heartbeat['last_run_at'])) {
            return [
                'status' => 'unknown',
                'command' => 'tijum:expire-reservations',
                'last_run_at' => null,
                'duration_ms' => null,
                'message' => 'Scheduler heartbeat not yet recorded.',
            ];
        }

        $lastRun = CarbonImmutable::parse($heartbeat['last_run_at'], 'Asia/Kolkata');
        $now = CarbonImmutable::now('Asia/Kolkata');
        $minutesAgo = $lastRun->diffInMinutes($now);

        $status = 'healthy';
        $message = "Executed {$minutesAgo} min(s) ago.";
        if ($minutesAgo > 15) {
            $status = 'warning';
            $message = "Scheduler heartbeat delayed ({$minutesAgo} mins ago).";
        }

        return [
            'status' => $status,
            'command' => 'tijum:expire-reservations',
            'last_run_at' => $lastRun->toIso8601String(),
            'duration_ms' => $heartbeat['duration_ms'] ?? null,
            'message' => $message,
        ];
    }

    /**
     * @return array{gateway_mode: string, settlements_enabled: bool, route_enabled: bool}
     */
    public function getProviderHealth(): array
    {
        return [
            'gateway_mode' => (string) config('tijum.payments.razorpay.mode', 'test'),
            'settlements_enabled' => (bool) config('tijum.settlements.enabled', false),
            'route_enabled' => (bool) config('tijum.settlements.route_enabled', false),
        ];
    }
}

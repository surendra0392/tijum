<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Actions\Payments\ProcessWebhookEvent;
use App\Actions\Payments\ReconcilePaymentRefund;
use App\Enums\RefundStatus;
use App\Models\PaymentWebhookEvent;
use App\Models\ReservationRefund;
use Illuminate\Console\Command;
use Illuminate\Database\Eloquent\Builder;
use Throwable;

class ReconcilePaymentRefunds extends Command
{
    protected $signature = 'tijum:reconcile-refunds';

    protected $description = 'Verify outstanding refunds and replay refund webhooks without creating refunds.';

    public function handle(ReconcilePaymentRefund $reconciliation, ProcessWebhookEvent $webhooks): int
    {
        if ($reconciliation->gatewayMode() === null) {
            $this->error('Razorpay refund reconciliation is unavailable in the current mode.');

            return self::FAILURE;
        }

        $unresolved = 0;
        $events = PaymentWebhookEvent::query()->where('gateway', 'razorpay')
            ->whereIn('event_type', ProcessWebhookEvent::REFUND_EVENTS)
            ->whereIn('status', ['received', 'failed', 'unresolved']);

        foreach ($events->lazyById() as $event) {
            try {
                if ($webhooks->replayRefund($event) === 'unresolved') {
                    $unresolved++;
                    $this->warn("Refund webhook {$event->id} awaits a matching provider refund.");
                }
            } catch (Throwable $exception) {
                $unresolved++;
                $this->warn("Refund webhook {$event->id} could not be reconciled.");
                report($exception);
            }
        }

        $refunds = ReservationRefund::query()->where(function (Builder $query): void {
            $query->whereIn('status', [RefundStatus::Uncertain, RefundStatus::Pending, RefundStatus::Processing])
                ->orWhere(fn (Builder $query) => $query->where('status', RefundStatus::Failed)->whereNull('gateway_refund_id'));
        });

        foreach ($refunds->lazyById() as $refund) {
            try {
                $result = $reconciliation->lookup($refund);
                if ($result === null || ! in_array($result->status, [RefundStatus::Processed, RefundStatus::Failed], true)) {
                    $unresolved++;
                    $this->warn("Refund {$refund->id} awaits authoritative provider confirmation.");
                }
            } catch (Throwable $exception) {
                $unresolved++;
                $this->warn("Refund {$refund->id} could not be reconciled.");
                report($exception);
            }
        }

        $this->info("Refund reconciliation finished with {$unresolved} unresolved results.");

        return $unresolved === 0 ? self::SUCCESS : self::FAILURE;
    }
}

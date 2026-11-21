<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Actions\Financial\ReconcilePartnerTransfer;
use App\Actions\Payments\ProcessWebhookEvent;
use App\Enums\ProviderTransferStatus;
use App\Enums\SettlementStatus;
use App\Models\PaymentWebhookEvent;
use App\Models\ProviderTransfer;
use App\Services\Payments\RazorpayRouteService;
use Illuminate\Console\Command;
use Illuminate\Database\Eloquent\Builder;
use Throwable;

class ReconcileRouteTransfers extends Command
{
    protected $signature = 'tijum:reconcile-route-transfers';

    protected $description = 'Recover transfer webhooks and reconcile pending or held Razorpay Route attempts without creating transfers.';

    public function handle(
        RazorpayRouteService $routeService,
        ReconcilePartnerTransfer $reconcileTransfer,
        ProcessWebhookEvent $processWebhook,
    ): int {
        $mode = $routeService->credentialMode();
        if ($mode === null) {
            $this->error('Razorpay Route credentials for this environment are unavailable.');

            return self::FAILURE;
        }

        $attempts = ProviderTransfer::query()->where('gateway', 'razorpay')
            ->where('gateway_mode', $mode)
            ->where(function (Builder $query): void {
                $query->whereIn('status', [ProviderTransferStatus::Uncertain, ProviderTransferStatus::Pending])
                    ->orWhere(function (Builder $query): void {
                        $query->where('status', ProviderTransferStatus::Processed)
                            ->whereHas('settlement', fn (Builder $settlements) => $settlements->where('status', SettlementStatus::OnHold));
                    });
            });

        $unresolved = 0;
        foreach ($attempts->lazyById() as $attempt) {
            try {
                $result = $reconcileTransfer->lookup($attempt);
                if ($result === null || in_array($result->status, [ProviderTransferStatus::Pending, ProviderTransferStatus::Uncertain], true)) {
                    $unresolved++;
                    $this->warn("Transfer {$attempt->transfer_reference} is still awaiting provider confirmation.");
                }
            } catch (Throwable $exception) {
                $unresolved++;
                $this->warn("Transfer {$attempt->transfer_reference} could not be reconciled.");
                report($exception);
            }
        }

        $events = PaymentWebhookEvent::query()->where('gateway', 'razorpay')
            ->whereIn('event_type', ProcessWebhookEvent::ROUTE_TRANSFER_EVENTS)
            ->whereIn('status', ['received', 'failed', 'unresolved']);

        foreach ($events->lazyById() as $event) {
            try {
                if ($processWebhook->replayTransfer($event) === 'unresolved') {
                    $unresolved++;
                    $this->warn("Webhook {$event->event_id} has an unresolved transfer.");
                }
            } catch (Throwable $exception) {
                $unresolved++;
                $this->warn("Webhook {$event->event_id} could not be reprocessed.");
                report($exception);
            }
        }

        $this->info("Razorpay reconciliation completed with {$unresolved} unresolved results.");

        return $unresolved === 0 ? self::SUCCESS : self::FAILURE;
    }
}

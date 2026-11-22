<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Actions\Payments\ProcessWebhookEvent;
use App\Models\PaymentWebhookEvent;
use Illuminate\Console\Command;
use Throwable;

class ReconcilePaymentEvents extends Command
{
    protected $signature = 'tijum:reconcile-payment-events';

    protected $description = 'Replay stored Razorpay payment events without submitting a payment.';

    public function handle(ProcessWebhookEvent $processWebhook): int
    {
        $events = PaymentWebhookEvent::query()
            ->where('gateway', 'razorpay')
            ->whereIn('event_type', ProcessWebhookEvent::PAYMENT_EVENTS)
            ->whereIn('status', ['received', 'failed', 'unresolved']);

        $unresolved = 0;
        foreach ($events->lazyById() as $event) {
            try {
                if ($processWebhook->replayPayment($event) === 'unresolved') {
                    $unresolved++;
                    $this->warn("Payment event {$event->event_id} is still unresolved.");
                }
            } catch (Throwable $exception) {
                $unresolved++;
                $this->warn("Payment event {$event->event_id} could not be replayed.");
                report($exception);
            }
        }

        $this->info("Payment event reconciliation finished with {$unresolved} unresolved events.");

        return $unresolved === 0 ? self::SUCCESS : self::FAILURE;
    }
}

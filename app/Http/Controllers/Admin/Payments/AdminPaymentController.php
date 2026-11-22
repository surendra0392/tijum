<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin\Payments;

use App\Actions\Payments\InitiateAdminRefund;
use App\Enums\PaymentStatus;
use App\Enums\RefundStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\Payments\CreateAdminRefundRequest;
use App\Models\Admin;
use App\Models\ReservationPayment;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class AdminPaymentController extends Controller
{
    public function index(Request $request): Response
    {
        $status = $request->query('status');
        $search = $request->query('search');

        $query = ReservationPayment::query()
            ->with(['reservation.property', 'user'])
            ->latest('id');

        if (is_string($status) && $status !== '' && PaymentStatus::tryFrom($status) !== null) {
            $query->where('status', $status);
        }

        if (is_string($search) && trim($search) !== '') {
            $term = trim($search);
            $query->where(function (Builder $q) use ($term): void {
                $q->where('gateway_order_id', 'like', "%{$term}%")
                    ->orWhere('gateway_payment_id', 'like', "%{$term}%")
                    ->orWhereHas('reservation', function (Builder $rq) use ($term): void {
                        $rq->where('booking_reference', 'like', "%{$term}%");
                    })
                    ->orWhereHas('user', function (Builder $uq) use ($term): void {
                        $uq->where('name', 'like', "%{$term}%")
                            ->orWhere('email', 'like', "%{$term}%");
                    });
            });
        }

        $payments = $query->paginate(15)->withQueryString()->through(fn (ReservationPayment $p): array => [
            'id' => $p->id,
            'gateway' => $p->gateway,
            'gateway_order_id' => $p->gateway_order_id,
            'gateway_payment_id' => $p->gateway_payment_id,
            'amount_minor' => $p->amount_minor,
            'refunded_amount_minor' => $p->refunded_amount_minor,
            'currency_code' => $p->currency,
            'status' => $p->status->value,
            'status_label' => $p->status->label(),
            'payment_method' => $p->payment_method,
            'customer_name' => $p->user?->name,
            'customer_email' => $p->user?->email,
            'booking_reference' => $p->reservation?->booking_reference,
            'property_name' => $p->reservation?->property?->name,
            'captured_at' => $p->captured_at?->toISOString(),
            'created_at' => $p->created_at?->toISOString(),
        ]);

        return Inertia::render('admin/payments/index', [
            'payments' => $payments,
            'filters' => [
                'status' => is_string($status) ? $status : '',
                'search' => is_string($search) ? $search : '',
            ],
            'statusOptions' => collect(PaymentStatus::cases())->map(fn (PaymentStatus $case): array => [
                'value' => $case->value,
                'label' => $case->label(),
            ])->values()->all(),
        ]);
    }

    public function show(ReservationPayment $payment): Response
    {
        $payment->loadMissing([
            'reservation.property.city',
            'reservation.roomType',
            'user',
            'refunds.initiatedByAdmin',
        ]);

        $refundableBalance = $payment->refundableBalanceMinor();
        $hasUnresolvedRefund = $payment->hasUnresolvedRefund();

        return Inertia::render('admin/payments/show', [
            'refund_request_key' => (string) Str::uuid(),
            'payment' => [
                'id' => $payment->id,
                'gateway' => $payment->gateway,
                'gateway_order_id' => $payment->gateway_order_id,
                'gateway_payment_id' => $payment->gateway_payment_id,
                'amount_minor' => $payment->amount_minor,
                'refunded_amount_minor' => $payment->refunded_amount_minor,
                'refundable_balance_minor' => $refundableBalance,
                'currency_code' => $payment->currency,
                'status' => $payment->status->value,
                'status_label' => $payment->status->label(),
                'payment_method' => $payment->payment_method,
                'failure_reason' => $payment->failure_reason,
                'captured_at' => $payment->captured_at?->toISOString(),
                'failed_at' => $payment->failed_at?->toISOString(),
                'created_at' => $payment->created_at?->toISOString(),
                'has_unresolved_refund' => $hasUnresolvedRefund,
                'can_refund' => $refundableBalance > 0 && $payment->isCaptured() && ! $hasUnresolvedRefund,
            ],
            'reservation' => [
                'id' => $payment->reservation->id,
                'booking_reference' => $payment->reservation->booking_reference,
                'status' => $payment->reservation->status->value,
                'status_label' => $payment->reservation->statusLabel(),
                'property_name' => $payment->reservation->property?->name,
                'room_type_name' => $payment->reservation->roomType?->name,
                'check_in_date' => $payment->reservation->check_in_date->toDateString(),
                'checkout_date' => $payment->reservation->checkout_date->toDateString(),
                'total_amount_minor' => $payment->reservation->total_amount_minor,
            ],
            'customer' => [
                'id' => $payment->user?->id,
                'name' => $payment->user?->name,
                'email' => $payment->user?->email,
                'phone' => $payment->user?->phone,
            ],
            'refunds' => $payment->refunds->map(fn ($r): array => [
                'id' => $r->id,
                'gateway_refund_id' => $r->gateway_refund_id,
                'amount_minor' => $r->amount_minor,
                'currency_code' => $r->currency,
                'status' => $r->status->value,
                'status_label' => $r->status->label(),
                'reason' => $r->reason,
                'admin_name' => $r->initiatedByAdmin?->name,
                'processed_at' => $r->gateway_processed_at?->toISOString(),
                'created_at' => $r->created_at?->toISOString(),
            ])->values()->all(),
        ]);
    }

    public function refund(
        CreateAdminRefundRequest $request,
        ReservationPayment $payment,
        InitiateAdminRefund $action,
    ): RedirectResponse {
        $admin = $request->user('admin');
        if (! $admin instanceof Admin) {
            abort(403);
        }

        if (! $admin->hasPermission('bookings.manage') && ! $admin->hasPermission('refunds.manage')) {
            abort(403, 'You do not have permission to process refunds.');
        }

        $validated = $request->validated();
        $amountMinor = (int) $validated['amount_minor'];
        $reason = (string) $validated['reason'];

        $refund = $action->execute($payment, $admin, $amountMinor, $reason, $validated['idempotency_key'] ?? null);

        return back()->with('status', match ($refund->status) {
            RefundStatus::Uncertain => 'Razorpay has not confirmed this refund. Reconcile the existing refund before trying again.',
            RefundStatus::Failed => 'Razorpay reported that the refund failed.',
            RefundStatus::Processed => 'Razorpay confirmed that the refund was processed.',
            default => 'Razorpay is processing the refund.',
        });
    }
}

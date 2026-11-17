<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin\Notifications;

use App\Enums\NotificationChannel;
use App\Enums\NotificationDeliveryStatus;
use App\Http\Controllers\Controller;
use App\Jobs\SendNotificationDeliveryJob;
use App\Models\Admin;
use App\Models\NotificationDelivery;
use Carbon\CarbonImmutable;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AdminNotificationController extends Controller
{
    public function index(Request $request): Response
    {
        /** @var Admin $admin */
        $admin = $request->user('admin');
        abort_unless($admin instanceof Admin, 403);

        $channelFilter = (string) $request->query('channel', '');
        $statusFilter = (string) $request->query('status', '');
        $templateFilter = (string) $request->query('template_code', '');
        $search = trim((string) $request->query('search', ''));
        $dateFrom = (string) $request->query('date_from', '');
        $dateTo = (string) $request->query('date_to', '');

        $query = NotificationDelivery::query()->latest('id');

        if ($channelFilter !== '' && NotificationChannel::tryFrom($channelFilter) !== null) {
            $query->where('channel', $channelFilter);
        }

        if ($statusFilter !== '' && NotificationDeliveryStatus::tryFrom($statusFilter) !== null) {
            $query->where('status', $statusFilter);
        }

        if ($templateFilter !== '') {
            $query->where('template_code', $templateFilter);
        }

        if ($search !== '') {
            $query->where(function ($q) use ($search): void {
                $q->where('recipient_destination', 'like', "%{$search}%")
                    ->orWhere('related_reference', 'like', "%{$search}%")
                    ->orWhere('idempotency_key', 'like', "%{$search}%")
                    ->orWhere('event_id', 'like', "%{$search}%")
                    ->orWhere('provider_message_id', 'like', "%{$search}%");
            });
        }

        if ($dateFrom !== '') {
            $query->where('created_at', '>=', CarbonImmutable::parse($dateFrom)->startOfDay());
        }

        if ($dateTo !== '') {
            $query->where('created_at', '<=', CarbonImmutable::parse($dateTo)->endOfDay());
        }

        // Summary metrics
        $totalCount = NotificationDelivery::query()->count();
        $deliveredCount = NotificationDelivery::query()->whereIn('status', [
            NotificationDeliveryStatus::Delivered->value,
            NotificationDeliveryStatus::Read->value,
        ])->count();
        $failedCount = NotificationDelivery::query()->where('status', NotificationDeliveryStatus::Failed->value)->count();
        $pendingCount = NotificationDelivery::query()->whereIn('status', [
            NotificationDeliveryStatus::Queued->value,
            NotificationDeliveryStatus::Sending->value,
            NotificationDeliveryStatus::Retrying->value,
        ])->count();

        $deliveries = $query->paginate(20)->withQueryString()->through(fn (NotificationDelivery $d): array => [
            'id' => $d->id,
            'event_id' => $d->event_id,
            'idempotency_key' => $d->idempotency_key,
            'notifiable_type' => class_basename($d->notifiable_type),
            'notifiable_id' => $d->notifiable_id,
            'channel' => $d->channel->value,
            'category' => $d->category->value,
            'template_code' => $d->template_code,
            'recipient_destination' => $d->maskedDestination(),
            'status' => $d->status->value,
            'provider' => $d->provider ?? '—',
            'attempts' => $d->attempts,
            'subject' => $d->subject,
            'error_code' => $d->error_code,
            'error_description' => $d->error_description,
            'related_reference' => $d->related_reference,
            'submitted_at' => $d->submitted_at?->toISOString(),
            'delivered_at' => $d->delivered_at?->toISOString(),
            'failed_at' => $d->failed_at?->toISOString(),
            'created_at' => $d->created_at?->toISOString(),
            'created_at_human' => $d->created_at?->diffForHumans(),
        ]);

        return Inertia::render('admin/notifications/index', [
            'deliveries' => $deliveries,
            'metrics' => [
                'total' => $totalCount,
                'delivered' => $deliveredCount,
                'failed' => $failedCount,
                'pending' => $pendingCount,
                'delivery_rate' => $totalCount > 0 ? round(($deliveredCount / $totalCount) * 100, 1) : 0,
            ],
            'filters' => [
                'channel' => $channelFilter,
                'status' => $statusFilter,
                'template_code' => $templateFilter,
                'search' => $search,
                'date_from' => $dateFrom,
                'date_to' => $dateTo,
            ],
            'channels' => array_map(fn ($case) => ['value' => $case->value, 'label' => $case->name], NotificationChannel::cases()),
            'statuses' => array_map(fn ($case) => ['value' => $case->value, 'label' => $case->name], NotificationDeliveryStatus::cases()),
        ]);
    }

    public function show(Request $request, NotificationDelivery $delivery): Response
    {
        /** @var Admin $admin */
        $admin = $request->user('admin');
        abort_unless($admin instanceof Admin, 403);

        $notifiable = $delivery->notifiable;
        $recipientName = $notifiable?->name ?? 'Unknown';
        $safePayload = $delivery->payload ?? [];
        foreach (['otp_code', 'password', 'secret', 'token'] as $sensitiveKey) {
            if (array_key_exists($sensitiveKey, $safePayload)) {
                $safePayload[$sensitiveKey] = '********';
            }
        }

        return Inertia::render('admin/notifications/show', [
            'delivery' => [
                'id' => $delivery->id,
                'event_id' => $delivery->event_id,
                'idempotency_key' => $delivery->idempotency_key,
                'notifiable_type' => class_basename($delivery->notifiable_type),
                'notifiable_id' => $delivery->notifiable_id,
                'recipient_name' => $recipientName,
                'recipient_destination' => $delivery->maskedDestination(),
                'channel' => $delivery->channel->value,
                'category' => $delivery->category->value,
                'template_code' => $delivery->template_code,
                'template_version' => $delivery->template_version,
                'status' => $delivery->status->value,
                'provider' => $delivery->provider,
                'provider_message_id' => $delivery->provider_message_id,
                'attempts' => $delivery->attempts,
                'subject' => $delivery->subject,
                'payload' => $safePayload,
                'error_code' => $delivery->error_code,
                'error_description' => $delivery->error_description,
                'related_type' => $delivery->related_type ? class_basename($delivery->related_type) : null,
                'related_id' => $delivery->related_id,
                'related_reference' => $delivery->related_reference,
                'submitted_at' => $delivery->submitted_at?->toISOString(),
                'delivered_at' => $delivery->delivered_at?->toISOString(),
                'read_at' => $delivery->read_at?->toISOString(),
                'failed_at' => $delivery->failed_at?->toISOString(),
                'created_at' => $delivery->created_at?->toISOString(),
            ],
        ]);
    }

    public function retry(Request $request, NotificationDelivery $delivery): RedirectResponse
    {
        /** @var Admin $admin */
        $admin = $request->user('admin');
        abort_unless($admin instanceof Admin, 403);

        if (! in_array($delivery->status, [NotificationDeliveryStatus::Failed, NotificationDeliveryStatus::Suppressed], true)) {
            return back()->with('error', 'Only failed or suppressed notification deliveries can be retried.');
        }

        $delivery->update([
            'status' => NotificationDeliveryStatus::Queued,
            'attempts' => $delivery->attempts + 1,
            'error_code' => null,
            'error_description' => null,
            'failed_at' => null,
        ]);

        SendNotificationDeliveryJob::dispatch($delivery);

        return back()->with('success', "Notification delivery #{$delivery->id} has been queued for immediate retry.");
    }
}

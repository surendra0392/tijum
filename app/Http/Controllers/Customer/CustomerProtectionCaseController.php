<?php

declare(strict_types=1);

namespace App\Http\Controllers\Customer;

use App\Actions\Protection\AddCaseMessage;
use App\Actions\Protection\CreateProtectionCase;
use App\Http\Controllers\Controller;
use App\Http\Requests\Protection\AddCaseMessageRequest;
use App\Http\Requests\Protection\ReportProblemRequest;
use App\Models\CustomerProtectionCase;
use App\Models\CustomerProtectionCaseMessage;
use App\Models\PlatformSetting;
use App\Models\Reservation;
use App\Models\User;
use App\Services\ReservationData;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class CustomerProtectionCaseController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();
        abort_unless($user instanceof User, 401);

        $cases = CustomerProtectionCase::query()
            ->where('user_id', $user->id)
            ->with(['reservation.property', 'property.city'])
            ->latest('id')
            ->paginate(15)
            ->through(fn (CustomerProtectionCase $case): array => [
                'id' => $case->id,
                'case_reference' => $case->case_reference,
                'booking_reference' => $case->reservation->booking_reference,
                'property_name' => $case->property->name,
                'city_name' => $case->property->city?->name,
                'category' => $case->category->value,
                'category_label' => $case->category->label(),
                'status' => $case->status->value,
                'status_label' => $case->status->label(),
                'priority' => $case->priority->value,
                'description' => $case->description,
                'sla_due_at' => $case->sla_due_at?->toISOString(),
                'resolved_at' => $case->resolved_at?->toISOString(),
                'created_at' => $case->created_at->toISOString(),
            ]);

        return Inertia::render('support/index', [
            'cases' => $cases,
            'grievanceOfficer' => PlatformSetting::getGrievanceOfficer(),
        ]);
    }

    public function show(Request $request, CustomerProtectionCase $case, ReservationData $reservationData): Response
    {
        $user = $request->user();
        abort_unless($user instanceof User, 401);
        abort_if($case->user_id !== $user->id, 403);

        $case->loadMissing([
            'reservation.property.city',
            'reservation.roomType',
            'reservation.payments',
            'reservation.refunds',
            'messages',
            'relocations.destinationProperty.city',
            'relocations.destinationRoomType',
        ]);

        $publicMessages = $case->messages
            ->where('is_internal_note', false)
            ->map(fn ($msg): array => [
                'id' => $msg->id,
                'sender_type' => $msg->sender_type,
                'sender_name' => $msg->sender_name,
                'message' => $msg->message,
                'attachment_path' => $msg->attachment_path
                    ? route('support.cases.messages.attachment', ['case' => $case->case_reference, 'message' => $msg->id])
                    : null,
                'attachment_name' => $msg->attachment_name,
                'created_at' => $msg->created_at->toISOString(),
            ])
            ->values()
            ->all();

        $activeRelocations = $case->relocations
            ->map(fn ($r): array => [
                'id' => $r->id,
                'status' => $r->status->value,
                'status_label' => $r->status->label(),
                'destination_property_name' => $r->destinationProperty->name,
                'destination_locality' => $r->destinationProperty->locality,
                'destination_city_name' => $r->destinationProperty->city?->name,
                'destination_room_type_name' => $r->destinationRoomType->name,
                'destination_is_air_conditioned' => (bool) $r->destinationRoomType->is_air_conditioned,
                'destination_food_provided' => (bool) $r->destinationProperty->food_provided,
                'destination_breakfast_included' => (bool) $r->destinationProperty->breakfast_included,
                'destination_lunch_included' => (bool) $r->destinationProperty->lunch_included,
                'destination_dinner_included' => (bool) $r->destinationProperty->dinner_included,
                'original_amount_minor' => $r->original_amount_minor,
                'alternative_amount_minor' => $r->alternative_amount_minor,
                'price_difference_minor' => $r->price_difference_minor,
                'refund_due_to_customer_minor' => max(0, $r->price_difference_minor),
                'customer_additional_cost_minor' => 0,
                'offer_expires_at' => $r->offer_expires_at->toISOString(),
                'is_expired' => $r->isExpired(),
            ])
            ->values()
            ->all();

        return Inertia::render('support/show', [
            'case' => [
                'id' => $case->id,
                'case_reference' => $case->case_reference,
                'category' => $case->category->value,
                'category_label' => $case->category->label(),
                'status' => $case->status->value,
                'status_label' => $case->status->label(),
                'priority' => $case->priority->value,
                'description' => $case->description,
                'acknowledged_at' => $case->acknowledged_at?->toISOString(),
                'sla_due_at' => $case->sla_due_at?->toISOString(),
                'resolved_at' => $case->resolved_at?->toISOString(),
                'resolution_type' => $case->resolution_type,
                'resolution_summary' => $case->resolution_summary,
                'created_at' => $case->created_at->toISOString(),
            ],
            'reservation' => $reservationData->detail($case->reservation, 'customer'),
            'messages' => $publicMessages,
            'relocations' => $activeRelocations,
            'grievanceOfficer' => PlatformSetting::getGrievanceOfficer(),
        ]);
    }

    public function store(
        ReportProblemRequest $request,
        Reservation $reservation,
        CreateProtectionCase $action,
    ): RedirectResponse {
        $user = $request->user();
        abort_unless($user instanceof User, 401);

        $case = $action->execute($reservation, $user, $request->validated());

        return redirect()
            ->route('support.cases.show', $case->case_reference)
            ->with('status', "Support ticket {$case->case_reference} submitted successfully. Our team has received your report.");
    }

    public function storeMessage(
        AddCaseMessageRequest $request,
        CustomerProtectionCase $case,
        AddCaseMessage $action,
    ): RedirectResponse {
        $user = $request->user();
        abort_unless($user instanceof User, 401);

        $action->execute($case, $user, $request->validated());

        return back()->with('status', 'Your message has been sent to TIJUM Support.');
    }

    public function downloadAttachment(
        Request $request,
        CustomerProtectionCase $case,
        CustomerProtectionCaseMessage $message,
    ): StreamedResponse {
        $user = $request->user();
        abort_unless($user instanceof User, 401);
        abort_if($case->user_id !== $user->id, 403);
        abort_if($message->customer_protection_case_id !== $case->id || $message->is_internal_note, 404);
        abort_if(! is_string($message->attachment_path) || $message->attachment_path === '', 404);

        $diskName = (string) config('tijum.customer_protection.attachments.disk', 'local');
        $disk = Storage::disk($diskName);
        abort_unless($disk->exists($message->attachment_path), 404);

        return $disk->download(
            $message->attachment_path,
            $message->attachment_name ?: basename($message->attachment_path),
        );
    }

    public function acknowledgement(Request $request, CustomerProtectionCase $case): Response
    {
        $user = $request->user();
        abort_unless($user instanceof User, 401);
        abort_if($case->user_id !== $user->id, 403);

        $case->loadMissing(['reservation.property.city', 'user']);

        return Inertia::render('support/acknowledgement', [
            'case' => [
                'id' => $case->id,
                'case_reference' => $case->case_reference,
                'category_label' => $case->category->label(),
                'description' => $case->description,
                'status_label' => $case->status->label(),
                'created_at' => $case->created_at->toIso8601String(),
                'acknowledged_at' => ($case->acknowledged_at ?? $case->created_at)->toIso8601String(),
                'sla_due_at' => $case->sla_due_at?->toIso8601String(),
                'customer_name' => $case->user->name,
                'customer_email' => $case->user->email,
                'booking_reference' => $case->reservation->booking_reference,
                'property_name' => $case->reservation->snapshot_property_name ?? $case->property->name,
                'city_name' => $case->property->city?->name,
            ],
            'grievanceOfficer' => PlatformSetting::getGrievanceOfficer(),
        ]);
    }
}

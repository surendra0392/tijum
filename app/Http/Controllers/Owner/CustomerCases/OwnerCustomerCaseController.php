<?php

declare(strict_types=1);

namespace App\Http\Controllers\Owner\CustomerCases;

use App\Actions\Protection\AddCaseMessage;
use App\Http\Controllers\Controller;
use App\Http\Requests\Protection\AddCaseMessageRequest;
use App\Models\CustomerProtectionCase;
use App\Models\Owner;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class OwnerCustomerCaseController extends Controller
{
    public function index(Request $request): Response
    {
        $owner = $request->user('owner');
        abort_unless($owner instanceof Owner, 401);

        $cases = CustomerProtectionCase::query()
            ->where('owner_id', $owner->id)
            ->with(['reservation.roomType', 'property.city'])
            ->latest('id')
            ->paginate(15)
            ->through(fn (CustomerProtectionCase $case): array => [
                'id' => $case->id,
                'case_reference' => $case->case_reference,
                'booking_reference' => $case->reservation->booking_reference,
                'property_name' => $case->property->name,
                'room_type_name' => $case->reservation->snapshot_room_type_name ?? $case->reservation->roomType?->name,
                'category' => $case->category->value,
                'category_label' => $case->category->label(),
                'status' => $case->status->value,
                'status_label' => $case->status->label(),
                'priority' => $case->priority->value,
                'description' => $case->description,
                'created_at' => $case->created_at->toISOString(),
            ]);

        return Inertia::render('owner/cases/index', [
            'cases' => $cases,
        ]);
    }

    public function show(Request $request, CustomerProtectionCase $case): Response
    {
        $owner = $request->user('owner');
        abort_unless($owner instanceof Owner, 401);
        abort_if($case->owner_id !== $owner->id, 403);

        $case->loadMissing([
            'reservation.property.city',
            'reservation.roomType',
            'messages',
        ]);

        $messages = $case->messages
            ->where('is_internal_note', false)
            ->map(fn ($msg): array => [
                'id' => $msg->id,
                'sender_type' => $msg->sender_type,
                'sender_name' => $msg->sender_name,
                'message' => $msg->message,
                'attachment_path' => $msg->attachment_path,
                'attachment_name' => $msg->attachment_name,
                'created_at' => $msg->created_at->toISOString(),
            ])
            ->values()
            ->all();

        return Inertia::render('owner/cases/show', [
            'case' => [
                'id' => $case->id,
                'case_reference' => $case->case_reference,
                'category_label' => $case->category->label(),
                'status' => $case->status->value,
                'status_label' => $case->status->label(),
                'priority' => $case->priority->value,
                'description' => $case->description,
                'created_at' => $case->created_at->toISOString(),
            ],
            'reservation' => [
                'id' => $case->reservation->id,
                'booking_reference' => $case->reservation->booking_reference,
                'property_name' => $case->property->name,
                'room_type_name' => $case->reservation->snapshot_room_type_name ?? $case->reservation->roomType?->name,
                'check_in_date' => $case->reservation->check_in_date->toDateString(),
                'checkout_date' => $case->reservation->checkout_date->toDateString(),
                'quantity' => $case->reservation->quantity,
                'status_label' => $case->reservation->statusLabel(),
            ],
            'messages' => $messages,
        ]);
    }

    public function storeMessage(
        AddCaseMessageRequest $request,
        CustomerProtectionCase $case,
        AddCaseMessage $action,
    ): RedirectResponse {
        $owner = $request->user('owner');
        abort_unless($owner instanceof Owner, 401);
        abort_if($case->owner_id !== $owner->id, 403);

        $action->execute($case, $owner, $request->validated());

        return back()->with('status', 'Your response has been sent to TIJUM operations.');
    }
}

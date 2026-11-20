<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Customer;

use App\Actions\Protection\AddCaseMessage;
use App\Enums\CaseCategory;
use App\Enums\CasePriority;
use App\Enums\CaseStatus;
use App\Http\Controllers\Api\V1\ApiController;
use App\Models\CustomerProtectionCase;
use App\Models\Reservation;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class CustomerProtectionController extends ApiController
{
    public function index(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $cases = CustomerProtectionCase::query()
            ->where('user_id', $user->id)
            ->with(['reservation', 'property'])
            ->latest('created_at')
            ->paginate(10);

        return $this->success(
            $cases->items(),
            'Customer protection cases retrieved',
            200,
            [
                'current_page' => $cases->currentPage(),
                'last_page' => $cases->lastPage(),
                'total' => $cases->total(),
            ]
        );
    }

    public function show(Request $request, string $reference): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $case = CustomerProtectionCase::query()
            ->where('case_reference', $reference)
            ->where('user_id', $user->id)
            ->with(['reservation', 'property', 'messages'])
            ->first();

        if ($case === null) {
            return $this->error("Case '{$reference}' not found.", 'CASE_NOT_FOUND', 404);
        }

        return $this->success([
            'id' => $case->id,
            'case_reference' => $case->case_reference,
            'category' => $case->category->value,
            'status' => $case->status->value,
            'priority' => $case->priority->value,
            'property_name' => $case->property->name,
            'booking_reference' => $case->reservation->booking_reference,
            'description' => $case->description,
            'resolution_summary' => $case->resolution_summary,
            'sla_due_at' => $case->sla_due_at?->toIso8601String(),
            'created_at' => $case->created_at->toIso8601String(),
            'messages' => $case->messages->map(fn ($m) => [
                'id' => $m->id,
                'sender_type' => $m->sender_type,
                'sender_name' => $m->sender_name,
                'message' => $m->message,
                'created_at' => $m->created_at->toIso8601String(),
            ]),
        ]);
    }

    public function addMessage(
        Request $request,
        string $reference,
        AddCaseMessage $action,
    ): JsonResponse {
        /** @var User $user */
        $user = $request->user();

        $case = CustomerProtectionCase::query()
            ->where('case_reference', $reference)
            ->where('user_id', $user->id)
            ->first();

        if ($case === null) {
            return $this->error("Support case '{$reference}' not found.", 'CASE_NOT_FOUND', 404);
        }

        $validated = $request->validate([
            'message' => ['required', 'string', 'max:3000'],
            'attachment' => ['nullable', 'file', 'max:10240'],
        ]);

        try {
            $msg = $action->execute($case, $user, [
                'message' => $validated['message'],
                'attachment' => $request->file('attachment'),
            ]);
        } catch (ValidationException $e) {
            return $this->error($e->getMessage(), 'VALIDATION_ERROR', 422, $e->errors());
        }

        return $this->success([
            'id' => $msg->id,
            'sender_type' => $msg->sender_type,
            'sender_name' => $msg->sender_name,
            'message' => $msg->message,
            'created_at' => $msg->created_at->toIso8601String(),
        ], 'Response submitted successfully.', 201);
    }

    public function store(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $validated = $request->validate([
            'booking_reference' => ['required', 'string'],
            'category' => ['required', 'string'],
            'description' => ['required', 'string', 'min:20', 'max:3000'],
        ]);

        $reservation = Reservation::query()
            ->where('booking_reference', $validated['booking_reference'])
            ->where('user_id', $user->id)
            ->with(['property'])
            ->first();

        if ($reservation === null) {
            return $this->error('The specified reservation does not exist.', 'RESERVATION_NOT_FOUND', 404);
        }

        $category = CaseCategory::tryFrom($validated['category']) ?? CaseCategory::FoodNotProvided;
        $caseReference = 'CASE-'.strtoupper(Str::random(8));

        $case = CustomerProtectionCase::query()->create([
            'case_reference' => $caseReference,
            'reservation_id' => $reservation->id,
            'user_id' => $user->id,
            'property_id' => $reservation->property_id,
            'owner_id' => $reservation->property->owner_id,
            'category' => $category,
            'status' => CaseStatus::Open,
            'priority' => CasePriority::Standard,
            'description' => $validated['description'],
        ]);

        return $this->success([
            'case_reference' => $case->case_reference,
            'status' => $case->status->value,
            'category' => $case->category->value,
        ], 'Customer protection case submitted. Our operations team will respond promptly.', 201);
    }
}

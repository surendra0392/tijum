<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Owner;

use App\Http\Controllers\Api\V1\ApiController;
use App\Models\MobileDevice;
use App\Models\Owner;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OwnerDeviceController extends ApiController
{
    public function register(Request $request): JsonResponse
    {
        /** @var Owner $owner */
        $owner = $request->user();

        $validated = $request->validate([
            'device_installation_id' => ['required', 'string', 'max:255'],
            'push_token' => ['nullable', 'string', 'max:500'],
            'platform' => ['required', 'string', 'in:android,ios'],
            'app_version' => ['nullable', 'string', 'max:50'],
            'device_name' => ['nullable', 'string', 'max:100'],
        ]);

        $pushToken = $validated['push_token'] ?? null;
        $pushTokenHash = $pushToken ? hash('sha256', $pushToken) : null;

        $device = MobileDevice::query()->updateOrCreate(
            [
                'device_installation_id' => $validated['device_installation_id'],
                'notifiable_type' => $owner->getMorphClass(),
                'notifiable_id' => $owner->id,
            ],
            [
                'platform' => $validated['platform'],
                'push_token' => $pushToken,
                'push_token_hash' => $pushTokenHash,
                'app_version' => $validated['app_version'] ?? null,
                'device_name' => $validated['device_name'] ?? null,
                'is_active' => true,
                'last_used_at' => now(),
                'revoked_at' => null,
            ]
        );

        return $this->success([
            'id' => $device->id,
            'device_installation_id' => $device->device_installation_id,
            'platform' => $device->platform,
            'is_active' => $device->is_active,
        ], 'Partner device registered successfully.');
    }

    public function unregister(Request $request): JsonResponse
    {
        /** @var Owner $owner */
        $owner = $request->user();

        $validated = $request->validate([
            'device_installation_id' => ['required', 'string'],
        ]);

        MobileDevice::query()
            ->where('device_installation_id', $validated['device_installation_id'])
            ->where('notifiable_type', $owner->getMorphClass())
            ->where('notifiable_id', $owner->id)
            ->update([
                'is_active' => false,
                'revoked_at' => now(),
            ]);

        return $this->success(null, 'Partner device unregistered successfully.');
    }
}

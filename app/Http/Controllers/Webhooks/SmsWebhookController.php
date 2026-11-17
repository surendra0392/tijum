<?php

declare(strict_types=1);

namespace App\Http\Controllers\Webhooks;

use App\Http\Controllers\Controller;
use App\Services\Notifications\WebhookProcessingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SmsWebhookController extends Controller
{
    public function __construct(
        private readonly WebhookProcessingService $webhookService
    ) {}

    public function __invoke(Request $request): JsonResponse
    {
        return $this->handle($request);
    }

    public function handle(Request $request): JsonResponse
    {
        $webhookSecret = (string) (config('services.sms.webhook_secret') ?: config('tijum.notifications.channels.sms.webhook_secret', ''));

        if ($webhookSecret === '' && ! app()->environment(['local', 'testing'])) {
            return response()->json(['success' => false, 'message' => 'Webhook verification is not configured.'], 503);
        }

        if ($webhookSecret !== '') {
            $secretHeader = $request->header('X-Webhook-Secret');
            $signatureHeader = $request->header('X-Webhook-Signature') ?? $request->header('X-MSG91-Signature');

            $isValidSecret = $secretHeader !== null && hash_equals($webhookSecret, $secretHeader);
            $isValidSignature = false;

            if (! $isValidSecret && $signatureHeader !== null && $signatureHeader !== '') {
                $providedSignature = str_starts_with($signatureHeader, 'sha256=')
                    ? substr($signatureHeader, 7)
                    : $signatureHeader;
                $expectedSignature = hash_hmac('sha256', $request->getContent(), $webhookSecret);
                $isValidSignature = hash_equals(strtolower($expectedSignature), strtolower($providedSignature));
            }

            if (! $isValidSecret && ! $isValidSignature) {
                return response()->json(['success' => false, 'message' => 'Invalid or missing webhook signature.'], 401);
            }
        }

        $result = $this->webhookService->processSmsWebhook(
            $request->all(),
            $request->getContent(),
            $request->header('X-Webhook-Signature') ?? $request->header('X-MSG91-Signature'),
            $request->header('X-Webhook-Secret'),
        );

        if (! $result['success']) {
            $status = str_contains($result['message'] ?? '', 'signature') ? 401 : 400;

            return response()->json($result, $status);
        }

        return response()->json($result);
    }
}

<?php

declare(strict_types=1);

namespace App\Http\Controllers\Webhooks;

use App\Http\Controllers\Controller;
use App\Services\Notifications\WebhookProcessingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class WhatsAppWebhookController extends Controller
{
    public function __construct(
        private readonly WebhookProcessingService $webhookService
    ) {}

    /**
     * Handle Meta Webhook verification challenge (GET).
     */
    public function verify(Request $request): Response|JsonResponse
    {
        $mode = $request->query('hub_mode');
        $token = $request->query('hub_verify_token');
        $challenge = $request->query('hub_challenge');

        $configuredToken = (string) config('tijum.notifications.channels.whatsapp.webhook_verify_token', '');

        if ($mode === 'subscribe' && $token !== '' && $configuredToken !== '' && hash_equals($configuredToken, (string) $token)) {
            return response((string) $challenge, 200, ['Content-Type' => 'text/plain']);
        }

        return response()->json(['error' => 'Forbidden'], 403);
    }

    /**
     * Handle incoming Meta status updates and messages (POST).
     */
    public function handle(Request $request): JsonResponse
    {
        $appSecret = (string) (config('tijum.notifications.channels.whatsapp.app_secret') ?: config('services.whatsapp.webhook_secret', ''));
        $signature = $request->header('X-Hub-Signature-256');

        if ($appSecret !== '' && ($signature === null || trim($signature) === '')) {
            return response()->json(['error' => 'Missing X-Hub-Signature-256 header'], 401);
        }

        $rawContent = $request->getContent();
        $payload = $request->all();

        $result = $this->webhookService->processWhatsAppWebhook($payload, $rawContent, $signature);

        if (! $result['success']) {
            $status = str_contains($result['message'] ?? '', 'signature') ? 401 : 400;

            return response()->json($result, $status);
        }

        return response()->json(['status' => 'success']);
    }
}

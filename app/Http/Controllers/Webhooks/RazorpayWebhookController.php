<?php

declare(strict_types=1);

namespace App\Http\Controllers\Webhooks;

use App\Actions\Payments\ProcessWebhookEvent;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;

class RazorpayWebhookController extends Controller
{
    public function __invoke(Request $request, ProcessWebhookEvent $action): JsonResponse
    {
        $rawPayload = (string) $request->getContent();
        $signature = (string) $request->header('X-Razorpay-Signature', '');

        if ($rawPayload === '' || $signature === '') {
            throw new BadRequestHttpException('Missing webhook signature or payload.');
        }

        try {
            $eventId = $request->header('X-Razorpay-Event-Id');
            $result = $action->execute($rawPayload, $signature, eventId: is_string($eventId) && strlen($eventId) <= 120 ? $eventId : null);
        } catch (\RuntimeException $e) {
            throw new BadRequestHttpException($e->getMessage());
        }

        return response()->json([
            'status' => 'ok',
            'event_id' => $result['event_id'],
        ]);
    }
}

<?php

declare(strict_types=1);

namespace App\Http\Resources\Api\V1;

use App\Models\NotificationDelivery;
use App\Services\Notifications\Templates\NotificationTemplateRegistry;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin NotificationDelivery
 */
class NotificationDeliveryResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $registry = app(NotificationTemplateRegistry::class);
        $template = $registry->get($this->template_code);
        $rendered = $template ? $template->render($this->payload ?? []) : [
            'title' => $this->subject ?? 'TIJUM Notification',
            'body' => (string) ($this->payload['body'] ?? ''),
        ];

        return [
            'id' => $this->id,
            'event_id' => $this->event_id,
            'category' => $this->category->value,
            'channel' => $this->channel->value,
            'template_code' => $this->template_code,
            'title' => $rendered['title'],
            'body' => $rendered['body'],
            'action_url' => $this->payload['action_url'] ?? null,
            'is_read' => $this->read_at !== null,
            'read_at' => $this->read_at?->toIso8601String(),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}

<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin\Notifications;

use App\Http\Controllers\Controller;
use App\Models\Admin;
use App\Services\Notifications\NotificationEventCatalogue;
use App\Services\Notifications\Templates\NotificationTemplateRegistry;
use App\Services\Notifications\Templates\TemplateDefinition;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AdminNotificationTemplateController extends Controller
{
    public function index(
        Request $request,
        NotificationEventCatalogue $catalogue,
        NotificationTemplateRegistry $registry
    ): Response {
        /** @var Admin $admin */
        $admin = $request->user('admin');
        abort_unless($admin instanceof Admin, 403);

        $events = $catalogue->all();
        $templates = $registry->all();

        $templatesFormatted = array_map(static fn (TemplateDefinition $t): array => [
            'code' => $t->code,
            'event_type' => $t->eventType,
            'channel' => $t->channel->value,
            'category' => $t->category->value,
            'title' => $t->title,
            'subject_template' => $t->subjectTemplate,
            'body_template' => $t->bodyTemplate,
            'dlt_template_id' => $t->dltTemplateId,
            'meta_template_name' => $t->metaTemplateName,
            'meta_category' => $t->metaCategory,
            'approved_variables' => $t->approvedVariables,
            'version' => $t->version,
            'is_active' => $t->isActive,
        ], array_values($templates));

        $eventsFormatted = [];
        foreach ($events as $key => $event) {
            $eventsFormatted[] = [
                'event_type' => $key,
                'name' => $event['name'],
                'recipient_role' => $event['recipient_role'],
                'category' => $event['category']->value,
                'channels' => array_map(fn ($c) => $c->value, $event['channels']),
                'description' => $event['description'],
                'requires_consent' => $event['requires_consent'],
            ];
        }

        return Inertia::render('admin/notifications/templates', [
            'events' => $eventsFormatted,
            'templates' => $templatesFormatted,
        ]);
    }

    public function preview(Request $request, NotificationTemplateRegistry $registry): JsonResponse
    {
        /** @var Admin $admin */
        $admin = $request->user('admin');
        abort_unless($admin instanceof Admin, 403);

        $code = (string) $request->input('code', '');
        $template = $registry->get($code);

        if ($template === null) {
            return response()->json(['error' => 'Template not found'], 404);
        }

        $sampleVars = [
            'customer_name' => 'Rahul Sharma',
            'partner_name' => 'Sita Ram',
            'property_name' => 'Sri Sai Nilayam Homestay',
            'room_type' => 'Standard Deluxe Double',
            'reservation_code' => 'TIJ-HYD-7829',
            'check_in_date' => '15 Nov 2026',
            'check_out_date' => '20 Nov 2026',
            'total_price' => '₹4,500.00',
            'payment_deadline' => '15 minutes',
            'settlement_reference' => 'SET-202611-00042',
            'amount' => '₹3,825.00',
            'refund_amount' => '₹4,500.00',
            'failure_reason' => 'Bank authorization timeout',
            'case_reference' => 'TPC-2026-90XJ7',
            'category' => 'food_inclusion_missing',
            'escalation_type' => 'food_quality_complaint',
            'reason' => 'Room unavailable due to maintenance',
            'action_url' => 'https://tijum.com/reservations/TIJ-HYD-7829',
        ];

        $rendered = $template->render($sampleVars);

        return response()->json([
            'code' => $template->code,
            'channel' => $template->channel->value,
            'title' => $rendered['title'],
            'subject' => $rendered['subject'],
            'body' => $rendered['body'],
            'variables' => $template->approvedVariables,
            'dlt_template_id' => $template->dltTemplateId,
            'meta_template_name' => $template->metaTemplateName,
        ]);
    }
}

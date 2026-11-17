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
            'owner_name' => 'Sita Ram',
            'partner_name' => 'Sita Ram',
            'property_name' => 'Sri Sai Nilayam Homestay',
            'property_address' => '14-2-88 Temple Street, Tirupati, Andhra Pradesh',
            'room_type' => 'Standard Deluxe Double',
            'booking_reference' => 'TIJ-HYD-7829',
            'reservation_code' => 'TIJ-HYD-7829',
            'check_in_date' => '15 Nov 2026',
            'checkout_date' => '20 Nov 2026',
            'check_out_date' => '20 Nov 2026',
            'check_in_time' => '09:00 IST',
            'checkout_time' => '08:00 IST',
            'guest_count' => '2',
            'amount' => '₹4,500.00',
            'total_price' => '₹4,500.00',
            'payment_deadline' => '15 minutes',
            'payment_reference' => 'pay_Px92LmN8Qp4Z',
            'payment_method' => 'UPI / Razorpay',
            'captured_at' => '12 Nov 2026, 14:22 IST',
            'expired_at' => '12 Nov 2026, 14:37 IST',
            'cancelled_at' => '13 Nov 2026, 09:10 IST',
            'cancellation_reason' => 'Travel schedule changed',
            'inventory_release_status' => 'Room inventory released',
            'refund_status' => 'Processing',
            'refund_reference' => 'rfnd_Qx81KpM2Zr7W',
            'refund_amount' => '₹4,500.00',
            'initiated_at' => '13 Nov 2026, 09:12 IST',
            'completed_at' => '14 Nov 2026, 11:05 IST',
            'settlement_reference' => 'SET-202611-00042',
            'transfer_reference' => 'trf_Rz55MnL9Xp3T',
            'period_start' => '01 Nov 2026',
            'period_end' => '07 Nov 2026',
            'failure_reason' => 'Bank authorization timeout',
            'contact_information' => 'Sita Ram (+91 98480 12345)',
            'case_reference' => 'TPC-2026-90XJ7',
            'case_status' => 'Under Investigation',
            'category' => 'food_inclusion_missing',
            'escalation_type' => 'food_quality_complaint',
            'escalation_status' => 'Escalated to Priority Desk',
            'expected_response_time' => 'Within 24 hours',
            'resolution_summary' => 'Verified with host and issued partial refund.',
            'resolved_at' => '16 Nov 2026, 16:40 IST',
            'ticket_reference' => 'TKT-2026-00419',
            'subject' => 'Early check-in clarification',
            'ticket_status' => 'In Progress',
            'latest_update' => 'We have coordinated your 07:30 IST arrival request with the host.',
            'coupon_code' => 'TIJUM250',
            'discount_description' => 'Flat ₹250 off on eligible stays',
            'expiry_date' => '31 Dec 2026',
            'referral_code' => 'RAHUL782',
            'referred_customer_display_name' => 'Ananya',
            'referral_reference' => 'RAHUL782',
            'points_credited' => '500',
            'points_redeemed' => '400',
            'points_balance' => '1,250',
            'expiring_points' => '300',
            'monetary_value' => '₹400.00',
            'otp_code' => '•••••• (Sample Redacted)',
            'expires_at' => '10 minutes',
            'created_at' => '12 Nov 2026, 14:20 IST',
            'updated_at' => '12 Nov 2026, 16:45 IST',
            'submission_reference' => 'PVA-2026-00184',
            'submitted_at' => '12 Nov 2026, 10:15 IST',
            'approved_at' => '12 Nov 2026, 18:30 IST',
            'review_reason' => 'Updated ownership document required',
            'requested_changes' => 'Please upload a clearer copy of the property electricity bill.',
            'priority' => 'Urgent',
            'exception_type' => 'Late Payment After Expiry',
            'error_description' => 'Payment captured after reservation expiry; flagged for refund review.',
            'channel' => 'Email',
            'provider' => 'SMTP',
            'delivery_reference' => 'DLV-10492',
            'admin_reference' => 'ops@tijum.com',
            'severity' => 'High',
            'reason' => 'Password changed from Security Settings',
            'review_url' => 'https://tijum.com/reservations/TIJ-HYD-7829/reviews/create',
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

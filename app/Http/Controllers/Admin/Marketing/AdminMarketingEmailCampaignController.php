<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin\Marketing;

use App\Enums\EmailCampaignStatus;
use App\Http\Controllers\Controller;
use App\Models\MarketingCampaign;
use App\Models\MarketingEmailCampaign;
use App\Services\Marketing\MarketingCampaignService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AdminMarketingEmailCampaignController extends Controller
{
    public function __construct(
        private readonly MarketingCampaignService $campaignService,
    ) {}

    public function index(): Response
    {
        $campaigns = MarketingEmailCampaign::query()
            ->with(['marketingCampaign', 'admin'])
            ->latest()
            ->paginate(15);

        return Inertia::render('admin/marketing/emails/index', [
            'emailCampaigns' => $campaigns,
        ]);
    }

    public function create(): Response
    {
        $campaigns = MarketingCampaign::query()->active()->orderBy('name')->get();

        return Inertia::render('admin/marketing/emails/form', [
            'emailCampaign' => null,
            'campaigns' => $campaigns,
            'eligibleCount' => 0,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'campaign_id' => ['nullable', 'exists:marketing_campaigns,id'],
            'title' => ['required', 'string', 'max:255'],
            'subject' => ['required', 'string', 'max:255'],
            'preview_text' => ['nullable', 'string', 'max:255'],
            'content_html' => ['required', 'string'],
            'content_text' => ['nullable', 'string'],
            'target_segment' => ['required', 'string'],
            'scheduled_for' => ['nullable', 'date'],
        ]);

        $validated['admin_id'] = auth('admin')->id();
        $validated['status'] = $request->filled('scheduled_for')
            ? EmailCampaignStatus::Scheduled
            : EmailCampaignStatus::Draft;

        $emailCampaign = MarketingEmailCampaign::query()->create($validated);

        return redirect()->route('admin.marketing.emails.edit', $emailCampaign)
            ->with('success', 'Email campaign saved as draft.');
    }

    public function edit(MarketingEmailCampaign $emailCampaign): Response
    {
        $campaigns = MarketingCampaign::query()->orderBy('name')->get();
        $eligibleCount = $this->campaignService->estimateEligibleCount($emailCampaign);

        return Inertia::render('admin/marketing/emails/form', [
            'emailCampaign' => $emailCampaign->load('marketingCampaign'),
            'campaigns' => $campaigns,
            'eligibleCount' => $eligibleCount,
        ]);
    }

    public function update(Request $request, MarketingEmailCampaign $emailCampaign): RedirectResponse
    {
        $validated = $request->validate([
            'campaign_id' => ['nullable', 'exists:marketing_campaigns,id'],
            'title' => ['required', 'string', 'max:255'],
            'subject' => ['required', 'string', 'max:255'],
            'preview_text' => ['nullable', 'string', 'max:255'],
            'content_html' => ['required', 'string'],
            'content_text' => ['nullable', 'string'],
            'target_segment' => ['required', 'string'],
            'scheduled_for' => ['nullable', 'date'],
        ]);

        $emailCampaign->update($validated);

        return back()->with('success', 'Email campaign updated.');
    }

    public function sendTest(Request $request, MarketingEmailCampaign $emailCampaign): RedirectResponse
    {
        $validated = $request->validate([
            'test_email' => ['required', 'email'],
        ]);

        $this->campaignService->sendTestEmail($emailCampaign, $validated['test_email']);

        return back()->with('success', "Test preview email sent to {$validated['test_email']}.");
    }

    public function send(MarketingEmailCampaign $emailCampaign): RedirectResponse
    {
        if ($emailCampaign->status === EmailCampaignStatus::Sent) {
            return back()->with('error', 'This email campaign has already been sent.');
        }

        $delivered = $this->campaignService->dispatchCampaign($emailCampaign);

        return back()->with('success', "Email campaign dispatched to {$delivered} verified subscribers.");
    }
}

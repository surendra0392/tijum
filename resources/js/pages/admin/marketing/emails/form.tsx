import { Head, Link, router, useForm } from '@inertiajs/react';
import {
    ArrowLeft,
    Save,
    Send,
    SendHorizonal,
    ShieldCheck,
    Users,
} from 'lucide-react';
import { useState } from 'react';
import InputError from '@/components/input-error';
import { ConfirmationDialog } from '@/components/shared/confirmation-dialog';
import { PageHeader } from '@/components/shared/page-header';
import { StatusBadge } from '@/components/shared/status-badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import AdminLayout from '@/layouts/admin-layout';
import type {
    MarketingCampaign,
    MarketingEmailCampaign,
} from '@/types/marketing';

interface Props {
    emailCampaign: MarketingEmailCampaign | null;
    campaigns: MarketingCampaign[];
    eligibleCount: number;
}

export default function AdminEmailCampaignForm({
    emailCampaign,
    campaigns,
    eligibleCount,
}: Props) {
    const isEdit = !!emailCampaign;
    const isSent = emailCampaign?.status === 'sent';

    const [testEmail, setTestEmail] = useState('');
    const [isTestModalOpen, setIsTestModalOpen] = useState(false);
    const [isSendingTest, setIsSendingTest] = useState(false);
    const [isDispatchConfirmOpen, setIsDispatchConfirmOpen] = useState(false);
    const [isDispatching, setIsDispatching] = useState(false);

    const form = useForm({
        campaign_id: emailCampaign?.campaign_id || '',
        title: emailCampaign?.title || '',
        subject: emailCampaign?.subject || '',
        preview_text: emailCampaign?.preview_text || '',
        content_html: emailCampaign?.content_html || '',
        content_text: emailCampaign?.content_text || '',
        target_segment: emailCampaign?.target_segment || 'all_subscribers',
        scheduled_for: emailCampaign?.scheduled_for
            ? emailCampaign.scheduled_for.substring(0, 16)
            : '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isEdit) {
            form.put(`/admin/marketing/emails/${emailCampaign.id}`);
        } else {
            form.post('/admin/marketing/emails');
        }
    };

    const handleSendTest = (e: React.FormEvent) => {
        e.preventDefault();
        if (!emailCampaign || !testEmail) return;
        setIsSendingTest(true);
        router.post(
            `/admin/marketing/emails/${emailCampaign.id}/send-test`,
            { test_email: testEmail },
            {
                onFinish: () => {
                    setIsSendingTest(false);
                    setIsTestModalOpen(false);
                },
            },
        );
    };

    const handleDispatchConfirm = () => {
        if (!emailCampaign) return;
        setIsDispatching(true);
        router.post(
            `/admin/marketing/emails/${emailCampaign.id}/send`,
            {},
            {
                onFinish: () => {
                    setIsDispatching(false);
                    setIsDispatchConfirmOpen(false);
                },
            },
        );
    };

    return (
        <AdminLayout
            breadcrumbs={[
                { title: 'Admin Console', href: '/admin/dashboard' },
                { title: 'Marketing & Growth', href: '/admin/marketing' },
                { title: 'Email Campaigns', href: '/admin/marketing/emails' },
                {
                    title: isEdit
                        ? emailCampaign.title
                        : 'Compose Email Broadcast',
                    href: isEdit
                        ? `/admin/marketing/emails/${emailCampaign.id}/edit`
                        : '/admin/marketing/emails/create',
                },
            ]}
        >
            <Head
                title={
                    isEdit
                        ? `Edit Broadcast: ${emailCampaign.title}`
                        : 'Compose Email Broadcast'
                }
            />

            <div className="max-w-4xl space-y-6 pb-10">
                <PageHeader
                    eyebrow="Marketing · Email Broadcast"
                    title={
                        isEdit
                            ? `Broadcast: ${emailCampaign.title}`
                            : 'Compose Email Broadcast'
                    }
                    description="Permission-based marketing message with RFC 8058 one-click unsubscribe headers."
                    actions={
                        <>
                            <Button asChild variant="outline" size="sm">
                                <Link href="/admin/marketing/emails">
                                    <ArrowLeft
                                        className="size-4"
                                        aria-hidden="true"
                                    />
                                    <span>Back to Broadcasts</span>
                                </Link>
                            </Button>

                            {isEdit && !isSent && (
                                <>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setIsTestModalOpen(true)}
                                    >
                                        <SendHorizonal
                                            className="size-3.5"
                                            aria-hidden="true"
                                        />
                                        <span>Send Test Preview</span>
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="plum"
                                        size="sm"
                                        onClick={() =>
                                            setIsDispatchConfirmOpen(true)
                                        }
                                        disabled={
                                            isDispatching || eligibleCount === 0
                                        }
                                    >
                                        <Send
                                            className="size-3.5"
                                            aria-hidden="true"
                                        />
                                        <span className="tabular-nums">
                                            {isDispatching
                                                ? 'Dispatching...'
                                                : `Dispatch to Audience (${eligibleCount.toLocaleString()})`}
                                        </span>
                                    </Button>
                                </>
                            )}
                        </>
                    }
                />

                {/* Audience & Delivery Status Summary */}
                {isEdit && (
                    <Card className="py-4">
                        <CardContent className="flex flex-wrap items-center justify-between gap-4">
                            <div className="flex items-center gap-3.5">
                                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-tijum-peach/80 bg-tijum-cream text-tijum-coral dark:border-tijum-coral/35 dark:bg-tijum-coral/15">
                                    <Users
                                        className="size-5"
                                        aria-hidden="true"
                                    />
                                </span>
                                <div className="space-y-0.5">
                                    <div className="font-heading text-sm font-semibold text-tijum-plum tabular-nums dark:text-foreground">
                                        Audience Size:{' '}
                                        {eligibleCount.toLocaleString()}{' '}
                                        Verified Active Subscribers
                                    </div>
                                    <div className="text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                        Filter: Segment &ldquo;
                                        {form.data.target_segment.replaceAll(
                                            '_',
                                            ' ',
                                        )}
                                        &rdquo; with confirmed double opt-in
                                        consent.
                                    </div>
                                </div>
                            </div>

                            <div>
                                {isSent ? (
                                    <StatusBadge
                                        status="completed"
                                        label={`Dispatched to ${emailCampaign.delivered_count.toLocaleString()} recipients`}
                                        className="tabular-nums"
                                    />
                                ) : (
                                    <StatusBadge
                                        status="neutral"
                                        label={`Status: ${emailCampaign.status}`}
                                        className="capitalize"
                                    />
                                )}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* RFC 8058 and Unsubscribe Reminder */}
                <Card className="border-l-4 border-l-sky-500 py-4">
                    <CardContent className="flex items-start gap-3.5">
                        <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl border border-status-info-border bg-status-info-bg text-status-info-fg">
                            <ShieldCheck
                                className="size-4.5"
                                aria-hidden="true"
                            />
                        </span>
                        <div className="space-y-1 text-xs leading-relaxed text-tijum-plum-muted dark:text-muted-foreground">
                            <span className="block font-heading text-xs font-semibold text-tijum-plum dark:text-foreground">
                                Automatic Compliance &amp; Unsubscribe
                                Protection
                            </span>
                            <p>
                                Every dispatched message automatically includes
                                standard{' '}
                                <code className="rounded bg-tijum-cream px-1.5 py-0.5 font-mono text-[11px] text-tijum-plum dark:bg-muted dark:text-foreground">
                                    List-Unsubscribe
                                </code>{' '}
                                and{' '}
                                <code className="rounded bg-tijum-cream px-1.5 py-0.5 font-mono text-[11px] text-tijum-plum dark:bg-muted dark:text-foreground">
                                    List-Unsubscribe-Post
                                </code>{' '}
                                headers compliant with RFC 8058, plus direct
                                footer opt-out links.
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* Form Card */}
                <Card>
                    <CardHeader className="border-b border-tijum-surface/80 pb-4 dark:border-border">
                        <CardTitle className="text-base sm:text-lg">
                            Email Message Content &amp; Targeting
                        </CardTitle>
                        <CardDescription className="text-xs sm:text-sm">
                            Compose HTML and plain-text copy, target segment,
                            and optional scheduled send window.
                        </CardDescription>
                    </CardHeader>

                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                                <div className="space-y-1.5">
                                    <Label htmlFor="title">
                                        Broadcast Internal Title
                                    </Label>
                                    <Input
                                        id="title"
                                        value={form.data.title}
                                        onChange={(e) =>
                                            form.setData(
                                                'title',
                                                e.target.value,
                                            )
                                        }
                                        placeholder="e.g. Hyderabad October Student Launch Digest"
                                        required
                                        disabled={isSent}
                                    />
                                    <InputError
                                        message={form.errors.title}
                                        className="text-xs"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="campaign_id">
                                        Associated Campaign (Optional)
                                    </Label>
                                    <Select
                                        value={
                                            form.data.campaign_id
                                                ? String(form.data.campaign_id)
                                                : 'none'
                                        }
                                        onValueChange={(value) =>
                                            form.setData(
                                                'campaign_id',
                                                value === 'none' ? '' : value,
                                            )
                                        }
                                        disabled={isSent}
                                    >
                                        <SelectTrigger
                                            id="campaign_id"
                                            className="w-full"
                                        >
                                            <SelectValue placeholder="Standalone Broadcast" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">
                                                Standalone Broadcast
                                            </SelectItem>
                                            {campaigns.map((c) => (
                                                <SelectItem
                                                    key={c.id}
                                                    value={String(c.id)}
                                                >
                                                    {c.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                                <div className="space-y-1.5">
                                    <Label htmlFor="subject">
                                        Email Subject Line
                                    </Label>
                                    <Input
                                        id="subject"
                                        value={form.data.subject}
                                        onChange={(e) =>
                                            form.setData(
                                                'subject',
                                                e.target.value,
                                            )
                                        }
                                        placeholder="e.g. Delicious South Indian meals included: Meet TIJUM in Hyderabad"
                                        required
                                        disabled={isSent}
                                    />
                                    <InputError
                                        message={form.errors.subject}
                                        className="text-xs"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="preview_text">
                                        Preview Header Text
                                    </Label>
                                    <Input
                                        id="preview_text"
                                        value={form.data.preview_text}
                                        onChange={(e) =>
                                            form.setData(
                                                'preview_text',
                                                e.target.value,
                                            )
                                        }
                                        placeholder="e.g. Fresh homestyle food + verified accommodation"
                                        disabled={isSent}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                                <div className="space-y-1.5">
                                    <Label htmlFor="target_segment">
                                        Target Audience Segment
                                    </Label>
                                    <Select
                                        value={form.data.target_segment}
                                        onValueChange={(value) =>
                                            form.setData(
                                                'target_segment',
                                                value,
                                            )
                                        }
                                        disabled={isSent}
                                    >
                                        <SelectTrigger
                                            id="target_segment"
                                            className="w-full"
                                        >
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all_subscribers">
                                                All Active Confirmed Subscribers
                                            </SelectItem>
                                            <SelectItem value="hyderabad_interest">
                                                Hyderabad Search / Stay Interest
                                            </SelectItem>
                                            <SelectItem value="andhra_pradesh_interest">
                                                Andhra Pradesh (Guntur, Vizag,
                                                Vijayawada)
                                            </SelectItem>
                                            <SelectItem value="frequent_stayers">
                                                Past Verified Customers
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="scheduled_for">
                                        Schedule Broadcast (Optional)
                                    </Label>
                                    <Input
                                        id="scheduled_for"
                                        type="datetime-local"
                                        value={form.data.scheduled_for}
                                        onChange={(e) =>
                                            form.setData(
                                                'scheduled_for',
                                                e.target.value,
                                            )
                                        }
                                        disabled={isSent}
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between gap-2">
                                    <Label htmlFor="content_html">
                                        HTML Message Content
                                    </Label>
                                    <span className="text-[11px] text-tijum-plum-muted dark:text-muted-foreground">
                                        Supports standard HTML markup
                                    </span>
                                </div>
                                <Textarea
                                    id="content_html"
                                    rows={10}
                                    value={form.data.content_html}
                                    onChange={(e) =>
                                        form.setData(
                                            'content_html',
                                            e.target.value,
                                        )
                                    }
                                    placeholder="<h2>Welcome to TIJUM!</h2><p>Here are this week's verified food-inclusive hostels...</p>"
                                    required
                                    disabled={isSent}
                                    className="font-mono text-xs"
                                />
                                <InputError
                                    message={form.errors.content_html}
                                    className="text-xs"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="content_text">
                                    Plain Text Fallback Version (Optional)
                                </Label>
                                <Textarea
                                    id="content_text"
                                    rows={4}
                                    value={form.data.content_text}
                                    onChange={(e) =>
                                        form.setData(
                                            'content_text',
                                            e.target.value,
                                        )
                                    }
                                    placeholder="Plain text content for email clients without HTML rendering..."
                                    disabled={isSent}
                                />
                            </div>

                            {!isSent && (
                                <div className="flex flex-wrap justify-end gap-3 border-t border-tijum-surface/80 pt-5 dark:border-border">
                                    <Button asChild variant="outline">
                                        <Link href="/admin/marketing/emails">
                                            Cancel
                                        </Link>
                                    </Button>
                                    <Button
                                        type="submit"
                                        loading={form.processing}
                                        disabled={form.processing}
                                    >
                                        {!form.processing && (
                                            <Save
                                                className="size-4"
                                                aria-hidden="true"
                                            />
                                        )}
                                        <span>
                                            {isEdit
                                                ? 'Save Changes'
                                                : 'Save as Draft'}
                                        </span>
                                    </Button>
                                </div>
                            )}
                        </form>
                    </CardContent>
                </Card>

                {/* Send Test Email Dialog */}
                <Dialog
                    open={isTestModalOpen}
                    onOpenChange={setIsTestModalOpen}
                >
                    <DialogContent className="border-tijum-surface/80 bg-white text-tijum-plum sm:max-w-md dark:border-border dark:bg-card dark:text-foreground">
                        <DialogHeader>
                            <DialogTitle className="text-tijum-plum dark:text-foreground">
                                Send Test Preview Email
                            </DialogTitle>
                            <DialogDescription className="text-tijum-plum-muted dark:text-muted-foreground">
                                Sends an exact preview copy to this address
                                without affecting audience metrics.
                            </DialogDescription>
                        </DialogHeader>

                        <form onSubmit={handleSendTest} className="space-y-4">
                            <div className="space-y-1.5">
                                <Label
                                    htmlFor="test_email"
                                    className="text-tijum-plum dark:text-foreground"
                                >
                                    Test Recipient Email Address
                                </Label>
                                <Input
                                    id="test_email"
                                    type="email"
                                    value={testEmail}
                                    onChange={(e) =>
                                        setTestEmail(e.target.value)
                                    }
                                    placeholder="admin@example.com"
                                    required
                                />
                            </div>

                            <DialogFooter className="border-t border-tijum-surface/80 pt-4 dark:border-border">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setIsTestModalOpen(false)}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    loading={isSendingTest}
                                    disabled={isSendingTest || !testEmail}
                                >
                                    <span>
                                        {isSendingTest
                                            ? 'Sending...'
                                            : 'Send Test Copy'}
                                    </span>
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

                {/* Dispatch Confirmation Dialog */}
                <ConfirmationDialog
                    open={isDispatchConfirmOpen}
                    onOpenChange={setIsDispatchConfirmOpen}
                    title="Dispatch Email Broadcast"
                    description={
                        emailCampaign
                            ? `Dispatch email "${emailCampaign.title}" to ${eligibleCount.toLocaleString()} verified subscribers now? This action cannot be reversed.`
                            : ''
                    }
                    confirmLabel="Dispatch Now"
                    loading={isDispatching}
                    onConfirm={handleDispatchConfirm}
                />
            </div>
        </AdminLayout>
    );
}

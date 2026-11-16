import { useForm } from '@inertiajs/react';
import { AlertTriangle, Flag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

interface ReportReviewDialogProps {
    reviewId: number;
    isOpen: boolean;
    onClose: () => void;
    endpoint?: string;
}

const REPORT_REASONS = [
    {
        value: 'hate_speech_or_harassment',
        label: 'Hate Speech or Harassment',
        desc: 'Abusive language, discrimination, slurs, or targeted threats.',
    },
    {
        value: 'vulgar_or_obscene_language',
        label: 'Vulgar or Obscene Language',
        desc: 'Profanity, sexually explicit remarks, or inappropriate phrasing.',
    },
    {
        value: 'personally_identifiable_information',
        label: 'Personally Identifiable Information (PII)',
        desc: 'Exposes private phone numbers, full addresses, PAN, Aadhaar, or emails.',
    },
    {
        value: 'false_or_misleading_facts',
        label: 'Demonstrably False Information',
        desc: 'Fabricated assertions that contradict verifiable booking records.',
    },
    {
        value: 'commercial_advertising_or_spam',
        label: 'Spam or Commercial Promotion',
        desc: 'Links to competitors, affiliate codes, or promotional solicitations.',
    },
    {
        value: 'off_topic_or_irrelevant',
        label: 'Off-Topic Content',
        desc: 'Does not relate to the stay experience or accommodation.',
    },
    {
        value: 'extortion_or_blackmail',
        label: 'Threats or Coercion',
        desc: 'Using a negative review to demand free services, refunds, or perks.',
    },
    {
        value: 'conflict_of_interest',
        label: 'Conflict of Interest',
        desc: 'Submitted by competing owners or affiliated parties.',
    },
    {
        value: 'duplicate_or_multiple_submission',
        label: 'Duplicate Submission',
        desc: 'Repeated reviews for the same stay across different entries.',
    },
    {
        value: 'other_content_policy_violation',
        label: 'Other Policy Violation',
        desc: 'Breaches TIJUM Review Policy terms not listed above.',
    },
];

export function ReportReviewDialog({
    reviewId,
    isOpen,
    onClose,
    endpoint,
}: ReportReviewDialogProps) {
    const reportEndpoint = endpoint ?? `/reviews/${reviewId}/report`;

    const { data, setData, post, processing, errors, reset } = useForm({
        reason_category: '',
        explanation: '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(reportEndpoint, {
            onSuccess: () => {
                reset();
                onClose();
            },
        });
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-lg">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <div className="flex items-center gap-2 text-destructive">
                            <Flag className="h-5 w-5" />
                            <DialogTitle>Report This Review</DialogTitle>
                        </div>
                        <DialogDescription className="mt-1 text-xs text-muted-foreground">
                            Flag content that violates TIJUM community standards
                            or moderation policies. All reports are audited by
                            human moderators under our voluntary BIS IS
                            19000:2022 principles.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="my-4 flex items-start gap-2 rounded-lg border border-tijum-peach/30 bg-tijum-peach/15 p-3 text-xs text-tijum-plum">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-tijum-coral" />
                        <div>
                            <strong className="font-semibold">
                                Stay Dispute Notice:
                            </strong>{' '}
                            If you experienced issues with your room, food,
                            check-in, or require a refund, please raise a{' '}
                            <span className="font-semibold underline">
                                Customer Protection Case
                            </span>{' '}
                            instead. Review reports are strictly for content
                            moderation.
                        </div>
                    </div>

                    <div className="space-y-4 py-2">
                        <div className="space-y-1.5">
                            <Label
                                htmlFor="reason_category"
                                className="text-xs font-semibold"
                            >
                                Reason for Reporting{' '}
                                <span className="text-destructive">*</span>
                            </Label>
                            <Select
                                value={data.reason_category}
                                onValueChange={(val) =>
                                    setData('reason_category', val)
                                }
                            >
                                <SelectTrigger
                                    id="reason_category"
                                    className="w-full"
                                >
                                    <SelectValue placeholder="Select a violation category..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {REPORT_REASONS.map((r) => (
                                        <SelectItem
                                            key={r.value}
                                            value={r.value}
                                        >
                                            <div className="flex flex-col py-0.5 text-left">
                                                <span className="text-xs font-medium text-foreground">
                                                    {r.label}
                                                </span>
                                                <span className="text-[11px] text-muted-foreground">
                                                    {r.desc}
                                                </span>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {errors.reason_category && (
                                <p className="text-xs font-medium text-destructive">
                                    {errors.reason_category}
                                </p>
                            )}
                        </div>

                        <div className="space-y-1.5">
                            <div className="flex justify-between">
                                <Label
                                    htmlFor="explanation"
                                    className="text-xs font-semibold"
                                >
                                    Detailed Explanation (Optional)
                                </Label>
                                <span className="text-[11px] text-muted-foreground">
                                    {data.explanation.length}/1000
                                </span>
                            </div>
                            <Textarea
                                id="explanation"
                                rows={3}
                                placeholder="Explain why this review violates TIJUM content policies..."
                                value={data.explanation}
                                onChange={(e) =>
                                    setData('explanation', e.target.value)
                                }
                                maxLength={1000}
                                className="text-xs"
                            />
                            {errors.explanation && (
                                <p className="text-xs font-medium text-destructive">
                                    {errors.explanation}
                                </p>
                            )}
                        </div>
                    </div>

                    <DialogFooter className="mt-4 gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            disabled={processing}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            variant="destructive"
                            disabled={processing || !data.reason_category}
                        >
                            {processing
                                ? 'Submitting Report...'
                                : 'Submit Report'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

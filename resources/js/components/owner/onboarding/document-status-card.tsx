import { router, useForm } from '@inertiajs/react';
import {
    AlertTriangle,
    Download,
    ExternalLink,
    FileText,
    Trash2,
    Upload,
} from 'lucide-react';
import { useState, type FormEvent } from 'react';
import {
    documentStatusBadgeMap,
    formatIsoDateTime,
} from '@/components/owner/onboarding/status-helpers';
import { ConfirmationDialog } from '@/components/shared/confirmation-dialog';
import { FileUploadField } from '@/components/shared/form-field';
import { StatusBadge } from '@/components/shared/status-badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { destroy, store } from '@/routes/owner/onboarding/documents';
import type { VerificationChecklistItem } from '@/types';

type DocumentStatusCardProps = {
    item: VerificationChecklistItem;
    isEditable: boolean;
    maxDocumentSizeMb: number;
};

export function DocumentStatusCard({
    item,
    isEditable,
    maxDocumentSizeMb,
}: DocumentStatusCardProps) {
    const [deleting, setDeleting] = useState(false);

    const form = useForm<{
        document_type: string;
        document: File | null;
    }>({
        document_type: item.type,
        document: null,
    });

    const handleUpload = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!isEditable || !form.data.document) {
            return;
        }

        form.post(store.url(), {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                form.reset('document');
            },
        });
    };

    const handleDelete = () => {
        if (!item.document || !isEditable) {
            return;
        }

        setDeleting(true);
        router.delete(destroy.url(item.document.id), {
            preserveScroll: true,
            onFinish: () => setDeleting(false),
        });
    };

    const doc = item.document;

    return (
        <Card>
            <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                            <CardTitle className="text-base sm:text-lg">
                                {item.label}
                            </CardTitle>
                            <Badge variant={item.required ? 'plum' : 'outline'}>
                                {item.required ? 'Required' : 'Optional'}
                            </Badge>
                        </div>
                        <CardDescription className="leading-relaxed">
                            {item.guidance}
                        </CardDescription>
                    </div>

                    {doc ? (
                        <StatusBadge
                            status={
                                documentStatusBadgeMap[doc.status] ?? 'neutral'
                            }
                            label={doc.status_label}
                        />
                    ) : (
                        <StatusBadge
                            status={item.required ? 'pending' : 'neutral'}
                            label={
                                item.required ? 'Required Upload' : 'Optional'
                            }
                        />
                    )}
                </div>
            </CardHeader>

            <CardContent className="space-y-4">
                {doc && (
                    <div className="space-y-3 rounded-xl border border-tijum-surface/80 bg-tijum-cream/45 p-4 dark:border-border dark:bg-muted/45">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex min-w-0 items-center gap-2.5">
                                <FileText
                                    className="size-4.5 shrink-0 text-tijum-coral"
                                    aria-hidden="true"
                                />
                                <div className="min-w-0">
                                    <p className="truncate font-heading text-sm font-semibold text-tijum-plum dark:text-foreground">
                                        {doc.original_filename}
                                    </p>
                                    <p className="text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                        {doc.mime_type} · {doc.file_size_label}{' '}
                                        · Uploaded{' '}
                                        {formatIsoDateTime(doc.created_at)}
                                    </p>
                                </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                                {doc.preview_url && (
                                    <Button variant="outline" size="sm" asChild>
                                        <a
                                            href={doc.preview_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            <span>Preview</span>
                                            <ExternalLink aria-hidden="true" />
                                        </a>
                                    </Button>
                                )}
                                {doc.download_url && (
                                    <Button variant="outline" size="sm" asChild>
                                        <a href={doc.download_url}>
                                            <Download aria-hidden="true" />
                                            <span>Download</span>
                                        </a>
                                    </Button>
                                )}
                                {isEditable && (
                                    <ConfirmationDialog
                                        title={`Remove ${item.label}?`}
                                        description="This removes the uploaded document from your active submission."
                                        confirmLabel="Remove Document"
                                        tone="destructive"
                                        loading={deleting}
                                        onConfirm={handleDelete}
                                        trigger={
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                className="text-status-error-fg hover:bg-status-error-bg"
                                            >
                                                <Trash2 aria-hidden="true" />
                                                <span>Remove</span>
                                            </Button>
                                        }
                                    />
                                )}
                            </div>
                        </div>

                        {doc.status === 'rejected' && doc.reviewer_note && (
                            <Alert variant="destructive">
                                <AlertTriangle aria-hidden="true" />
                                <AlertTitle>Replacement requested</AlertTitle>
                                <AlertDescription>
                                    {doc.reviewer_note}
                                </AlertDescription>
                            </Alert>
                        )}
                    </div>
                )}

                {isEditable && (
                    <form
                        onSubmit={handleUpload}
                        className="flex flex-col gap-3 sm:flex-row sm:items-end"
                    >
                        <div className="min-w-0 flex-1">
                            <FileUploadField
                                id={`document-${item.type}`}
                                name={`document-${item.type}`}
                                label={
                                    doc ? `Replace ${item.label}` : item.label
                                }
                                accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                                hint={`${item.accepted_formats} · Max ${maxDocumentSizeMb} MB`}
                                error={
                                    form.errors.document ??
                                    form.errors.document_type
                                }
                                onFileChange={(file) =>
                                    form.setData('document', file)
                                }
                            />
                        </div>

                        <Button
                            type="submit"
                            variant={doc ? 'outline' : 'default'}
                            disabled={!form.data.document || form.processing}
                            loading={form.processing}
                            data-test={`upload-document-${item.type}`}
                        >
                            <Upload aria-hidden="true" />
                            <span>{doc ? 'Replace File' : 'Upload File'}</span>
                        </Button>
                    </form>
                )}
            </CardContent>
        </Card>
    );
}

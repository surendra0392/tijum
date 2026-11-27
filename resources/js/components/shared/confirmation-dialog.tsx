import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';

type ConfirmationDialogProps = {
    open?: boolean;
    isOpen?: boolean;
    onOpenChange?: (open: boolean) => void;
    onCancel?: () => void;
    trigger?: ReactNode;
    title: string;
    description: string;
    confirmLabel?: string;
    cancelLabel?: string;
    tone?: 'default' | 'destructive';
    variant?: string;
    loading?: boolean;
    onConfirm: () => void;
};

export function ConfirmationDialog({
    open,
    isOpen,
    onOpenChange,
    onCancel,
    trigger,
    title,
    description,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    tone = 'default',
    variant,
    loading = false,
    onConfirm,
}: ConfirmationDialogProps) {
    const isDialogOpen = open ?? isOpen;
    const effectiveTone = variant ?? tone;
    const isDestructive = effectiveTone === 'destructive';

    const handleCancel = () => {
        onOpenChange?.(false);
        onCancel?.();
    };

    return (
        <Dialog open={isDialogOpen} onOpenChange={onOpenChange}>
            {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>{description}</DialogDescription>
                </DialogHeader>
                <DialogFooter className="pt-2">
                    <Button
                        type="button"
                        variant="secondary"
                        autoFocus={isDestructive}
                        disabled={loading}
                        onClick={handleCancel}
                    >
                        {cancelLabel}
                    </Button>
                    <Button
                        type="button"
                        variant={isDestructive ? 'destructive' : 'default'}
                        loading={loading}
                        onClick={onConfirm}
                    >
                        {confirmLabel}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

/**
 * Semantic Light & Dark status badge classes for customer helpdesk tickets.
 */
export function getSupportTicketStatusBadgeClass(status: string): string {
    switch (status) {
        case 'open':
            return 'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-800/60 dark:bg-blue-950/40 dark:text-blue-300';
        case 'in_progress':
            return 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-300';
        case 'waiting_user':
            return 'border-tijum-peach bg-tijum-peach/25 text-tijum-plum dark:border-tijum-coral/40 dark:bg-tijum-coral/15 dark:text-tijum-peach';
        case 'resolved':
            return 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-300';
        case 'closed':
            return 'border-tijum-surface bg-tijum-cream text-tijum-plum-muted dark:border-border dark:bg-muted dark:text-muted-foreground';
        default:
            return 'border-border bg-muted text-muted-foreground';
    }
}

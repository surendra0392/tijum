import BrandLogo from '@/components/brand/brand-logo';

export default function AppLogo() {
    return (
        <div className="flex items-center gap-2.5 overflow-hidden">
            <BrandLogo variant="icon" size="sm" />
            <div className="grid flex-1 text-left leading-tight group-data-[collapsible=icon]:hidden">
                <span className="truncate font-heading text-sm font-bold tracking-[0.2em] text-tijum-plum uppercase dark:text-foreground">
                    TIJUM
                </span>
                <span className="truncate text-[11px] font-medium text-tijum-plum-muted dark:text-muted-foreground">
                    Customer Portal
                </span>
            </div>
        </div>
    );
}

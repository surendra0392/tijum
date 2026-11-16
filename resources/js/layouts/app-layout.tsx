import CustomerLayout from '@/layouts/customer-layout';
import type { BreadcrumbItem } from '@/types';

export default function AppLayout({
    breadcrumbs = [],
    children,
}: {
    breadcrumbs?: BreadcrumbItem[];
    children: React.ReactNode;
}) {
    return (
        <CustomerLayout breadcrumbs={breadcrumbs}>{children}</CustomerLayout>
    );
}

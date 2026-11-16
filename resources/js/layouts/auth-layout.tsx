import CustomerAuthLayout from '@/layouts/customer/customer-auth-layout';

export default function AuthLayout({
    title = '',
    description = '',
    children,
}: {
    title?: string;
    description?: string;
    children: React.ReactNode;
}) {
    return (
        <CustomerAuthLayout title={title} description={description}>
            {children}
        </CustomerAuthLayout>
    );
}

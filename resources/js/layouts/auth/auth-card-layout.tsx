import type { PropsWithChildren } from 'react';
import AuthSplitLayout from '@/layouts/auth/auth-split-layout';

export default function AuthCardLayout({
    children,
    title = '',
    description = '',
}: PropsWithChildren<{
    name?: string;
    title?: string;
    description?: string;
}>) {
    return (
        <AuthSplitLayout
            portal="customer"
            title={title}
            description={description}
        >
            {children}
        </AuthSplitLayout>
    );
}

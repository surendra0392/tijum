import type { PropsWithChildren } from 'react';
import AuthSimpleLayout from '@/layouts/auth/auth-simple-layout';

type AuthMeta = { title?: string; description?: string };

type AdminAuthLayoutProps = PropsWithChildren<{
    title?: string;
    description?: string;
}>;

export default function AdminAuthLayout({
    children,
    title,
    description,
}: AdminAuthLayoutProps) {
    const pageType = (
        children as {
            type?: { authMeta?: AuthMeta; layout?: AuthMeta };
        }
    )?.type;
    const meta: AuthMeta = pageType?.authMeta ?? pageType?.layout ?? {};
    const resolvedTitle = title ?? meta.title ?? '';
    const resolvedDescription = description ?? meta.description ?? '';

    return (
        <AuthSimpleLayout
            title={resolvedTitle}
            description={resolvedDescription}
        >
            {children}
        </AuthSimpleLayout>
    );
}

import type React from 'react';
import AuthSplitLayout from '@/layouts/auth/auth-split-layout';

type AuthMeta = {
    title?: string;
    description?: string;
    maxWidth?: 'default' | 'comfortable' | 'wide';
};

export default function CustomerAuthLayout({
    title,
    description,
    maxWidth,
    children,
}: {
    title?: string;
    description?: string;
    maxWidth?: 'default' | 'comfortable' | 'wide';
    children: React.ReactNode;
}) {
    const pageType = (
        children as {
            type?: { authMeta?: AuthMeta; layout?: AuthMeta };
        }
    )?.type;
    const meta: AuthMeta = pageType?.authMeta ?? pageType?.layout ?? {};
    const resolvedTitle = title ?? meta.title ?? '';
    const resolvedDescription = description ?? meta.description ?? '';
    const resolvedMaxWidth = maxWidth ?? meta.maxWidth ?? 'default';

    return (
        <AuthSplitLayout
            title={resolvedTitle}
            description={resolvedDescription}
            maxWidth={resolvedMaxWidth}
        >
            {children}
        </AuthSplitLayout>
    );
}

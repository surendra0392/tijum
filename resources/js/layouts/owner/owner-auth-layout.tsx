import type { PropsWithChildren } from 'react';
import OwnerAuthSplitLayout from '@/layouts/owner/owner-auth-split-layout';

type AuthMeta = {
    title?: string;
    description?: string;
    maxWidth?: 'default' | 'comfortable' | 'wide';
};

type OwnerAuthLayoutProps = PropsWithChildren<{
    title?: string;
    description?: string;
    maxWidth?: 'default' | 'comfortable' | 'wide';
}>;

export default function OwnerAuthLayout({
    children,
    title,
    description,
    maxWidth,
}: OwnerAuthLayoutProps) {
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
        <OwnerAuthSplitLayout
            title={resolvedTitle}
            description={resolvedDescription}
            maxWidth={resolvedMaxWidth}
        >
            {children}
        </OwnerAuthSplitLayout>
    );
}

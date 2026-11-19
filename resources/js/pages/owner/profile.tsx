import { Form, Head, usePage } from '@inertiajs/react';
import { useRef } from 'react';
import PasswordInput from '@/components/password-input';
import { FormField } from '@/components/shared/form-field';
import { PageHeader } from '@/components/shared/page-header';
import {
    StatusBadge,
    type SemanticStatus,
} from '@/components/shared/status-badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { dashboard } from '@/routes/owner';
import { edit as profileEdit, update } from '@/routes/owner/profile';
import { update as passwordUpdate } from '@/routes/owner/profile/password';
import type { OwnerStatus } from '@/types';

type OwnerProfileProps = {
    status?: string;
};

const ownerStatusMap: Record<OwnerStatus, SemanticStatus> = {
    active: 'active',
    pending_verification: 'pending',
    pending_review: 'processing',
    rejected: 'rejected',
    suspended: 'suspended',
};

export default function OwnerProfile({ status }: OwnerProfileProps) {
    const owner = usePage().props.auth?.owner;
    const passwordInput = useRef<HTMLInputElement>(null);
    const currentPasswordInput = useRef<HTMLInputElement>(null);

    return (
        <>
            <Head title="Partner Profile Settings" />

            <div className="mx-auto max-w-3xl space-y-6 pb-8">
                <PageHeader
                    eyebrow="Partner Account"
                    title="Partner profile settings"
                    description="Update your partner contact details and sign-in password."
                    badges={
                        owner && (
                            <StatusBadge
                                status={ownerStatusMap[owner.status]}
                                label={owner.status_label}
                            />
                        )
                    }
                />

                {status === 'profile-updated' && (
                    <Alert variant="success">
                        <AlertDescription>
                            Your partner profile details have been saved.
                        </AlertDescription>
                    </Alert>
                )}

                {status === 'profile-updated-verify-email' && (
                    <Alert variant="info">
                        <AlertDescription>
                            Your email address was updated. A fresh partner
                            verification email has been dispatched.
                        </AlertDescription>
                    </Alert>
                )}

                {status === 'password-updated' && (
                    <Alert variant="success">
                        <AlertDescription>
                            Your password has been updated. Use the new
                            password the next time you sign in.
                        </AlertDescription>
                    </Alert>
                )}

                <Card>
                    <CardHeader>
                        <CardTitle>Primary partner contact</CardTitle>
                        <CardDescription>
                            Changing your email requires re-verifying your
                            partner address.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Form
                            {...update.form()}
                            className="flex flex-col gap-5"
                        >
                            {({ processing, errors }) => (
                                <>
                                    <FormField
                                        id="name"
                                        label="Full name or primary contact"
                                        required
                                        error={errors.name}
                                    >
                                        {(a11y) => (
                                            <Input
                                                {...a11y}
                                                type="text"
                                                name="name"
                                                defaultValue={owner?.name ?? ''}
                                                required
                                                autoComplete="name"
                                            />
                                        )}
                                    </FormField>

                                    <FormField
                                        id="email"
                                        label="Partner email address"
                                        required
                                        error={errors.email}
                                    >
                                        {(a11y) => (
                                            <Input
                                                {...a11y}
                                                type="email"
                                                name="email"
                                                defaultValue={
                                                    owner?.email ?? ''
                                                }
                                                required
                                                autoComplete="email"
                                            />
                                        )}
                                    </FormField>

                                    <FormField
                                        id="phone"
                                        label="Mobile number"
                                        required
                                        hint="Phone OTP verification will activate in a later notification integration phase."
                                        error={errors.phone}
                                    >
                                        {(a11y) => (
                                            <Input
                                                {...a11y}
                                                type="tel"
                                                name="phone"
                                                defaultValue={
                                                    owner?.phone ?? ''
                                                }
                                                autoComplete="tel"
                                                placeholder="+91 9876543210"
                                            />
                                        )}
                                    </FormField>

                                    <Button
                                        type="submit"
                                        loading={processing}
                                        className="self-start"
                                    >
                                        Save partner profile
                                    </Button>
                                </>
                            )}
                        </Form>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Update password</CardTitle>
                        <CardDescription>
                            Use a strong, unique password to keep your partner
                            account secure.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Form
                            {...passwordUpdate.form()}
                            options={{ preserveScroll: true }}
                            resetOnError={[
                                'password',
                                'password_confirmation',
                                'current_password',
                            ]}
                            resetOnSuccess
                            onError={(errors) => {
                                if (errors.password) {
                                    passwordInput.current?.focus();
                                }

                                if (errors.current_password) {
                                    currentPasswordInput.current?.focus();
                                }
                            }}
                            className="flex flex-col gap-5"
                        >
                            {({ processing, errors }) => (
                                <>
                                    <FormField
                                        id="current_password"
                                        label="Current password"
                                        required
                                        error={errors.current_password}
                                    >
                                        {(a11y) => (
                                            <PasswordInput
                                                {...a11y}
                                                ref={currentPasswordInput}
                                                name="current_password"
                                                autoComplete="current-password"
                                                placeholder="Enter current password"
                                                required
                                            />
                                        )}
                                    </FormField>

                                    <FormField
                                        id="password"
                                        label="New password"
                                        required
                                        error={errors.password}
                                    >
                                        {(a11y) => (
                                            <PasswordInput
                                                {...a11y}
                                                ref={passwordInput}
                                                name="password"
                                                autoComplete="new-password"
                                                placeholder="Enter new password"
                                                required
                                            />
                                        )}
                                    </FormField>

                                    <FormField
                                        id="password_confirmation"
                                        label="Confirm new password"
                                        required
                                        error={errors.password_confirmation}
                                    >
                                        {(a11y) => (
                                            <PasswordInput
                                                {...a11y}
                                                name="password_confirmation"
                                                autoComplete="new-password"
                                                placeholder="Re-enter new password"
                                                required
                                            />
                                        )}
                                    </FormField>

                                    <Button
                                        type="submit"
                                        loading={processing}
                                        className="self-start"
                                        data-test="owner-update-password-button"
                                    >
                                        Update password
                                    </Button>
                                </>
                            )}
                        </Form>
                    </CardContent>
                </Card>
            </div>
        </>
    );
}

OwnerProfile.layout = {
    breadcrumbs: [
        {
            title: 'Partner Overview',
            href: dashboard(),
        },
        {
            title: 'Profile & Settings',
            href: profileEdit(),
        },
    ],
};

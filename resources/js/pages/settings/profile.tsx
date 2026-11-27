import { Form, Head, useForm } from '@inertiajs/react';
import { CheckCircle2, Clock, MailCheck, Phone } from 'lucide-react';
import { useEffect } from 'react';
import ProfileController from '@/actions/App/Http/Controllers/Settings/ProfileController';
import DeleteUser from '@/components/delete-user';
import { FormField } from '@/components/shared/form-field';
import { PageHeader } from '@/components/shared/page-header';
import { StatusBadge } from '@/components/shared/status-badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { edit } from '@/routes/profile';
import { send } from '@/routes/verification';
import type { CustomerAccount } from '@/types';

type ProfilePageProps = {
    customer: CustomerAccount;
    mustVerifyEmail: boolean;
    status?: string;
};

function formatDateTime(isoDate: string | null): string {
    if (!isoDate) {
        return 'Not recorded';
    }

    const parsed = new Date(isoDate);
    if (Number.isNaN(parsed.getTime())) {
        return 'Not recorded';
    }

    return new Intl.DateTimeFormat('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
    }).format(parsed);
}

export default function Profile({
    customer,
    mustVerifyEmail,
    status,
}: ProfilePageProps) {
    const form = useForm({
        name: customer.name,
        email: customer.email,
        phone: customer.phone ?? '',
    });

    const { setDefaults } = form;

    useEffect(() => {
        setDefaults({
            name: customer.name,
            email: customer.email,
            phone: customer.phone ?? '',
        });
    }, [customer.name, customer.email, customer.phone, setDefaults]);

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        form.patch(ProfileController.update.url(), {
            preserveScroll: true,
        });
    };

    const handleCancel = () => {
        form.reset();
        form.clearErrors();
    };

    const emailVerified = customer.email_verified_at !== null;
    const phoneProvided = customer.phone !== null && customer.phone !== '';

    return (
        <>
            <Head title="My Profile" />

            <div className="space-y-6">
                <PageHeader
                    title="My Profile"
                    description="Manage your personal information and contact details."
                    badges={
                        <StatusBadge
                            status={emailVerified ? 'verified' : 'pending'}
                            label={
                                emailVerified
                                    ? 'Email Verified'
                                    : 'Verification Pending'
                            }
                        />
                    }
                />

                {status === 'profile-updated' && (
                    <Alert variant="success">
                        <CheckCircle2 aria-hidden="true" />
                        <AlertTitle>Profile updated</AlertTitle>
                        <AlertDescription>
                            Your customer details have been saved.
                        </AlertDescription>
                    </Alert>
                )}

                {status === 'profile-updated-verify-email' && (
                    <Alert variant="info">
                        <MailCheck aria-hidden="true" />
                        <AlertTitle>Verify your new email address</AlertTitle>
                        <AlertDescription>
                            Your profile was updated and a fresh email
                            verification link has been dispatched to{' '}
                            {customer.email}.
                        </AlertDescription>
                    </Alert>
                )}

                {status === 'verification-link-sent' && (
                    <Alert variant="success">
                        <MailCheck aria-hidden="true" />
                        <AlertTitle>Verification link sent</AlertTitle>
                        <AlertDescription>
                            A new verification link has been sent to{' '}
                            {customer.email}.
                        </AlertDescription>
                    </Alert>
                )}

                <Card>
                    <CardHeader>
                        <CardTitle>Personal details</CardTitle>
                        <CardDescription>
                            Keep your customer name, email address, and phone
                            number accurate. Changing your email resets email
                            verification until confirmed.
                        </CardDescription>
                    </CardHeader>

                    <CardContent>
                        <form
                            onSubmit={handleSubmit}
                            className="max-w-xl space-y-5"
                            noValidate
                        >
                            <FormField
                                id="name"
                                label="Full name"
                                required
                                error={form.errors.name}
                            >
                                {(a11y) => (
                                    <Input
                                        {...a11y}
                                        type="text"
                                        name="name"
                                        value={form.data.name}
                                        onChange={(e) =>
                                            form.setData('name', e.target.value)
                                        }
                                        required
                                        autoComplete="name"
                                        enterKeyHint="next"
                                        placeholder="Enter your full name"
                                    />
                                )}
                            </FormField>

                            <FormField
                                id="email"
                                label="Email address"
                                required
                                hint="Used for customer login, booking notifications, and account recovery."
                                error={form.errors.email}
                            >
                                {(a11y) => (
                                    <Input
                                        {...a11y}
                                        type="email"
                                        name="email"
                                        value={form.data.email}
                                        onChange={(e) =>
                                            form.setData(
                                                'email',
                                                e.target.value,
                                            )
                                        }
                                        required
                                        inputMode="email"
                                        autoComplete="email"
                                        autoCapitalize="none"
                                        autoCorrect="off"
                                        spellCheck={false}
                                        enterKeyHint="next"
                                        placeholder="you@example.com"
                                    />
                                )}
                            </FormField>

                            <FormField
                                id="phone"
                                label="Mobile / Phone number"
                                required
                                hint="Include country code for international numbers (e.g., +91 9876543210). Used for stay coordination and booking updates."
                                error={form.errors.phone}
                            >
                                {(a11y) => (
                                    <Input
                                        {...a11y}
                                        type="tel"
                                        name="phone"
                                        value={form.data.phone}
                                        onChange={(e) =>
                                            form.setData(
                                                'phone',
                                                e.target.value,
                                            )
                                        }
                                        inputMode="tel"
                                        autoComplete="tel"
                                        enterKeyHint="done"
                                        placeholder="+91 9876543210"
                                    />
                                )}
                            </FormField>

                            <div className="flex flex-wrap items-center gap-3 pt-1">
                                <Button
                                    type="submit"
                                    loading={form.processing}
                                    data-test="update-profile-button"
                                >
                                    Save Changes
                                </Button>

                                <Button
                                    type="button"
                                    variant="outline"
                                    disabled={form.processing || !form.isDirty}
                                    onClick={handleCancel}
                                >
                                    Cancel
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Verification status</CardTitle>
                        <CardDescription>
                            Real verification state for your customer email and
                            optional contact number.
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-4">
                        <div className="flex flex-col justify-between gap-3 rounded-xl border border-tijum-surface bg-tijum-cream/40 p-4 sm:flex-row sm:items-center dark:border-border dark:bg-muted/30">
                            <div className="space-y-1">
                                <div className="flex flex-wrap items-center gap-2">
                                    <MailCheck
                                        className="size-4 text-tijum-plum dark:text-foreground"
                                        aria-hidden="true"
                                    />
                                    <p className="font-heading text-sm font-semibold text-tijum-plum dark:text-foreground">
                                        Email Verification
                                    </p>
                                    <StatusBadge
                                        status={
                                            emailVerified
                                                ? 'verified'
                                                : 'pending'
                                        }
                                        label={
                                            emailVerified
                                                ? 'Verified'
                                                : 'Verification Pending'
                                        }
                                    />
                                </div>
                                <p className="text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                    {emailVerified
                                        ? `Verified on ${formatDateTime(customer.email_verified_at)}`
                                        : 'Your email address is unverified. Protected actions require email confirmation.'}
                                </p>
                            </div>

                            {mustVerifyEmail && !emailVerified && (
                                <Form {...send.form()}>
                                    {({ processing }) => (
                                        <Button
                                            type="submit"
                                            size="sm"
                                            variant="plum"
                                            loading={processing}
                                            data-test="resend-verification-button"
                                        >
                                            Resend Verification Email
                                        </Button>
                                    )}
                                </Form>
                            )}
                        </div>

                        <div className="flex flex-col justify-between gap-3 rounded-xl border border-tijum-surface bg-tijum-cream/40 p-4 sm:flex-row sm:items-center dark:border-border dark:bg-muted/30">
                            <div className="space-y-1">
                                <div className="flex flex-wrap items-center gap-2">
                                    <Phone
                                        className="size-4 text-tijum-plum dark:text-foreground"
                                        aria-hidden="true"
                                    />
                                    <p className="font-heading text-sm font-semibold text-tijum-plum dark:text-foreground">
                                        Phone Verification
                                    </p>
                                    <StatusBadge
                                        status={
                                            phoneProvided
                                                ? 'pending'
                                                : 'neutral'
                                        }
                                        label={
                                            phoneProvided
                                                ? 'Not verified'
                                                : 'Not added'
                                        }
                                    />
                                </div>
                                <p className="text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                    {phoneProvided
                                        ? `Saved contact: ${customer.phone}. Phone verification is not enabled yet.`
                                        : 'A mobile phone number is required on your profile.'}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Clock
                                className="size-4 text-tijum-plum-muted dark:text-muted-foreground"
                                aria-hidden="true"
                            />
                            <span>Account information</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <dl className="grid gap-4 text-sm sm:grid-cols-2">
                            <div className="rounded-xl border border-tijum-surface bg-tijum-cream/30 p-3.5 dark:border-border dark:bg-muted/20">
                                <dt className="font-heading text-xs font-semibold tracking-wider text-tijum-plum-muted uppercase dark:text-muted-foreground">
                                    Account created
                                </dt>
                                <dd className="mt-1 font-medium text-tijum-plum dark:text-foreground">
                                    {formatDateTime(customer.created_at)}
                                </dd>
                            </div>
                            <div className="rounded-xl border border-tijum-surface bg-tijum-cream/30 p-3.5 dark:border-border dark:bg-muted/20">
                                <dt className="font-heading text-xs font-semibold tracking-wider text-tijum-plum-muted uppercase dark:text-muted-foreground">
                                    Last updated
                                </dt>
                                <dd className="mt-1 font-medium text-tijum-plum dark:text-foreground">
                                    {formatDateTime(customer.updated_at)}
                                </dd>
                            </div>
                        </dl>
                    </CardContent>
                </Card>

                <div id="account-management" className="tijum-anchor-target">
                    <DeleteUser />
                </div>
            </div>
        </>
    );
}

Profile.layout = {
    breadcrumbs: [
        {
            title: 'My Profile',
            href: edit(),
        },
    ],
};

import { Form, Head, Link } from '@inertiajs/react';
import { MailCheck, Send } from 'lucide-react';
import TextLink from '@/components/text-link';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { dashboard, logout } from '@/routes/owner';
import { send } from '@/routes/owner/verification';

type OwnerVerifyEmailProps = {
    status?: string;
};

export default function OwnerVerifyEmail({ status }: OwnerVerifyEmailProps) {
    return (
        <>
            <Head title="Verify Partner Email" />

            {status === 'verification-link-sent' && (
                <Alert variant="success" className="mb-5">
                    <MailCheck aria-hidden="true" />
                    <AlertTitle>Verification link sent</AlertTitle>
                    <AlertDescription>
                        A fresh partner email verification link has been sent to
                        your registered email address.
                    </AlertDescription>
                </Alert>
            )}

            <div className="space-y-5">
                <div className="flex items-start gap-3.5 rounded-2xl border border-tijum-surface bg-tijum-cream/55 p-4 text-sm text-tijum-plum">
                    <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-tijum-peach/35 text-tijum-plum">
                        <MailCheck className="size-5" aria-hidden="true" />
                    </span>
                    <div className="space-y-1">
                        <p className="font-heading text-sm font-semibold text-tijum-plum">
                            Verify your partner inbox
                        </p>
                        <p className="text-xs leading-relaxed text-tijum-plum-muted">
                            Click the verification link sent to your email
                            address so TIJUM can move your partner profile into
                            onboarding review.
                        </p>
                    </div>
                </div>

                <Form {...send.form()} className="flex flex-col gap-5">
                    {({ processing }) => (
                        <>
                            <Button
                                type="submit"
                                size="lg"
                                className="w-full"
                                loading={processing}
                            >
                                <Send className="size-4" aria-hidden="true" />
                                <span>Resend verification email</span>
                            </Button>

                            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-tijum-surface/80 pt-5 text-sm">
                                <TextLink
                                    href={dashboard.url()}
                                    className="font-semibold"
                                >
                                    Back to onboarding dashboard
                                </TextLink>

                                <Link
                                    href={logout.url()}
                                    method="post"
                                    as="button"
                                    className="cursor-pointer font-heading text-xs font-semibold text-tijum-plum-muted underline underline-offset-4 transition-colors hover:text-tijum-plum"
                                >
                                    Sign out
                                </Link>
                            </div>
                        </>
                    )}
                </Form>
            </div>
        </>
    );
}

OwnerVerifyEmail.authMeta = {
    title: 'Verify your partner email',
    description:
        'Email verification distinguishes your verified contact identity before property onboarding approval.',
};

OwnerVerifyEmail.layout = OwnerVerifyEmail.authMeta;

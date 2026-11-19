import { Form, Head, Link } from '@inertiajs/react';
import { CheckCircle2, LogOut, MailCheck, Send } from 'lucide-react';
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
                    <CheckCircle2 aria-hidden="true" />
                    <AlertTitle>Verification link sent</AlertTitle>
                    <AlertDescription>
                        A fresh partner email verification link has been sent to
                        your registered email address.
                    </AlertDescription>
                </Alert>
            )}

            <div className="space-y-5">
                <div className="rounded-2xl border border-tijum-surface/85 bg-tijum-cream/50 p-5">
                    <div className="flex items-start gap-3.5">
                        <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-2xl bg-tijum-plum text-tijum-peach shadow-2xs">
                            <MailCheck className="size-5" aria-hidden="true" />
                        </span>
                        <div className="space-y-1">
                            <p className="font-heading text-sm font-semibold text-tijum-plum">
                                Verify your partner inbox
                            </p>
                            <p className="text-xs leading-relaxed text-tijum-plum-muted">
                                Open the verification link sent to your email
                                address so TIJUM can move your partner profile
                                into onboarding review.
                            </p>
                        </div>
                    </div>

                    <ul className="mt-4 space-y-1.5 border-t border-tijum-surface/75 pt-3.5 text-xs text-tijum-plum-muted">
                        <li className="flex items-center gap-2">
                            <span
                                className="size-1.5 shrink-0 rounded-full bg-tijum-coral"
                                aria-hidden="true"
                            />
                            <span>
                                Check Spam or Updates folders if you don&apos;t
                                see the email within a minute.
                            </span>
                        </li>
                        <li className="flex items-center gap-2">
                            <span
                                className="size-1.5 shrink-0 rounded-full bg-tijum-coral"
                                aria-hidden="true"
                            />
                            <span>
                                Once verified, you can complete property KYC,
                                room setup, and payouts.
                            </span>
                        </li>
                    </ul>
                </div>

                <Form {...send.form()} className="flex flex-col gap-5">
                    {({ processing }) => (
                        <>
                            <Button
                                type="submit"
                                size="lg"
                                className="h-12 w-full rounded-xl"
                                loading={processing}
                            >
                                <Send className="size-4" aria-hidden="true" />
                                <span>Resend verification email</span>
                            </Button>

                            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-tijum-surface/75 pt-4 text-sm">
                                <TextLink
                                    href={dashboard.url()}
                                    className="font-semibold text-tijum-plum"
                                >
                                    Back to onboarding dashboard
                                </TextLink>

                                <Link
                                    href={logout.url()}
                                    method="post"
                                    as="button"
                                    className="inline-flex cursor-pointer items-center gap-1.5 font-heading text-xs font-semibold text-tijum-plum-muted transition-colors hover:text-tijum-plum"
                                >
                                    <LogOut
                                        className="size-3.5"
                                        aria-hidden="true"
                                    />
                                    <span>Sign out</span>
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
        'Confirm your partner contact email to proceed into property onboarding and verification review.',
};

OwnerVerifyEmail.layout = OwnerVerifyEmail.authMeta;

import { Form, Head, Link } from '@inertiajs/react';
import { MailCheck, Send } from 'lucide-react';
import TextLink from '@/components/text-link';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { logout } from '@/routes';
import { edit as profileEdit } from '@/routes/profile';
import { send } from '@/routes/verification';

export default function VerifyEmail({ status }: { status?: string }) {
    return (
        <>
            <Head title="Email verification" />

            {status === 'verification-link-sent' && (
                <Alert variant="success" className="mb-5 text-left">
                    <MailCheck aria-hidden="true" />
                    <AlertTitle>Verification link sent</AlertTitle>
                    <AlertDescription>
                        A fresh verification link has been sent to the email
                        address on your customer profile.
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
                            Check your email inbox
                        </p>
                        <p className="text-xs leading-relaxed text-tijum-plum-muted">
                            Open the verification link sent to your email
                            address to activate full customer portal access.
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
                                    href={profileEdit()}
                                    className="font-semibold"
                                >
                                    Update email in Profile
                                </TextLink>

                                <Link
                                    href={logout()}
                                    method="post"
                                    as="button"
                                    className="cursor-pointer font-heading text-xs font-semibold text-tijum-plum-muted underline underline-offset-4 transition-colors hover:text-tijum-plum"
                                >
                                    Log out
                                </Link>
                            </div>
                        </>
                    )}
                </Form>
            </div>
        </>
    );
}

VerifyEmail.authMeta = {
    title: 'Verify your customer email',
    description:
        'Please verify your email address using the link we emailed to you before accessing protected customer pages.',
};

VerifyEmail.layout = VerifyEmail.authMeta;

import { Form, Head, Link } from '@inertiajs/react';
import { CheckCircle2, LogOut, MailCheck, Send } from 'lucide-react';
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
                    <CheckCircle2 aria-hidden="true" />
                    <AlertTitle>Verification link sent</AlertTitle>
                    <AlertDescription>
                        A fresh verification link has been sent to the email
                        address on your customer profile.
                    </AlertDescription>
                </Alert>
            )}

            <div className="space-y-5">
                <div className="rounded-2xl border border-tijum-surface/85 bg-tijum-cream/55 p-5">
                    <div className="flex items-start gap-3.5">
                        <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-2xl bg-white text-tijum-coral shadow-2xs ring-1 ring-tijum-surface/70">
                            <MailCheck className="size-5" aria-hidden="true" />
                        </span>
                        <div className="space-y-1">
                            <p className="font-heading text-sm font-semibold text-tijum-plum">
                                Check your email inbox
                            </p>
                            <p className="text-xs leading-relaxed text-tijum-plum-muted">
                                Open the verification link we sent to activate
                                full customer access for bookings, wishlists,
                                and receipts.
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
                                Check Spam or Promotions if it hasn&apos;t
                                arrived within a minute.
                            </span>
                        </li>
                        <li className="flex items-center gap-2">
                            <span
                                className="size-1.5 shrink-0 rounded-full bg-tijum-coral"
                                aria-hidden="true"
                            />
                            <span>
                                Used the wrong address? Update it directly from
                                your profile settings.
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
                                    href={profileEdit()}
                                    className="font-semibold text-tijum-plum"
                                >
                                    Update email in Profile
                                </TextLink>

                                <Link
                                    href={logout()}
                                    method="post"
                                    as="button"
                                    className="inline-flex cursor-pointer items-center gap-1.5 font-heading text-xs font-semibold text-tijum-plum-muted transition-colors hover:text-tijum-plum"
                                >
                                    <LogOut
                                        className="size-3.5"
                                        aria-hidden="true"
                                    />
                                    <span>Log out</span>
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
    title: 'Verify your email',
    description:
        'Confirm your email address using the link we sent before accessing protected customer pages.',
};

VerifyEmail.layout = VerifyEmail.authMeta;

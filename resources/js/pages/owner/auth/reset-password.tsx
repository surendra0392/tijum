import { Form, Head } from '@inertiajs/react';
import { ArrowLeft, Lock, Mail, ShieldCheck } from 'lucide-react';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { login } from '@/routes/owner';
import { update } from '@/routes/owner/password';

type OwnerResetPasswordProps = {
    token: string;
    email: string;
};

export default function OwnerResetPassword({
    token,
    email,
}: OwnerResetPasswordProps) {
    return (
        <>
            <Head title="Set Partner Password" />

            <Form
                {...update.form()}
                resetOnSuccess={['password', 'password_confirmation']}
                className="flex flex-col gap-5"
            >
                {({ processing, errors }) => (
                    <>
                        <input type="hidden" name="token" value={token} />

                        <div className="grid gap-4">
                            <div className="grid gap-2">
                                <Label
                                    htmlFor="email"
                                    className="text-[13px] font-semibold text-tijum-plum"
                                >
                                    Partner email address
                                </Label>
                                <div className="relative">
                                    <Mail
                                        className="pointer-events-none absolute top-1/2 left-3.5 z-10 size-4 -translate-y-1/2 text-tijum-plum-muted/80"
                                        aria-hidden="true"
                                    />
                                    <Input
                                        id="email"
                                        type="email"
                                        name="email"
                                        defaultValue={email}
                                        required
                                        autoComplete="email"
                                        className="bg-tijum-cream/40 pl-10 focus-visible:bg-white"
                                        aria-invalid={Boolean(errors.email)}
                                        aria-describedby={
                                            errors.email
                                                ? 'email-error'
                                                : undefined
                                        }
                                    />
                                </div>
                                <InputError
                                    id="email-error"
                                    message={errors.email}
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label
                                    htmlFor="password"
                                    className="text-[13px] font-semibold text-tijum-plum"
                                >
                                    New password
                                </Label>
                                <div className="relative">
                                    <Lock
                                        className="pointer-events-none absolute top-1/2 left-3.5 z-10 size-4 -translate-y-1/2 text-tijum-plum-muted/80"
                                        aria-hidden="true"
                                    />
                                    <PasswordInput
                                        id="password"
                                        name="password"
                                        required
                                        autoFocus
                                        autoComplete="new-password"
                                        placeholder="Choose a strong password"
                                        className="bg-tijum-cream/25 pl-10 focus-visible:bg-white"
                                        aria-invalid={Boolean(errors.password)}
                                        aria-describedby={
                                            errors.password
                                                ? 'password-error'
                                                : undefined
                                        }
                                    />
                                </div>
                                <InputError
                                    id="password-error"
                                    message={errors.password}
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label
                                    htmlFor="password_confirmation"
                                    className="text-[13px] font-semibold text-tijum-plum"
                                >
                                    Confirm new password
                                </Label>
                                <div className="relative">
                                    <Lock
                                        className="pointer-events-none absolute top-1/2 left-3.5 z-10 size-4 -translate-y-1/2 text-tijum-plum-muted/80"
                                        aria-hidden="true"
                                    />
                                    <PasswordInput
                                        id="password_confirmation"
                                        name="password_confirmation"
                                        required
                                        autoComplete="new-password"
                                        placeholder="Re-enter your new password"
                                        className="bg-tijum-cream/25 pl-10 focus-visible:bg-white"
                                        aria-invalid={Boolean(
                                            errors.password_confirmation,
                                        )}
                                        aria-describedby={
                                            errors.password_confirmation
                                                ? 'password-confirmation-error'
                                                : undefined
                                        }
                                    />
                                </div>
                                <InputError
                                    id="password-confirmation-error"
                                    message={errors.password_confirmation}
                                />
                            </div>
                        </div>

                        <Button
                            type="submit"
                            size="lg"
                            className="h-12 w-full rounded-xl"
                            loading={processing}
                        >
                            <ShieldCheck
                                className="size-4"
                                aria-hidden="true"
                            />
                            <span>Update partner password</span>
                        </Button>

                        <div className="pt-1 text-center">
                            <TextLink
                                href={login()}
                                className="inline-flex items-center gap-1.5 text-sm font-semibold text-tijum-plum no-underline hover:text-tijum-coral"
                            >
                                <ArrowLeft
                                    className="size-3.5"
                                    aria-hidden="true"
                                />
                                <span>Return to partner sign in</span>
                            </TextLink>
                        </div>
                    </>
                )}
            </Form>
        </>
    );
}

OwnerResetPassword.authMeta = {
    title: 'Choose a new partner password',
    description:
        'Set a fresh password to regain access to your TIJUM Partner Portal.',
};

OwnerResetPassword.layout = OwnerResetPassword.authMeta;

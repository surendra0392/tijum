import { Form, Head } from '@inertiajs/react';
import { ArrowLeft, Lock, Mail, ShieldCheck } from 'lucide-react';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { login } from '@/routes';
import { update } from '@/routes/password';

type Props = {
    token: string;
    email: string;
    passwordRules: string;
};

export default function ResetPassword({ token, email, passwordRules }: Props) {
    return (
        <>
            <Head title="Reset password" />

            <Form
                {...update.form()}
                transform={(data) => ({ ...data, token, email })}
                resetOnSuccess={['password', 'password_confirmation']}
                className="flex flex-col gap-5"
            >
                {({ processing, errors }) => (
                    <>
                        <div className="grid gap-4">
                            <div className="grid gap-2">
                                <Label
                                    htmlFor="email"
                                    className="text-[13px] font-semibold text-tijum-plum"
                                >
                                    Account email
                                </Label>
                                <div className="relative">
                                    <Mail
                                        className="pointer-events-none absolute top-1/2 left-3.5 z-10 size-4 -translate-y-1/2 text-tijum-plum-muted/75"
                                        aria-hidden="true"
                                    />
                                    <Input
                                        id="email"
                                        type="email"
                                        name="email"
                                        autoComplete="email"
                                        value={email}
                                        readOnly
                                        className="bg-tijum-cream/60 pl-10"
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
                                        autoComplete="new-password"
                                        autoFocus
                                        placeholder="Choose a strong password"
                                        passwordrules={passwordRules}
                                        className="bg-white pl-10 shadow-2xs"
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
                                        passwordrules={passwordRules}
                                        className="bg-white pl-10 shadow-2xs"
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
                            data-test="reset-password-button"
                        >
                            <ShieldCheck
                                className="size-4"
                                aria-hidden="true"
                            />
                            <span>Update password</span>
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
                                <span>Back to log in</span>
                            </TextLink>
                        </div>
                    </>
                )}
            </Form>
        </>
    );
}

ResetPassword.authMeta = {
    title: 'Choose a new password',
    description:
        'Set a fresh password to secure your TIJUM customer account.',
};

ResetPassword.layout = ResetPassword.authMeta;

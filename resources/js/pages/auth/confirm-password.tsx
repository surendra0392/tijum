import { Form, Head } from '@inertiajs/react';
import { Lock, ShieldCheck } from 'lucide-react';
import {
    index as confirmOptions,
    store as confirmStore,
} from '@/actions/Laravel/Passkeys/Http/Controllers/PasskeyConfirmationController';
import InputError from '@/components/input-error';
import PasskeyVerify from '@/components/passkey-verify';
import PasswordInput from '@/components/password-input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { store } from '@/routes/password/confirm';

export default function ConfirmPassword() {
    return (
        <>
            <Head title="Confirm password" />

            <div className="mb-6 flex items-center gap-3 rounded-2xl border border-tijum-surface/85 bg-tijum-cream/55 p-3.5">
                <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-white text-tijum-coral shadow-2xs ring-1 ring-tijum-surface/70">
                    <ShieldCheck className="size-4" aria-hidden="true" />
                </span>
                <p className="text-xs leading-relaxed text-tijum-plum-muted">
                    Quick security check before updating sensitive account or
                    authentication settings.
                </p>
            </div>

            <PasskeyVerify
                routes={{
                    options: confirmOptions(),
                    submit: confirmStore(),
                }}
                label="Confirm with passkey"
                loadingLabel="Confirming..."
                separator="or confirm with password"
            />

            <Form
                {...store.form()}
                resetOnSuccess={['password']}
                className="flex flex-col gap-5"
            >
                {({ processing, errors }) => (
                    <>
                        <div className="grid gap-2">
                            <Label
                                htmlFor="password"
                                className="text-[13px] font-semibold text-tijum-plum"
                            >
                                Current password
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
                                    placeholder="Enter your current password"
                                    autoComplete="current-password"
                                    autoFocus
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

                        <Button
                            type="submit"
                            size="lg"
                            className="h-12 w-full rounded-xl"
                            loading={processing}
                            data-test="confirm-password-button"
                        >
                            <ShieldCheck
                                className="size-4"
                                aria-hidden="true"
                            />
                            <span>Confirm password</span>
                        </Button>
                    </>
                )}
            </Form>
        </>
    );
}

ConfirmPassword.authMeta = {
    title: 'Confirm your password',
    description:
        'This is a protected security area. Verify your identity before continuing.',
};

ConfirmPassword.layout = ConfirmPassword.authMeta;

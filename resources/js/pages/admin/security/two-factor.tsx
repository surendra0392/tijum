import { Form, Head, Link } from '@inertiajs/react';
import {
    CheckCircle2,
    Info,
    KeyRound,
    Lock,
    QrCode,
    ShieldAlert,
    ShieldCheck,
} from 'lucide-react';
import { FormField } from '@/components/shared/form-field';
import { StatCard } from '@/components/shared/info-card';
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
import { dashboard } from '@/routes/admin';
import {
    confirm,
    enable,
    recoveryCodes as regenerate,
    setup,
} from '@/routes/admin/two-factor';

type AdminTwoFactorSetupProps = {
    twoFactorEnabled: boolean;
    pendingEnrollment: boolean;
    qrCodeSvg: string | null;
    setupKey: string | null;
    recoveryCodes: string[] | null;
    recoveryCodesRemaining: number;
    status?: string;
};

export default function AdminTwoFactorSetup({
    twoFactorEnabled,
    pendingEnrollment,
    qrCodeSvg,
    setupKey,
    recoveryCodes,
    recoveryCodesRemaining,
    status,
}: AdminTwoFactorSetupProps) {
    const isSuccessStatus =
        status === 'two-factor-confirmed' ||
        status === 'recovery-codes-regenerated';

    return (
        <>
            <Head title="Admin Two-Factor Security" />

            <div className="mx-auto max-w-4xl space-y-6 pb-12">
                <PageHeader
                    eyebrow="Administrator Security Barrier"
                    title="Administrator TOTP security"
                    description="Mandatory multi-factor authentication bound strictly to the TIJUM admin guard."
                    badges={
                        <StatusBadge
                            status={twoFactorEnabled ? 'verified' : 'pending'}
                            label={
                                twoFactorEnabled
                                    ? 'TOTP Enforced'
                                    : 'Setup Required'
                            }
                        />
                    }
                />

                {status && (
                    <Alert variant={isSuccessStatus ? 'success' : 'info'}>
                        {isSuccessStatus ? (
                            <CheckCircle2 aria-hidden="true" />
                        ) : (
                            <Info aria-hidden="true" />
                        )}
                        <AlertTitle className="text-xs font-semibold">
                            {status === 'two-factor-confirmed'
                                ? 'Two-Factor Authentication Activated'
                                : status === 'recovery-codes-regenerated'
                                  ? 'Recovery Codes Regenerated'
                                  : status === 'two-factor-enrollment-started'
                                    ? 'Authenticator Enrollment Ready'
                                    : 'Security Notice'}
                        </AlertTitle>
                        <AlertDescription>
                            {status === 'two-factor-confirmed'
                                ? 'TOTP two-factor authentication is confirmed. Save your recovery codes below before continuing.'
                                : status === 'recovery-codes-regenerated'
                                  ? 'New single-use recovery codes have been generated. Previous codes are invalidated.'
                                  : status === 'two-factor-enrollment-started'
                                    ? 'Scan the QR code below and enter the 6-digit code from your authenticator app.'
                                    : status}
                        </AlertDescription>
                    </Alert>
                )}

                <section
                    aria-label="Two-factor security overview"
                    className="grid gap-4 sm:grid-cols-3"
                >
                    <StatCard
                        label="TOTP Protection"
                        value={
                            twoFactorEnabled
                                ? 'Enforced'
                                : pendingEnrollment
                                  ? 'Awaiting Code'
                                  : 'Setup Required'
                        }
                        helperText="RFC 6238 authenticator"
                        icon={ShieldCheck}
                    />
                    <StatCard
                        label="Recovery Codes"
                        value={recoveryCodesRemaining}
                        helperText="Unused single-use codes"
                        icon={KeyRound}
                    />
                    <StatCard
                        label="Security Boundary"
                        value="Admin Guard"
                        helperText="Isolated staff session"
                        icon={Lock}
                    />
                </section>

                {!twoFactorEnabled && !pendingEnrollment && (
                    <Card className="border-l-4 border-l-amber-500">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2.5 text-base sm:text-lg">
                                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-status-warning-border bg-status-warning-bg text-status-warning-fg">
                                    <ShieldAlert
                                        className="size-4.5"
                                        aria-hidden="true"
                                    />
                                </span>
                                <span>Complete mandatory TOTP enrollment</span>
                            </CardTitle>
                            <CardDescription>
                                Administrator dashboard routes remain locked
                                until TOTP two-factor authentication is enrolled
                                and confirmed.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Form {...enable.form()}>
                                {({ processing }) => (
                                    <Button
                                        type="submit"
                                        variant="plum"
                                        loading={processing}
                                    >
                                        Generate TOTP Setup Key
                                    </Button>
                                )}
                            </Form>
                        </CardContent>
                    </Card>
                )}

                {pendingEnrollment && qrCodeSvg && setupKey && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2.5 text-base sm:text-lg">
                                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-tijum-peach/80 bg-tijum-cream text-tijum-coral dark:border-tijum-coral/35 dark:bg-tijum-coral/15 dark:text-tijum-coral">
                                    <QrCode
                                        className="size-4.5"
                                        aria-hidden="true"
                                    />
                                </span>
                                <span>
                                    Scan QR code and confirm authenticator
                                </span>
                            </CardTitle>
                            <CardDescription>
                                Add this account to Google Authenticator,
                                1Password, or any RFC 6238 TOTP app, then verify
                                with a live 6-digit code.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-6 md:grid-cols-2">
                            <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-tijum-surface/80 bg-tijum-cream/40 p-5 dark:border-border dark:bg-muted/45">
                                <div
                                    className="rounded-xl border border-tijum-surface/80 p-3.5 shadow-xs dark:border-border"
                                    style={{ backgroundColor: '#ffffff' }}
                                    dangerouslySetInnerHTML={{
                                        __html: qrCodeSvg,
                                    }}
                                />
                                <div className="w-full text-center">
                                    <p className="font-heading text-xs font-semibold tracking-wider text-tijum-plum-muted uppercase dark:text-muted-foreground">
                                        Manual setup key
                                    </p>
                                    <code className="mt-1.5 inline-block rounded-lg border border-tijum-surface/80 bg-card px-3 py-1.5 font-mono text-xs font-semibold tracking-wider break-all text-tijum-plum dark:border-border dark:bg-card dark:text-foreground">
                                        {setupKey}
                                    </code>
                                </div>
                            </div>

                            <Form
                                {...confirm.form()}
                                resetOnSuccess={['code']}
                                className="flex flex-col justify-center gap-4"
                            >
                                {({ processing, errors }) => (
                                    <>
                                        <FormField
                                            id="code"
                                            label="6-digit confirmation code"
                                            required
                                            error={errors.code}
                                        >
                                            {(a11y) => (
                                                <Input
                                                    {...a11y}
                                                    type="text"
                                                    name="code"
                                                    required
                                                    autoFocus
                                                    inputMode="numeric"
                                                    autoComplete="one-time-code"
                                                    maxLength={6}
                                                    placeholder="000000"
                                                    className="font-heading text-base tracking-[0.35em] tabular-nums"
                                                />
                                            )}
                                        </FormField>

                                        <Button
                                            type="submit"
                                            variant="plum"
                                            loading={processing}
                                        >
                                            Confirm &amp; Activate TOTP
                                        </Button>
                                    </>
                                )}
                            </Form>
                        </CardContent>
                    </Card>
                )}

                {twoFactorEnabled && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2.5 text-base sm:text-lg">
                                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-status-success-border bg-status-success-bg text-status-success-fg">
                                    <ShieldCheck
                                        className="size-4.5"
                                        aria-hidden="true"
                                    />
                                </span>
                                <span>Two-factor protection active</span>
                            </CardTitle>
                            <CardDescription>
                                Your encrypted TOTP secret is verified.{' '}
                                <span className="font-semibold text-tijum-plum tabular-nums dark:text-foreground">
                                    {recoveryCodesRemaining}
                                </span>{' '}
                                unused recovery code(s) remain stored.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="flex flex-wrap items-center gap-3">
                            <Button variant="default" asChild>
                                <Link href={dashboard()}>
                                    <CheckCircle2 aria-hidden="true" />
                                    <span>Open Admin Overview</span>
                                </Link>
                            </Button>

                            <Form {...regenerate.form()}>
                                {({ processing }) => (
                                    <Button
                                        type="submit"
                                        variant="outline"
                                        loading={processing}
                                    >
                                        <KeyRound aria-hidden="true" />
                                        <span>Regenerate Recovery Codes</span>
                                    </Button>
                                )}
                            </Form>
                        </CardContent>
                    </Card>
                )}

                {recoveryCodes && recoveryCodes.length > 0 && (
                    <Alert variant="warning">
                        <KeyRound aria-hidden="true" />
                        <AlertTitle>
                            Single-use recovery codes (store securely now)
                        </AlertTitle>
                        <AlertDescription className="w-full">
                            <p className="mb-3 text-sm">
                                Each code can be used once if you lose access to
                                your authenticator device.
                            </p>
                            <div className="grid w-full grid-cols-1 gap-2 rounded-xl border border-tijum-surface/80 bg-card p-4 font-mono text-xs text-tijum-plum tabular-nums sm:grid-cols-2 dark:border-border dark:bg-card dark:text-foreground">
                                {recoveryCodes.map((code) => (
                                    <div
                                        key={code}
                                        className="rounded-lg border border-tijum-surface/60 bg-tijum-cream/40 px-3 py-1.5 select-all dark:border-border dark:bg-muted/45"
                                    >
                                        {code}
                                    </div>
                                ))}
                            </div>
                        </AlertDescription>
                    </Alert>
                )}
            </div>
        </>
    );
}

AdminTwoFactorSetup.layout = {
    breadcrumbs: [
        {
            title: 'Admin Overview',
            href: dashboard(),
        },
        {
            title: 'Two-Factor Security',
            href: setup(),
        },
    ],
};

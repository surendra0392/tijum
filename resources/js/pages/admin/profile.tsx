import { Head, Link, router } from '@inertiajs/react';
import {
    Calendar,
    Check,
    CheckCircle2,
    Clock,
    Fingerprint,
    Info,
    KeyRound,
    Lock,
    Mail,
    Save,
    Shield,
    ShieldCheck,
    User,
    UserCheck,
} from 'lucide-react';
import { useState, type FormEvent } from 'react';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import { StatCard } from '@/components/shared/info-card';
import { PageHeader } from '@/components/shared/page-header';
import { StatusBadge } from '@/components/shared/status-badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useInitials } from '@/hooks/use-initials';
import { dashboard } from '@/routes/admin';
import {
    edit as profileEdit,
    update as profileUpdate,
} from '@/routes/admin/profile';
import { update as passwordUpdate } from '@/routes/admin/profile/password';
import { setup as twoFactorSetup } from '@/routes/admin/two-factor';

interface AdminProfileData {
    id: number;
    name: string;
    email: string;
    role: string;
    role_label: string;
    permissions: string[];
    is_active: boolean;
    email_verified_at?: string | null;
    two_factor_enabled: boolean;
    two_factor_confirmed_at?: string | null;
    created_at?: string | null;
    updated_at?: string | null;
}

interface AdminProfilePageProps {
    admin: AdminProfileData;
    status?: string;
    errors?: Record<string, string>;
}

export default function AdminProfile({
    admin,
    status,
    errors = {},
}: AdminProfilePageProps) {
    const getInitials = useInitials();

    // Profile form state
    const [name, setName] = useState(admin.name);
    const [email, setEmail] = useState(admin.email);
    const [isSavingProfile, setIsSavingProfile] = useState(false);

    // Password form state
    const [currentPassword, setCurrentPassword] = useState('');
    const [password, setPassword] = useState('');
    const [passwordConfirmation, setPasswordConfirmation] = useState('');
    const [isSavingPassword, setIsSavingPassword] = useState(false);

    const handleProfileSubmit = (e: FormEvent) => {
        e.preventDefault();
        setIsSavingProfile(true);

        router.patch(
            profileUpdate.url(),
            { name, email },
            {
                preserveScroll: true,
                onFinish: () => setIsSavingProfile(false),
            },
        );
    };

    const handlePasswordSubmit = (e: FormEvent) => {
        e.preventDefault();
        setIsSavingPassword(true);

        router.put(
            passwordUpdate.url(),
            {
                current_password: currentPassword,
                password,
                password_confirmation: passwordConfirmation,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setCurrentPassword('');
                    setPassword('');
                    setPasswordConfirmation('');
                },
                onFinish: () => setIsSavingPassword(false),
            },
        );
    };

    const isLengthValid = password.length >= 8;
    const isMatching = password.length > 0 && password === passwordConfirmation;

    return (
        <div className="space-y-6 pb-12">
            <Head title="Admin Profile · TIJUM Admin Console" />

            <PageHeader
                eyebrow="Account & Security"
                title="Administrator Profile"
                description="Manage your staff profile details, login password, two-factor authentication, and review your assigned system capabilities."
                badges={
                    <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="plum">{admin.role_label}</Badge>
                        <StatusBadge
                            status={admin.is_active ? 'active' : 'suspended'}
                            label={
                                admin.is_active ? 'Active Staff' : 'Inactive'
                            }
                        />
                    </div>
                }
                actions={
                    <Button asChild variant="outline" size="sm">
                        <Link href={twoFactorSetup.url()}>
                            <ShieldCheck
                                className="size-4 text-status-success-fg"
                                aria-hidden="true"
                            />
                            <span>2FA Security Settings</span>
                        </Link>
                    </Button>
                }
            />

            {/* Success Status Notifications */}
            {status === 'profile-updated' && (
                <Alert variant="success">
                    <CheckCircle2 aria-hidden="true" />
                    <AlertTitle className="text-xs font-semibold">
                        Profile Updated
                    </AlertTitle>
                    <AlertDescription className="text-xs">
                        Your administrator profile details have been saved
                        successfully.
                    </AlertDescription>
                </Alert>
            )}

            {status === 'password-updated' && (
                <Alert variant="success">
                    <CheckCircle2 aria-hidden="true" />
                    <AlertTitle className="text-xs font-semibold">
                        Password Changed
                    </AlertTitle>
                    <AlertDescription className="text-xs">
                        Your account password has been updated. Please use the
                        new credentials on your next sign-in.
                    </AlertDescription>
                </Alert>
            )}

            {/* Account Summary KPIs */}
            <section
                aria-label="Administrator account overview"
                className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
            >
                <StatCard
                    label="Staff Role"
                    value={admin.role_label}
                    helperText={`Account ID #${admin.id}`}
                    icon={UserCheck}
                />
                <StatCard
                    label="Account Status"
                    value={admin.is_active ? 'Active' : 'Inactive'}
                    helperText="Console access state"
                    icon={ShieldCheck}
                />
                <StatCard
                    label="Two-Factor (TOTP)"
                    value={
                        admin.two_factor_enabled ? 'Enforced' : 'Setup Required'
                    }
                    helperText={
                        admin.two_factor_confirmed_at
                            ? `Verified ${new Date(admin.two_factor_confirmed_at).toLocaleDateString()}`
                            : 'Authenticator verification'
                    }
                    icon={Fingerprint}
                />
                <StatCard
                    label="Assigned Privileges"
                    value={admin.permissions.length}
                    helperText="Active capabilities"
                    icon={Shield}
                />
            </section>

            <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
                {/* Left Column: Forms */}
                <div className="space-y-6">
                    {/* Identity Overview Banner */}
                    <Card>
                        <CardContent className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                            <div className="flex items-center gap-4">
                                <div className="relative flex size-14 shrink-0 items-center justify-center rounded-2xl bg-tijum-plum font-heading text-lg font-bold text-tijum-cream shadow-xs dark:border dark:border-tijum-coral/35 dark:bg-tijum-coral/15 dark:text-tijum-peach">
                                    {getInitials(admin.name)}
                                    <span
                                        className={`absolute -right-1 -bottom-1 size-3.5 rounded-full border-2 border-white dark:border-card ${
                                            admin.two_factor_enabled
                                                ? 'bg-emerald-500'
                                                : 'bg-amber-500'
                                        }`}
                                        title={
                                            admin.two_factor_enabled
                                                ? '2FA Enabled'
                                                : '2FA Pending'
                                        }
                                    />
                                </div>
                                <div className="min-w-0 space-y-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <h2 className="font-heading text-lg font-bold text-tijum-plum dark:text-foreground">
                                            {admin.name}
                                        </h2>
                                        <Badge
                                            variant="secondary"
                                            className="text-[11px] tabular-nums"
                                        >
                                            ID #{admin.id}
                                        </Badge>
                                    </div>
                                    <p className="flex items-center gap-1.5 truncate text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                        <Mail
                                            className="size-3.5 shrink-0"
                                            aria-hidden="true"
                                        />
                                        <span className="truncate">
                                            {admin.email}
                                        </span>
                                    </p>
                                </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                                <Button asChild variant="outline" size="sm">
                                    <Link href={twoFactorSetup.url()}>
                                        <ShieldCheck
                                            className="size-3.5 text-status-success-fg"
                                            aria-hidden="true"
                                        />
                                        <span>2FA Security Settings</span>
                                    </Link>
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Edit Profile Information */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2.5 text-base sm:text-lg">
                                <span className="flex size-8 shrink-0 items-center justify-center rounded-xl border border-tijum-peach/80 bg-tijum-cream text-tijum-coral dark:border-tijum-coral/35 dark:bg-tijum-coral/15 dark:text-tijum-coral">
                                    <User
                                        className="size-4"
                                        aria-hidden="true"
                                    />
                                </span>
                                <span>Profile Information</span>
                            </CardTitle>
                            <CardDescription className="text-xs sm:text-sm">
                                Update your administrative display name and
                                official staff email address.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form
                                onSubmit={handleProfileSubmit}
                                className="space-y-4"
                            >
                                <div className="space-y-1.5">
                                    <Label
                                        htmlFor="admin_name"
                                        className="flex items-center gap-1.5 font-heading text-xs font-semibold text-tijum-plum dark:text-foreground"
                                    >
                                        <User
                                            className="size-3.5 text-tijum-plum-muted dark:text-muted-foreground"
                                            aria-hidden="true"
                                        />
                                        <span>Full Name *</span>
                                    </Label>
                                    <div className="relative">
                                        <User
                                            className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-tijum-plum-muted/70 dark:text-muted-foreground"
                                            aria-hidden="true"
                                        />
                                        <Input
                                            id="admin_name"
                                            type="text"
                                            value={name}
                                            onChange={(e) =>
                                                setName(e.target.value)
                                            }
                                            placeholder="e.g. Rahul Sharma"
                                            className="h-10.5 pl-10 text-sm"
                                            required
                                        />
                                    </div>
                                    <InputError
                                        message={errors.name}
                                        className="text-xs"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <Label
                                        htmlFor="admin_email"
                                        className="flex items-center gap-1.5 font-heading text-xs font-semibold text-tijum-plum dark:text-foreground"
                                    >
                                        <Mail
                                            className="size-3.5 text-tijum-plum-muted dark:text-muted-foreground"
                                            aria-hidden="true"
                                        />
                                        <span>Staff Email Address *</span>
                                    </Label>
                                    <div className="relative">
                                        <Mail
                                            className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-tijum-plum-muted/70 dark:text-muted-foreground"
                                            aria-hidden="true"
                                        />
                                        <Input
                                            id="admin_email"
                                            type="email"
                                            value={email}
                                            onChange={(e) =>
                                                setEmail(e.target.value)
                                            }
                                            placeholder="e.g. rahul.sharma@tijum.com"
                                            className="h-10.5 pl-10 text-sm"
                                            required
                                        />
                                    </div>
                                    <InputError
                                        message={errors.email}
                                        className="text-xs"
                                    />
                                </div>

                                <div className="flex justify-end pt-2">
                                    <Button
                                        type="submit"
                                        variant="plum"
                                        size="sm"
                                        loading={isSavingProfile}
                                        disabled={!name.trim() || !email.trim()}
                                    >
                                        {!isSavingProfile && (
                                            <Save
                                                className="size-3.5"
                                                aria-hidden="true"
                                            />
                                        )}
                                        <span>
                                            {isSavingProfile
                                                ? 'Saving Changes...'
                                                : 'Save Profile Changes'}
                                        </span>
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>

                    {/* Change Password */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2.5 text-base sm:text-lg">
                                <span className="flex size-8 shrink-0 items-center justify-center rounded-xl border border-tijum-peach/80 bg-tijum-cream text-tijum-coral dark:border-tijum-coral/35 dark:bg-tijum-coral/15 dark:text-tijum-coral">
                                    <KeyRound
                                        className="size-4"
                                        aria-hidden="true"
                                    />
                                </span>
                                <span>Update Password</span>
                            </CardTitle>
                            <CardDescription className="text-xs sm:text-sm">
                                Ensure your admin account is using a long,
                                random password to maintain platform security.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form
                                onSubmit={handlePasswordSubmit}
                                className="space-y-4"
                            >
                                <div className="space-y-1.5">
                                    <Label
                                        htmlFor="current_password"
                                        className="flex items-center gap-1.5 font-heading text-xs font-semibold text-tijum-plum dark:text-foreground"
                                    >
                                        <Lock
                                            className="size-3.5 text-tijum-plum-muted dark:text-muted-foreground"
                                            aria-hidden="true"
                                        />
                                        <span>Current Password *</span>
                                    </Label>
                                    <PasswordInput
                                        id="current_password"
                                        value={currentPassword}
                                        onChange={(e) =>
                                            setCurrentPassword(e.target.value)
                                        }
                                        placeholder="Enter your current account password"
                                        className="h-10.5 text-sm"
                                        required
                                    />
                                    <InputError
                                        message={errors.current_password}
                                        className="text-xs"
                                    />
                                </div>

                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <div className="space-y-1.5">
                                        <Label
                                            htmlFor="new_password"
                                            className="flex items-center gap-1.5 font-heading text-xs font-semibold text-tijum-plum dark:text-foreground"
                                        >
                                            <KeyRound
                                                className="size-3.5 text-tijum-plum-muted dark:text-muted-foreground"
                                                aria-hidden="true"
                                            />
                                            <span>New Password *</span>
                                        </Label>
                                        <PasswordInput
                                            id="new_password"
                                            value={password}
                                            onChange={(e) =>
                                                setPassword(e.target.value)
                                            }
                                            placeholder="Min 8 chars, letters & numbers"
                                            className="h-10.5 text-sm"
                                            required
                                        />
                                        <InputError
                                            message={errors.password}
                                            className="text-xs"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label
                                            htmlFor="password_confirmation"
                                            className="flex items-center gap-1.5 font-heading text-xs font-semibold text-tijum-plum dark:text-foreground"
                                        >
                                            <ShieldCheck
                                                className="size-3.5 text-tijum-plum-muted dark:text-muted-foreground"
                                                aria-hidden="true"
                                            />
                                            <span>Confirm New Password *</span>
                                        </Label>
                                        <PasswordInput
                                            id="password_confirmation"
                                            value={passwordConfirmation}
                                            onChange={(e) =>
                                                setPasswordConfirmation(
                                                    e.target.value,
                                                )
                                            }
                                            placeholder="Re-enter your new password to verify"
                                            className="h-10.5 text-sm"
                                            required
                                        />
                                    </div>
                                </div>

                                {/* Password Criteria Hints */}
                                {password.length > 0 && (
                                    <div className="space-y-1.5 rounded-xl border border-tijum-surface/80 bg-tijum-cream/40 p-3.5 text-xs dark:border-border dark:bg-muted/45">
                                        <div className="flex items-center gap-2">
                                            {isLengthValid ? (
                                                <CheckCircle2
                                                    className="size-3.5 shrink-0 text-status-success-fg"
                                                    aria-hidden="true"
                                                />
                                            ) : (
                                                <Clock
                                                    className="size-3.5 shrink-0 text-tijum-plum-muted dark:text-muted-foreground"
                                                    aria-hidden="true"
                                                />
                                            )}
                                            <span
                                                className={
                                                    isLengthValid
                                                        ? 'font-medium text-status-success-fg'
                                                        : 'text-tijum-plum-muted dark:text-muted-foreground'
                                                }
                                            >
                                                At least 8 characters long
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {isMatching ? (
                                                <CheckCircle2
                                                    className="size-3.5 shrink-0 text-status-success-fg"
                                                    aria-hidden="true"
                                                />
                                            ) : (
                                                <Clock
                                                    className="size-3.5 shrink-0 text-tijum-plum-muted dark:text-muted-foreground"
                                                    aria-hidden="true"
                                                />
                                            )}
                                            <span
                                                className={
                                                    isMatching
                                                        ? 'font-medium text-status-success-fg'
                                                        : 'text-tijum-plum-muted dark:text-muted-foreground'
                                                }
                                            >
                                                New password and confirmation
                                                match
                                            </span>
                                        </div>
                                    </div>
                                )}

                                <div className="flex justify-end pt-2">
                                    <Button
                                        type="submit"
                                        variant="plum"
                                        size="sm"
                                        loading={isSavingPassword}
                                        disabled={
                                            !currentPassword ||
                                            !password ||
                                            password.length < 8 ||
                                            password !== passwordConfirmation
                                        }
                                    >
                                        {!isSavingPassword && (
                                            <Lock
                                                className="size-3.5"
                                                aria-hidden="true"
                                            />
                                        )}
                                        <span>
                                            {isSavingPassword
                                                ? 'Updating Password...'
                                                : 'Update Password'}
                                        </span>
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column: Roles, Permissions & Security */}
                <div className="space-y-6">
                    {/* Security & 2FA Status Card */}
                    <Card className="gap-4">
                        <CardHeader className="pb-1">
                            <CardTitle className="flex items-center gap-2 font-heading text-xs font-bold tracking-wider text-tijum-plum-muted uppercase dark:text-muted-foreground">
                                <Shield
                                    className="size-3.5 text-tijum-coral"
                                    aria-hidden="true"
                                />
                                <span>Security Credentials</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 text-xs">
                            <div className="flex items-center justify-between gap-2">
                                <span className="flex items-center gap-1.5 text-tijum-plum-muted dark:text-muted-foreground">
                                    <Fingerprint
                                        className="size-3.5 shrink-0"
                                        aria-hidden="true"
                                    />
                                    <span>Two-Factor Security:</span>
                                </span>
                                <StatusBadge
                                    status={
                                        admin.two_factor_enabled
                                            ? 'verified'
                                            : 'pending'
                                    }
                                    label={
                                        admin.two_factor_enabled
                                            ? 'TOTP Active'
                                            : 'Setup Required'
                                    }
                                    className="text-[11px]"
                                />
                            </div>

                            <div className="flex items-center justify-between gap-2">
                                <span className="flex items-center gap-1.5 text-tijum-plum-muted dark:text-muted-foreground">
                                    <UserCheck
                                        className="size-3.5 shrink-0"
                                        aria-hidden="true"
                                    />
                                    <span>Staff Role:</span>
                                </span>
                                <span className="font-heading font-semibold text-tijum-plum dark:text-foreground">
                                    {admin.role_label}
                                </span>
                            </div>

                            <div className="flex items-center justify-between gap-2">
                                <span className="flex items-center gap-1.5 text-tijum-plum-muted dark:text-muted-foreground">
                                    <CheckCircle2
                                        className="size-3.5 shrink-0 text-status-success-fg"
                                        aria-hidden="true"
                                    />
                                    <span>Account Status:</span>
                                </span>
                                <span
                                    className={`font-semibold ${
                                        admin.is_active
                                            ? 'text-status-success-fg'
                                            : 'text-status-error-fg'
                                    }`}
                                >
                                    {admin.is_active ? 'Active' : 'Inactive'}
                                </span>
                            </div>

                            {admin.created_at && (
                                <div className="flex items-center justify-between border-t border-tijum-surface/80 pt-3 text-[11px] text-tijum-plum-muted dark:border-border dark:text-muted-foreground">
                                    <span className="flex items-center gap-1.5">
                                        <Calendar
                                            className="size-3.5 shrink-0"
                                            aria-hidden="true"
                                        />
                                        <span>Joined Console:</span>
                                    </span>
                                    <span className="tabular-nums">
                                        {new Date(
                                            admin.created_at,
                                        ).toLocaleDateString()}
                                    </span>
                                </div>
                            )}

                            <div className="pt-2">
                                <Button
                                    asChild
                                    variant="outline"
                                    size="sm"
                                    className="w-full"
                                >
                                    <Link href={twoFactorSetup.url()}>
                                        <ShieldCheck
                                            className="size-3.5 text-status-success-fg"
                                            aria-hidden="true"
                                        />
                                        <span>Manage Two-Factor Security</span>
                                    </Link>
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Permissions & Capabilities Matrix */}
                    <Card className="gap-4">
                        <CardHeader className="pb-1">
                            <CardTitle className="flex items-center gap-2 font-heading text-xs font-bold tracking-wider text-tijum-plum-muted uppercase dark:text-muted-foreground">
                                <UserCheck
                                    className="size-3.5 text-tijum-coral"
                                    aria-hidden="true"
                                />
                                <span className="tabular-nums">
                                    Assigned Privileges (
                                    {admin.permissions.length})
                                </span>
                            </CardTitle>
                            <CardDescription className="text-xs">
                                Capabilities assigned under your{' '}
                                {admin.role_label} role.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3 text-xs">
                            <div className="max-h-72 space-y-1.5 overflow-y-auto pr-1">
                                {admin.permissions.map((perm) => (
                                    <div
                                        key={perm}
                                        className="flex items-center justify-between rounded-xl border border-tijum-surface/70 bg-tijum-cream/40 px-3 py-2 text-[11px] dark:border-border dark:bg-muted/45"
                                    >
                                        <span className="truncate font-mono text-tijum-plum dark:text-foreground">
                                            {perm}
                                        </span>
                                        <Check
                                            className="ml-2 size-3.5 shrink-0 text-status-success-fg"
                                            aria-hidden="true"
                                        />
                                    </div>
                                ))}
                            </div>

                            <p className="flex items-start gap-2 border-t border-tijum-surface/80 pt-3 text-[11px] leading-relaxed text-tijum-plum-muted dark:border-border dark:text-muted-foreground">
                                <Info
                                    className="mt-0.5 size-3.5 shrink-0"
                                    aria-hidden="true"
                                />
                                <span>
                                    Administrative role assignments and granular
                                    access levels are configured by Platform
                                    Super Administrators under System
                                    Management.
                                </span>
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}

AdminProfile.layout = {
    breadcrumbs: [
        { title: 'Admin Console', href: dashboard() },
        { title: 'Profile', href: profileEdit() },
    ],
};

import { Head } from '@inertiajs/react';
import {
    Check,
    Crown,
    Headphones,
    Info,
    Minus,
    Receipt,
    Shield,
    ShieldCheck,
    Wrench,
} from 'lucide-react';
import { Fragment, useState } from 'react';
import { PageHeader } from '@/components/shared/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { dashboard } from '@/routes/admin';
import { index as adminsIndex } from '@/routes/admin/system/admins';
import { index as rolesIndex } from '@/routes/admin/system/roles';

interface RoleSummary {
    value: string;
    label: string;
    is_super_admin: boolean;
    admin_count: number;
    permissions_count: string | number;
    permissions: string[];
}

interface PermissionItem {
    key: string;
    label: string;
}

interface PermissionDomain {
    domain: string;
    description: string;
    permissions: PermissionItem[];
}

interface Props {
    roles: RoleSummary[];
    permission_domains: PermissionDomain[];
}

export default function AdminRolesIndex({ roles, permission_domains }: Props) {
    const [selectedRole, setSelectedRole] = useState<string>('all');

    const roleIcons: Record<string, typeof Shield> = {
        super_admin: Crown,
        property_verification: ShieldCheck,
        operations: Wrench,
        finance: Receipt,
        customer_support: Headphones,
    };

    const hasPermission = (role: RoleSummary, permKey: string): boolean => {
        if (role.is_super_admin) return true;
        if (role.permissions.includes('*')) return true;
        return role.permissions.includes(permKey);
    };

    const filteredRoles =
        selectedRole === 'all'
            ? roles
            : roles.filter((r) => r.value === selectedRole);

    const totalCapabilities = permission_domains.reduce(
        (sum, group) => sum + group.permissions.length,
        0,
    );

    const activeRoleLabel = roles.find((r) => r.value === selectedRole)?.label;

    return (
        <>
            <Head title="Roles & Permissions — System Management — TIJUM" />

            <div className="space-y-6 pb-12">
                <PageHeader
                    eyebrow="System Management"
                    title="Roles & Permissions"
                    description="Inspect defined administrative roles, access control boundaries, and granular permission matrices."
                    badges={
                        <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="plum" className="tabular-nums">
                                {roles.length} Roles
                            </Badge>
                            <Badge variant="outline" className="tabular-nums">
                                {permission_domains.length} Domains ·{' '}
                                {totalCapabilities} Capabilities
                            </Badge>
                        </div>
                    }
                />

                {/* Role Summary Filter Cards */}
                <section
                    aria-label="Administrative role filters"
                    className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5"
                >
                    {roles.map((role) => {
                        const Icon = roleIcons[role.value] || Shield;
                        const isSuper = role.is_super_admin;
                        const isSelected = selectedRole === role.value;

                        return (
                            <button
                                key={role.value}
                                type="button"
                                aria-pressed={isSelected}
                                onClick={() =>
                                    setSelectedRole((prev) =>
                                        prev === role.value
                                            ? 'all'
                                            : role.value,
                                    )
                                }
                                className={`cursor-pointer rounded-[20px] border bg-card p-4 text-left shadow-tijum-card transition-all focus-visible:ring-2 focus-visible:ring-tijum-coral/40 focus-visible:outline-none ${
                                    isSelected
                                        ? 'border-tijum-coral shadow-tijum-soft ring-2 ring-tijum-coral/25 dark:border-tijum-coral dark:ring-tijum-coral/35'
                                        : 'border-tijum-surface/80 hover:border-tijum-coral/50 dark:border-border dark:hover:border-tijum-coral/50'
                                }`}
                            >
                                <div className="flex items-center justify-between gap-2">
                                    <span
                                        className={`flex size-10 items-center justify-center rounded-xl border ${
                                            isSuper
                                                ? 'border-status-warning-border bg-status-warning-bg text-status-warning-fg'
                                                : 'border-tijum-peach/80 bg-tijum-cream text-tijum-coral dark:border-tijum-coral/35 dark:bg-tijum-coral/15 dark:text-tijum-coral'
                                        }`}
                                    >
                                        <Icon
                                            className="size-4.5"
                                            aria-hidden="true"
                                        />
                                    </span>
                                    <Badge
                                        variant={
                                            isSelected ? 'peach' : 'outline'
                                        }
                                        className="text-[11px] font-semibold tabular-nums"
                                    >
                                        {role.admin_count} staff
                                    </Badge>
                                </div>

                                <div className="mt-3.5 space-y-0.5">
                                    <h2 className="font-heading text-sm font-bold text-tijum-plum dark:text-foreground">
                                        {role.label}
                                    </h2>
                                    <p className="text-xs text-tijum-plum-muted tabular-nums dark:text-muted-foreground">
                                        {isSuper
                                            ? 'Unrestricted Access'
                                            : `${role.permissions_count} capabilities`}
                                    </p>
                                </div>
                            </button>
                        );
                    })}
                </section>

                {/* Filter Notice */}
                {selectedRole !== 'all' && (
                    <Card className="border-l-4 border-l-tijum-coral py-3.5">
                        <CardContent className="flex flex-wrap items-center justify-between gap-3 px-5">
                            <div className="flex items-center gap-2.5 text-xs text-tijum-plum dark:text-foreground">
                                <Info
                                    className="size-4 shrink-0 text-tijum-coral"
                                    aria-hidden="true"
                                />
                                <span>
                                    Filtering matrix for{' '}
                                    <strong className="font-heading font-semibold">
                                        {activeRoleLabel}
                                    </strong>
                                    .
                                </span>
                            </div>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedRole('all')}
                            >
                                Show all roles
                            </Button>
                        </CardContent>
                    </Card>
                )}

                {/* Interactive Permission Matrix */}
                <Card className="gap-0 overflow-hidden py-0">
                    <CardHeader className="border-b border-tijum-surface/80 bg-tijum-cream/40 py-5 dark:border-border dark:bg-muted/35">
                        <CardTitle className="text-lg">
                            System Access Matrix
                        </CardTitle>
                        <CardDescription>
                            Comparison of granular security privileges assigned
                            to each administrative tier.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow className="hover:bg-transparent dark:hover:bg-transparent">
                                    <TableHead className="min-w-[240px] py-3.5">
                                        Domain &amp; Capability
                                    </TableHead>
                                    {filteredRoles.map((role) => (
                                        <TableHead
                                            key={role.value}
                                            className="min-w-[135px] py-3.5 text-center"
                                        >
                                            <div className="flex flex-col items-center gap-0.5">
                                                <span className="text-tijum-plum dark:text-foreground">
                                                    {role.label}
                                                </span>
                                                <span className="font-mono text-[10px] font-normal text-tijum-plum-muted lowercase tabular-nums dark:text-muted-foreground">
                                                    ({role.admin_count} users)
                                                </span>
                                            </div>
                                        </TableHead>
                                    ))}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {permission_domains.map((domainGroup) => (
                                    <Fragment key={domainGroup.domain}>
                                        {/* Domain Group Header */}
                                        <TableRow className="border-y border-tijum-surface/80 bg-tijum-cream/65 hover:bg-tijum-cream/65 dark:border-border dark:bg-muted/60 dark:hover:bg-muted/60">
                                            <TableCell
                                                colSpan={
                                                    filteredRoles.length + 1
                                                }
                                                className="px-4 py-2.5"
                                            >
                                                <div className="flex items-center justify-between gap-4">
                                                    <span className="font-heading text-xs font-bold tracking-wider text-tijum-plum uppercase dark:text-foreground">
                                                        {domainGroup.domain}
                                                    </span>
                                                    <span className="hidden text-[11px] font-normal text-tijum-plum-muted sm:inline dark:text-muted-foreground">
                                                        {
                                                            domainGroup.description
                                                        }
                                                    </span>
                                                </div>
                                            </TableCell>
                                        </TableRow>

                                        {/* Domain Permissions */}
                                        {domainGroup.permissions.map((perm) => (
                                            <TableRow key={perm.key}>
                                                <TableCell className="px-4 py-3">
                                                    <div className="flex flex-col gap-0.5">
                                                        <span className="text-xs font-medium text-tijum-plum sm:text-sm dark:text-foreground">
                                                            {perm.label}
                                                        </span>
                                                        <span className="font-mono text-[11px] text-tijum-plum-muted dark:text-muted-foreground">
                                                            {perm.key}
                                                        </span>
                                                    </div>
                                                </TableCell>
                                                {filteredRoles.map((role) => {
                                                    const allowed =
                                                        hasPermission(
                                                            role,
                                                            perm.key,
                                                        );

                                                    return (
                                                        <TableCell
                                                            key={`${role.value}-${perm.key}`}
                                                            className="px-3 py-3 text-center"
                                                        >
                                                            {allowed ? (
                                                                <span
                                                                    className="inline-flex size-7 items-center justify-center rounded-full border border-status-success-border bg-status-success-bg text-status-success-fg"
                                                                    aria-label={`${role.label} has ${perm.label}`}
                                                                >
                                                                    <Check
                                                                        className="size-3.5 stroke-[2.5]"
                                                                        aria-hidden="true"
                                                                    />
                                                                </span>
                                                            ) : (
                                                                <span
                                                                    className="inline-flex size-7 items-center justify-center rounded-full border border-tijum-surface/70 bg-tijum-cream/45 text-tijum-plum-muted/60 dark:border-border dark:bg-muted/50 dark:text-muted-foreground/50"
                                                                    aria-label={`${role.label} does not have ${perm.label}`}
                                                                >
                                                                    <Minus
                                                                        className="size-3.5"
                                                                        aria-hidden="true"
                                                                    />
                                                                </span>
                                                            )}
                                                        </TableCell>
                                                    );
                                                })}
                                            </TableRow>
                                        ))}
                                    </Fragment>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </>
    );
}

AdminRolesIndex.layout = {
    breadcrumbs: [
        { title: 'Admin Console', href: dashboard() },
        { title: 'System Management', href: adminsIndex() },
        { title: 'Roles & Permissions', href: rolesIndex() },
    ],
};

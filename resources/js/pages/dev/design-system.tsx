import { Head } from '@inertiajs/react';
import { Bell, Building2, CheckCircle2, Layers, Palette } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import BrandLogo from '@/components/brand/brand-logo';
import PasswordInput from '@/components/password-input';
import { ConfirmationDialog } from '@/components/shared/confirmation-dialog';
import {
    DataTable,
    type DataTableColumn,
} from '@/components/shared/data-table';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import {
    FileUploadField,
    FormField,
    MultiSelectCheckboxGroup,
} from '@/components/shared/form-field';
import {
    InfoPanel,
    PropertySummaryCard,
    StatCard,
} from '@/components/shared/info-card';
import { LoadingState } from '@/components/shared/loading-state';
import { PageHeader } from '@/components/shared/page-header';
import { Pagination } from '@/components/shared/pagination';
import { ResponsiveContainer } from '@/components/shared/responsive-container';
import {
    StatusBadge,
    type SemanticStatus,
} from '@/components/shared/status-badge';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioOption } from '@/components/ui/radio-group';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { home } from '@/routes';
import { designSystem } from '@/routes/dev';

type SampleShowcaseRow = {
    id: number;
    component: string;
    category: string;
    portal: string;
    status: SemanticStatus;
};

const sampleTableRows: SampleShowcaseRow[] = [
    {
        id: 1,
        component: 'BrandLogo',
        category: 'Brand Identity',
        portal: 'All Portals',
        status: 'verified',
    },
    {
        id: 2,
        component: 'DataTable & Pagination',
        category: 'Data Display',
        portal: 'Owner / Admin',
        status: 'active',
    },
    {
        id: 3,
        component: 'ConfirmationDialog',
        category: 'Overlays',
        portal: 'All Portals',
        status: 'completed',
    },
];

const sampleColumns: DataTableColumn<SampleShowcaseRow>[] = [
    {
        key: 'component',
        header: 'Component',
        isRowHeader: true,
        render: (row) => row.component,
    },
    {
        key: 'category',
        header: 'Category',
        render: (row) => row.category,
    },
    {
        key: 'portal',
        header: 'Portal Scope',
        render: (row) => row.portal,
    },
    {
        key: 'status',
        header: 'Status',
        render: (row) => <StatusBadge status={row.status} />,
    },
];

const brandPalette = [
    {
        name: 'Deep Plum',
        hex: '#442F41',
        token: '--color-tijum-plum',
        bgClass: 'bg-tijum-plum text-tijum-cream',
        role: 'Headings, primary text, navigation, admin sidebar, footer',
    },
    {
        name: 'Coral',
        hex: '#FF7A67',
        token: '--color-tijum-coral',
        bgClass: 'bg-tijum-coral text-tijum-plum',
        role: 'Primary CTA buttons, highlights, accents (pair with Plum text)',
    },
    {
        name: 'Soft Peach',
        hex: '#FFB6A3',
        token: '--color-tijum-peach',
        bgClass: 'bg-tijum-peach text-tijum-plum',
        role: 'Supporting visual accents, light highlight badges',
    },
    {
        name: 'Cream',
        hex: '#FFF4EE',
        token: '--color-tijum-cream',
        bgClass: 'bg-tijum-cream text-tijum-plum border border-tijum-surface',
        role: 'Main page warm canvas and auth surfaces',
    },
    {
        name: 'Muted Lavender',
        hex: '#8B6B82',
        token: '--color-tijum-lavender',
        bgClass: 'bg-tijum-lavender text-white',
        role: 'Secondary UI graphics and subtle decorative elements',
    },
    {
        name: 'Neutral Surface',
        hex: '#E6E0DB',
        token: '--color-tijum-surface',
        bgClass: 'bg-tijum-surface text-tijum-plum',
        role: 'Borders, dividers, secondary controls, disabled states',
    },
];

const allStatuses: SemanticStatus[] = [
    'active',
    'pending',
    'verified',
    'rejected',
    'suspended',
    'completed',
    'cancelled',
    'processing',
    'info',
    'neutral',
];

export default function DesignSystemShowcase() {
    const [multiAmenities, setMultiAmenities] = useState<string[]>([
        'wifi',
        'meals',
    ]);
    const [mealSwitch, setMealSwitch] = useState(true);
    const [stayCategory, setStayCategory] = useState('hostel');
    const [currentPage, setCurrentPage] = useState(1);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [destructiveOpen, setDestructiveOpen] = useState(false);

    return (
        <>
            <Head title="TIJUM Design System Showcase (Dev Only)">
                <meta
                    head-key="robots"
                    name="robots"
                    content="noindex, nofollow"
                />
            </Head>

            <ResponsiveContainer width="wide" className="py-10">
                <div className="space-y-10">
                    <PageHeader
                        eyebrow="Internal Design System · Non-Production Route"
                        title="TIJUM UI Foundation Showcase"
                        description="Locked colour tokens, Montserrat & Nunito typography scale, accessible Radix UI form controls, data display, and layout primitives."
                        breadcrumbs={[
                            { title: 'Home', href: home() },
                            { title: 'Design System', href: designSystem() },
                        ]}
                        badges={
                            <StatusBadge
                                status="info"
                                label="Local & Testing Env Only"
                            />
                        }
                    />

                    <Tabs defaultValue="tokens">
                        <TabsList label="Design system categories">
                            <TabsTrigger value="tokens">
                                Colours &amp; Typography
                            </TabsTrigger>
                            <TabsTrigger value="buttons">
                                Buttons &amp; Badges
                            </TabsTrigger>
                            <TabsTrigger value="forms">
                                Form Controls
                            </TabsTrigger>
                            <TabsTrigger value="display">
                                Cards, Tables &amp; States
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="tokens" className="space-y-8 pt-2">
                            <section className="space-y-4">
                                <h2 className="font-heading text-xl font-bold text-tijum-plum">
                                    Locked Brand Colours &amp; Logo Variations
                                </h2>
                                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                    {brandPalette.map((item) => (
                                        <Card
                                            key={item.name}
                                            className="overflow-hidden pt-0"
                                        >
                                            <div
                                                className={`flex h-24 items-end justify-between p-4 ${item.bgClass}`}
                                            >
                                                <span className="font-heading text-sm font-bold">
                                                    {item.name}
                                                </span>
                                                <code className="font-mono text-xs font-semibold">
                                                    {item.hex}
                                                </code>
                                            </div>
                                            <CardContent className="space-y-1 pt-1 text-xs">
                                                <p className="font-mono text-tijum-plum">
                                                    {item.token}
                                                </p>
                                                <p className="text-muted-foreground">
                                                    {item.role}
                                                </p>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            </section>

                            <section className="grid gap-6 md:grid-cols-2">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>
                                            BrandLogo — Light Surface
                                        </CardTitle>
                                        <CardDescription>
                                            Official horizontal, stacked, and
                                            app-tile lockups served from{' '}
                                            <code>public/brand/</code>.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="flex flex-col items-start gap-5">
                                        <BrandLogo
                                            variant="horizontal"
                                            tone="light"
                                            portalLabel="Customer Portal"
                                        />
                                        <BrandLogo
                                            variant="stacked"
                                            tone="light"
                                            showTagline
                                        />
                                        <BrandLogo
                                            variant="icon"
                                            tone="light"
                                        />
                                    </CardContent>
                                </Card>

                                <Card className="border-tijum-plum bg-tijum-plum text-tijum-cream">
                                    <CardHeader>
                                        <CardTitle className="text-tijum-cream">
                                            BrandLogo — Dark Surface
                                        </CardTitle>
                                        <CardDescription className="text-tijum-peach">
                                            Footer and Deep Plum admin sidebar
                                            variants.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="flex flex-col items-start gap-5">
                                        <BrandLogo
                                            variant="horizontal"
                                            tone="dark"
                                            portalLabel="Admin Console"
                                        />
                                        <BrandLogo
                                            variant="stacked"
                                            tone="dark"
                                            showTagline
                                        />
                                        <BrandLogo variant="icon" tone="dark" />
                                    </CardContent>
                                </Card>
                            </section>

                            <Card>
                                <CardHeader>
                                    <CardTitle>
                                        Typography Hierarchy (Montserrat &amp;
                                        Nunito)
                                    </CardTitle>
                                    <CardDescription>
                                        Montserrat (500/600/700) drives headings
                                        and controls; Nunito (400/500/600/700)
                                        drives readable content.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-1 border-b border-tijum-surface pb-3">
                                        <span className="text-xs text-muted-foreground">
                                            H1 Display — Montserrat Bold
                                        </span>
                                        <p className="font-heading text-3xl font-bold text-tijum-plum">
                                            Stay easy. Eat well. Spend less.
                                        </p>
                                    </div>
                                    <div className="space-y-1 border-b border-tijum-surface pb-3">
                                        <span className="text-xs text-muted-foreground">
                                            H2 Section Heading — Montserrat
                                            SemiBold
                                        </span>
                                        <p className="font-heading text-xl font-semibold text-tijum-plum">
                                            Food-Inclusive Partner Stays Across
                                            Telangana &amp; Andhra Pradesh
                                        </p>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-xs text-muted-foreground">
                                            Body Copy — Nunito Regular / Medium
                                        </span>
                                        <p className="font-body text-base leading-relaxed text-tijum-plum">
                                            Affordable, food-inclusive
                                            accommodation booking built around
                                            verified Hostels/PG, Homestays, and
                                            Co-Living spaces with comfortable
                                            contrast and generous spacing.
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="buttons" className="space-y-6 pt-2">
                            <Card>
                                <CardHeader>
                                    <CardTitle>
                                        Button Variants, Sizes &amp; States
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-5">
                                    <div className="flex flex-wrap items-center gap-3">
                                        <Button variant="default">
                                            Coral Primary
                                        </Button>
                                        <Button variant="plum">
                                            Deep Plum
                                        </Button>
                                        <Button variant="secondary">
                                            Secondary Surface
                                        </Button>
                                        <Button variant="outline">
                                            Outline
                                        </Button>
                                        <Button variant="ghost">Ghost</Button>
                                        <Button variant="destructive">
                                            Destructive
                                        </Button>
                                        <Button variant="link">Link</Button>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-3">
                                        <Button size="sm">Small</Button>
                                        <Button size="default">Default</Button>
                                        <Button size="lg">Large</Button>
                                        <Button
                                            size="icon"
                                            aria-label="Palette preview"
                                        >
                                            <Palette aria-hidden="true" />
                                        </Button>
                                        <Button loading>Loading</Button>
                                        <Button disabled>Disabled</Button>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle>
                                        Semantic Status Badges
                                    </CardTitle>
                                    <CardDescription>
                                        Iconography paired with AA-verified text
                                        and soft borders; color is never the
                                        sole indicator.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="flex flex-wrap gap-2.5">
                                    {allStatuses.map((status) => (
                                        <StatusBadge
                                            key={status}
                                            status={status}
                                        />
                                    ))}
                                </CardContent>
                            </Card>

                            <div className="grid gap-4 md:grid-cols-2">
                                <Alert variant="success">
                                    <CheckCircle2 aria-hidden="true" />
                                    <AlertTitle>Success Alert</AlertTitle>
                                    <AlertDescription>
                                        Profile or security confirmation updated
                                        cleanly.
                                    </AlertDescription>
                                </Alert>
                                <Alert variant="info">
                                    <Bell aria-hidden="true" />
                                    <AlertTitle>Information Alert</AlertTitle>
                                    <AlertDescription>
                                        Contextual guidance styled with Cream
                                        and Soft Peach.
                                    </AlertDescription>
                                </Alert>
                            </div>
                        </TabsContent>

                        <TabsContent value="forms" className="pt-2">
                            <Card>
                                <CardHeader>
                                    <CardTitle>
                                        Standardised Form Controls
                                    </CardTitle>
                                    <CardDescription>
                                        All inputs preserve accessible{' '}
                                        <code>for/id</code>,{' '}
                                        <code>aria-describedby</code>, and{' '}
                                        <code>aria-invalid</code> bindings.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="grid gap-6 md:grid-cols-2">
                                    <FormField
                                        id="demo-text"
                                        label="Text input"
                                        required
                                    >
                                        {(a11y) => (
                                            <Input
                                                {...a11y}
                                                type="text"
                                                placeholder="Standard text field"
                                            />
                                        )}
                                    </FormField>

                                    <FormField
                                        id="demo-email"
                                        label="Email input"
                                    >
                                        {(a11y) => (
                                            <Input
                                                {...a11y}
                                                type="email"
                                                placeholder="guest@tijum.in"
                                            />
                                        )}
                                    </FormField>

                                    <FormField
                                        id="demo-password"
                                        label="Password input"
                                    >
                                        {(a11y) => (
                                            <PasswordInput
                                                {...a11y}
                                                placeholder="Minimum 8 characters"
                                            />
                                        )}
                                    </FormField>

                                    <FormField
                                        id="demo-phone"
                                        label="Phone input"
                                    >
                                        {(a11y) => (
                                            <Input
                                                {...a11y}
                                                type="tel"
                                                placeholder="+91 90000 00000"
                                            />
                                        )}
                                    </FormField>

                                    <FormField
                                        id="demo-number"
                                        label="Numeric input"
                                        error="Validation error example linked via aria-describedby."
                                    >
                                        {(a11y) => (
                                            <Input
                                                {...a11y}
                                                type="number"
                                                defaultValue="1"
                                            />
                                        )}
                                    </FormField>

                                    <FormField
                                        id="demo-select"
                                        label="Select control"
                                    >
                                        {(a11y) => (
                                            <Select defaultValue="hyderabad">
                                                <SelectTrigger
                                                    id={a11y.id}
                                                    className="w-full bg-white"
                                                >
                                                    <SelectValue placeholder="Choose a launch city" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="hyderabad">
                                                        Hyderabad
                                                    </SelectItem>
                                                    <SelectItem value="guntur">
                                                        Guntur
                                                    </SelectItem>
                                                    <SelectItem value="vijayawada">
                                                        Vijayawada
                                                    </SelectItem>
                                                    <SelectItem value="visakhapatnam">
                                                        Visakhapatnam
                                                    </SelectItem>
                                                </SelectContent>
                                            </Select>
                                        )}
                                    </FormField>

                                    <FormField
                                        id="demo-date"
                                        label="Date input"
                                    >
                                        {(a11y) => (
                                            <Input {...a11y} type="date" />
                                        )}
                                    </FormField>

                                    <FormField
                                        id="demo-time"
                                        label="Time input"
                                    >
                                        {(a11y) => (
                                            <Input
                                                {...a11y}
                                                type="time"
                                                defaultValue="09:00"
                                            />
                                        )}
                                    </FormField>

                                    <div className="md:col-span-2">
                                        <FormField
                                            id="demo-textarea"
                                            label="Textarea control"
                                            hint="Resizable multi-line input field."
                                        >
                                            {(a11y) => (
                                                <Textarea
                                                    {...a11y}
                                                    placeholder="House rules or meal note placeholder..."
                                                />
                                            )}
                                        </FormField>
                                    </div>

                                    <div className="md:col-span-2">
                                        <MultiSelectCheckboxGroup
                                            legend="Multi-select group (showcase sample)"
                                            value={multiAmenities}
                                            onChange={setMultiAmenities}
                                            options={[
                                                {
                                                    value: 'meals',
                                                    label: 'Meals included',
                                                    description:
                                                        'Breakfast and dinner sample option',
                                                },
                                                {
                                                    value: 'wifi',
                                                    label: 'Wi-Fi',
                                                    description:
                                                        'High-speed internet sample option',
                                                },
                                            ]}
                                        />
                                    </div>

                                    <RadioGroup
                                        legend="Radio group sample"
                                        className="md:col-span-1"
                                    >
                                        <RadioOption
                                            name="stay_category"
                                            value="hostel"
                                            checked={stayCategory === 'hostel'}
                                            onChange={() =>
                                                setStayCategory('hostel')
                                            }
                                            label="Independent Hostel"
                                        />
                                        <RadioOption
                                            name="stay_category"
                                            value="pg"
                                            checked={stayCategory === 'pg'}
                                            onChange={() =>
                                                setStayCategory('pg')
                                            }
                                            label="PG Accommodation"
                                        />
                                    </RadioGroup>

                                    <div className="space-y-4">
                                        <label
                                            htmlFor="demo-switch"
                                            className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-tijum-surface bg-white p-4"
                                        >
                                            <div>
                                                <p className="font-heading text-sm font-semibold text-tijum-plum">
                                                    Switch control
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    Accessible native checkbox
                                                    with switch role
                                                </p>
                                            </div>
                                            <Switch
                                                id="demo-switch"
                                                checked={mealSwitch}
                                                onCheckedChange={setMealSwitch}
                                            />
                                        </label>

                                        <label
                                            htmlFor="demo-checkbox"
                                            className="flex cursor-pointer items-center gap-3 rounded-xl border border-tijum-surface bg-white p-4"
                                        >
                                            <Checkbox
                                                id="demo-checkbox"
                                                defaultChecked
                                            />
                                            <span className="font-heading text-sm font-medium text-tijum-plum">
                                                Standalone checkbox confirmation
                                            </span>
                                        </label>
                                    </div>

                                    <div className="md:col-span-2">
                                        <FileUploadField
                                            id="demo-file"
                                            name="document"
                                            label="Document upload control"
                                            accept=".pdf,.jpg,.png"
                                            hint="Accessible hidden input paired with visible upload drop area."
                                        />
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="display" className="space-y-8 pt-2">
                            <div className="grid gap-4 md:grid-cols-3">
                                <StatCard
                                    label="StatCard Example"
                                    value="100% Light-First"
                                    helperText="Consistent WCAG contrast"
                                    icon={Layers}
                                    badge={<StatusBadge status="active" />}
                                />
                                <InfoPanel
                                    icon={Building2}
                                    title="InfoPanel Example"
                                    description="Reusable surface for operational summaries."
                                    badge={<StatusBadge status="verified" />}
                                />
                                <PropertySummaryCard
                                    title="Sample Layout Card"
                                    categoryLabel="Design Showcase Only"
                                    cityLabel="Launch Cities"
                                    mealLabel="Food-Inclusive Template"
                                    priceSummary="Phase 03 Slot"
                                    badge={
                                        <Badge variant="outline">
                                            Showcase
                                        </Badge>
                                    }
                                    footerAction={
                                        <Button size="sm" disabled>
                                            Disabled Preview
                                        </Button>
                                    }
                                />
                            </div>

                            <section className="space-y-4">
                                <h2 className="font-heading text-lg font-bold text-tijum-plum">
                                    Responsive DataTable &amp; Pagination
                                </h2>
                                <DataTable
                                    caption="Design system components summary"
                                    columns={sampleColumns}
                                    rows={sampleTableRows}
                                    getRowKey={(row) => row.id}
                                />
                                <Pagination
                                    currentPage={currentPage}
                                    totalPages={3}
                                    onPageChange={setCurrentPage}
                                />
                            </section>

                            <section className="space-y-4">
                                <h2 className="font-heading text-lg font-bold text-tijum-plum">
                                    Dialogs, Toasts &amp; Feedback States
                                </h2>
                                <div className="flex flex-wrap gap-3">
                                    <ConfirmationDialog
                                        open={confirmOpen}
                                        onOpenChange={setConfirmOpen}
                                        trigger={
                                            <Button variant="plum">
                                                Open Standard Confirmation
                                            </Button>
                                        }
                                        title="Confirm design action"
                                        description="Standard accessible confirmation modal built on Radix Dialog."
                                        onConfirm={() => {
                                            setConfirmOpen(false);
                                            toast.success(
                                                'Action confirmed in showcase',
                                            );
                                        }}
                                    />

                                    <ConfirmationDialog
                                        open={destructiveOpen}
                                        onOpenChange={setDestructiveOpen}
                                        trigger={
                                            <Button variant="destructive">
                                                Open Destructive Confirmation
                                            </Button>
                                        }
                                        tone="destructive"
                                        confirmLabel="Confirm Action"
                                        title="Destructive confirmation example"
                                        description="Focus defaults safely to the Cancel button for destructive confirmations."
                                        onConfirm={() => {
                                            setDestructiveOpen(false);
                                            toast.info(
                                                'Destructive preview closed',
                                            );
                                        }}
                                    />

                                    <Button
                                        variant="outline"
                                        onClick={() =>
                                            toast.success(
                                                'TIJUM toast notification active',
                                            )
                                        }
                                    >
                                        Trigger Toast
                                    </Button>
                                </div>

                                <div className="grid gap-4 lg:grid-cols-2">
                                    <EmptyState
                                        title="Reusable empty state"
                                        description="Displayed when tables or lists have zero records without fabricating sample items."
                                    />
                                    <ErrorState
                                        title="Recoverable error state"
                                        description="Accessible alert container with contrast-safe action control."
                                        onRetry={() =>
                                            toast.info(
                                                'Retry callback triggered',
                                            )
                                        }
                                    />
                                </div>

                                <LoadingState variant="cards" rows={3} />
                            </section>
                        </TabsContent>
                    </Tabs>
                </div>
            </ResponsiveContainer>
        </>
    );
}

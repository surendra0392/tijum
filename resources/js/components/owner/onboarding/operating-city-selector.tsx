import { Link, useForm } from '@inertiajs/react';
import { ArrowRight, CheckCircle2, MapPin } from 'lucide-react';
import type { FormEvent } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { documents as documentsRoute } from '@/routes/owner/onboarding';
import { update } from '@/routes/owner/onboarding/cities';
import type { CityOption } from '@/types';

type OperatingCitySelectorProps = {
    cities: CityOption[];
    selectedCityIds: number[];
    isEditable: boolean;
    status?: string;
};

export function OperatingCitySelector({
    cities,
    selectedCityIds,
    isEditable,
    status,
}: OperatingCitySelectorProps) {
    const form = useForm<{ city_ids: number[] }>({
        city_ids: selectedCityIds,
    });

    const toggleCity = (cityId: number) => {
        if (!isEditable) {
            return;
        }

        const exists = form.data.city_ids.includes(cityId);
        form.setData(
            'city_ids',
            exists
                ? form.data.city_ids.filter((id) => id !== cityId)
                : [...form.data.city_ids, cityId],
        );
    };

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!isEditable) {
            return;
        }
        form.put(update.url(), {
            preserveScroll: true,
        });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {status === 'operating-cities-saved' && (
                <Alert variant="success">
                    <CheckCircle2 aria-hidden="true" />
                    <AlertTitle>Operating cities updated</AlertTitle>
                    <AlertDescription>
                        Your intended launch cities are saved. Proceed to{' '}
                        <Link
                            href={documentsRoute()}
                            className="font-semibold underline underline-offset-4"
                        >
                            Step 4: Verification Documents
                        </Link>
                        .
                    </AlertDescription>
                </Alert>
            )}

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">
                        Intended TIJUM Launch Cities
                    </CardTitle>
                    <CardDescription>
                        Select the cities where you currently operate or intend
                        to offer accommodation through TIJUM.
                    </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                    <fieldset
                        className="grid gap-3 sm:grid-cols-2"
                        disabled={!isEditable}
                    >
                        <legend className="sr-only">
                            Launch operating cities
                        </legend>
                        {cities.map((city) => {
                            const checked = form.data.city_ids.includes(
                                city.id,
                            );
                            const checkboxId = `city-option-${city.slug}`;

                            return (
                                <label
                                    key={city.id}
                                    htmlFor={checkboxId}
                                    className={cn(
                                        'flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors has-focus-visible:ring-2 has-focus-visible:ring-ring',
                                        checked
                                            ? 'border-tijum-coral bg-tijum-cream/75 shadow-2xs dark:border-tijum-coral dark:bg-tijum-coral/12'
                                            : 'border-tijum-surface/80 bg-white hover:border-tijum-peach dark:border-border dark:bg-card dark:hover:border-tijum-coral/40',
                                        !isEditable &&
                                            'cursor-default opacity-80',
                                    )}
                                >
                                    <input
                                        id={checkboxId}
                                        type="checkbox"
                                        name="city_ids[]"
                                        value={city.id}
                                        checked={checked}
                                        disabled={!isEditable}
                                        onChange={() => toggleCity(city.id)}
                                        className="mt-1 size-4 shrink-0 cursor-pointer rounded accent-tijum-plum dark:accent-tijum-coral"
                                    />
                                    <div className="min-w-0 space-y-0.5">
                                        <span className="flex items-center gap-1.5 font-heading text-sm font-semibold text-tijum-plum dark:text-foreground">
                                            <MapPin
                                                className="size-3.5 text-tijum-coral"
                                                aria-hidden="true"
                                            />
                                            <span>{city.name}</span>
                                        </span>
                                        <span className="block text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                            {city.state}, {city.country_code}
                                        </span>
                                    </div>
                                </label>
                            );
                        })}
                    </fieldset>

                    {form.errors.city_ids && (
                        <p
                            role="alert"
                            className="text-sm font-medium text-destructive"
                        >
                            {form.errors.city_ids}
                        </p>
                    )}

                    <p className="rounded-xl border border-tijum-surface/80 bg-tijum-cream/55 px-4 py-3 text-xs leading-relaxed text-tijum-plum-muted dark:border-border dark:bg-muted/45 dark:text-muted-foreground">
                        Selected operating cities reflect where your partner
                        account plans to onboard stays. Each individual property
                        undergoes dedicated property verification before going
                        live.
                    </p>
                </CardContent>

                <CardFooter className="flex flex-wrap items-center justify-between gap-3 border-t border-tijum-surface/70 pt-4 dark:border-border">
                    {isEditable && (
                        <Button
                            type="submit"
                            loading={form.processing}
                            data-test="save-operating-cities-button"
                        >
                            Save Operating Cities
                        </Button>
                    )}

                    <Button variant="outline" asChild>
                        <Link href={documentsRoute()}>
                            <span>Continue to Documents</span>
                            <ArrowRight aria-hidden="true" />
                        </Link>
                    </Button>
                </CardFooter>
            </Card>
        </form>
    );
}

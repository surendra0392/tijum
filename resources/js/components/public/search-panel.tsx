import { router } from '@inertiajs/react';
import {
    CalendarDays,
    MapPin,
    Minus,
    Plus,
    Search,
    UserCheck,
    UsersRound,
} from 'lucide-react';
import type { FormEvent } from 'react';
import { useEffect, useId, useMemo, useState } from 'react';
import {
    LocationAutocomplete,
    type LocationSelection,
} from '@/components/public/location-autocomplete';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { search } from '@/routes/public';
import type { SearchLocationOption } from '@/types/public-search';

export type SearchCityOption = {
    id: number;
    name: string;
};

export type SearchCategoryOption = {
    id: number;
    name: string;
    slug?: string;
};

export type SearchDurationOption = {
    value: string;
    label: string;
};

export type SearchTiming = {
    default_check_in: string;
    default_check_out: string;
    earliest_check_in: string;
    early_check_in_fee_minor: number;
    check_in_min?: string;
    check_in_max?: string;
};

export type SearchDefaults = {
    check_in: string;
    duration_type: string;
    duration_count: number;
    guests: number;
};

type SearchPanelProps = {
    cities: SearchCityOption[];
    locations?: SearchLocationOption[];
    categories?: SearchCategoryOption[];
    durations?: SearchDurationOption[];
    timing: SearchTiming;
    defaults: SearchDefaults;
    initial?: Partial<{
        city: string;
        category: string;
        locality: string;
        locationLabel: string;
        lat: number;
        lng: number;
        checkIn: string;
        durationType: string;
        durationCount: string;
        guests: string;
        genderPreference: string;
    }>;
    compact?: boolean;
    autoSubmitOnLocate?: boolean;
    onDurationChange?: (duration: string) => void;
    className?: string;
};

const TODAY_ISO = new Date().toISOString().split('T')[0];

export function SearchPanel({
    cities,
    locations = [],
    defaults,
    initial,
    compact = false,
    autoSubmitOnLocate = false,
    onDurationChange,
    className,
}: SearchPanelProps) {
    const id = useId();

    // Duration Type tabs: daily | weekly | monthly
    const [durationType, setDurationType] = useState<
        'daily' | 'weekly' | 'monthly'
    >(
        (initial?.durationType as any) ||
            (defaults.duration_type as any) ||
            'daily',
    );

    const resolveInitialLocationInput = () => {
        if (initial?.locationLabel?.trim()) {
            return initial.locationLabel.trim();
        }

        if (initial?.locality && initial?.city) {
            const cityName =
                cities.find(
                    (c) =>
                        String(c.id) === String(initial.city) ||
                        c.name.toLowerCase() ===
                            String(initial.city).toLowerCase(),
                )?.name || initial.city;
            return `${initial.locality}, ${cityName}`;
        }
        if (initial?.locality) return initial.locality;
        return '';
    };

    const resolveInitialCity = () => {
        if (initial?.city) {
            const matched = cities.find(
                (c) =>
                    String(c.id) === String(initial.city) ||
                    c.name.toLowerCase() === String(initial.city).toLowerCase(),
            );
            if (matched) return matched.name.toLowerCase();
            if (isNaN(Number(initial.city))) return initial.city.toLowerCase();
        }
        return '';
    };

    // Location & City
    const [locationInput, setLocationInput] = useState(
        resolveInitialLocationInput,
    );
    const [selectedCity, setSelectedCity] = useState(resolveInitialCity);
    const [selectedLocality, setSelectedLocality] = useState(
        initial?.locality || '',
    );
    const [selectedLat, setSelectedLat] = useState<number | undefined>(
        initial?.lat,
    );
    const [selectedLng, setSelectedLng] = useState<number | undefined>(
        initial?.lng,
    );

    useEffect(() => {
        const nextLabel = resolveInitialLocationInput();
        if (nextLabel) {
            setLocationInput(nextLabel);
        }
        if (initial?.city) {
            setSelectedCity(resolveInitialCity());
        }
        if (initial?.locality !== undefined) {
            setSelectedLocality(initial.locality || '');
        }
        if (initial?.lat !== undefined) {
            setSelectedLat(initial.lat);
        }
        if (initial?.lng !== undefined) {
            setSelectedLng(initial.lng);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        initial?.city,
        initial?.locality,
        initial?.locationLabel,
        initial?.lat,
        initial?.lng,
    ]);

    // Dates
    const [checkIn, setCheckIn] = useState(
        initial?.checkIn || defaults.check_in,
    );

    // Duration count (number of days, weeks, or months)
    const [durationCount, setDurationCount] = useState<number>(() => {
        if (initial?.durationCount)
            return parseInt(initial.durationCount, 10) || 1;
        return defaults.duration_count || 1;
    });

    // Guests & Gender
    const [guests, setGuests] = useState(
        initial?.guests || String(defaults.guests || 1),
    );
    const [genderPreference, setGenderPreference] = useState(
        initial?.genderPreference || 'all',
    );

    // Category
    const category = initial?.category ?? 'any';
    const [errors, setErrors] = useState<string[]>([]);

    // Handle Top Pill Tab selection
    const handleDurationTab = (tab: 'daily' | 'weekly' | 'monthly') => {
        setDurationType(tab);
        setDurationCount(1);
        onDurationChange?.(tab);
    };

    const normalizeCitySlug = (rawCity: string): string => {
        if (!rawCity) return 'hyderabad';
        if (!isNaN(Number(rawCity)) || rawCity === '1') {
            const matchedCity = cities.find(
                (c) => String(c.id) === String(rawCity),
            );
            return matchedCity ? matchedCity.name.toLowerCase() : 'hyderabad';
        }
        return rawCity.toLowerCase();
    };

    const executeSearch = (params: {
        city: string;
        locality?: string;
        locationLabel?: string;
        lat?: number;
        lng?: number;
        replaceHistory?: boolean;
    }) => {
        router.get(
            search.url(),
            {
                city: normalizeCitySlug(params.city),
                locality: params.locality?.trim() || undefined,
                location_label: params.locationLabel?.trim() || undefined,
                lat: params.lat,
                lng: params.lng,
                check_in: checkIn || defaults.check_in,
                duration_type: durationType,
                duration_count: durationCount,
                guests,
                category: category !== 'any' ? [category] : undefined,
                gender_preference: genderPreference,
            },
            {
                preserveScroll: Boolean(params.replaceHistory),
                replace: Boolean(params.replaceHistory),
            },
        );
    };

    // Location selection from autocomplete (Google, Photon, Geolocation, or Local DB)
    const handleLocationSelect = (selection: LocationSelection) => {
        setLocationInput(selection.address);
        const nextCity = selection.city || selectedCity || 'hyderabad';
        const nextLocality = selection.locality || '';
        setSelectedCity(nextCity);
        setSelectedLocality(nextLocality);
        setSelectedLat(selection.lat);
        setSelectedLng(selection.lng);

        if (
            compact &&
            (!selection.isAutoLocated || autoSubmitOnLocate)
        ) {
            executeSearch({
                city: nextCity,
                locality: nextLocality,
                locationLabel: selection.address,
                lat: selection.lat,
                lng: selection.lng,
                replaceHistory: Boolean(selection.isAutoLocated),
            });
        }
    };

    const handleLocationInputChange = (nextValue: string) => {
        setLocationInput(nextValue);
        setSelectedCity('');
        setSelectedLocality('');
        setSelectedLat(undefined);
        setSelectedLng(undefined);
    };

    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        const nextErrors: string[] = [];
        if (!selectedCity && !locationInput.trim()) {
            nextErrors.push('Please enter a location or select a destination.');
        }
        if (!checkIn) {
            nextErrors.push('Choose a check-in date.');
        }

        setErrors(nextErrors);
        if (nextErrors.length > 0) {
            return;
        }

        // Resolve city parameter (city slug, id, or fallback)
        let resolvedCity = selectedCity;
        let resolvedLocality = selectedLocality;
        let resolvedLat = selectedLat;
        let resolvedLng = selectedLng;

        if (!resolvedCity && locationInput) {
            const lower = locationInput.toLowerCase();
            const matchingLocation = locations.find((location) => {
                const name = location.name.toLowerCase();
                const fullAddress =
                    `${location.name}, ${location.secondary_text}`.toLowerCase();

                return (
                    name === lower ||
                    fullAddress === lower ||
                    name.startsWith(lower) ||
                    lower.includes(name)
                );
            });

            if (matchingLocation) {
                resolvedCity = matchingLocation.city;
                resolvedLocality = matchingLocation.locality ?? '';
                resolvedLat = matchingLocation.lat ?? undefined;
                resolvedLng = matchingLocation.lng ?? undefined;
            } else {
                const matchingCity = cities.find((city) =>
                    lower.includes(city.name.toLowerCase()),
                );
                resolvedCity = matchingCity?.name.toLowerCase() ?? 'hyderabad';
            }
        }

        executeSearch({
            city: resolvedCity || 'hyderabad',
            locality: resolvedLocality,
            locationLabel: locationInput,
            lat: resolvedLat,
            lng: resolvedLng,
        });
    };

    const maxDuration = useMemo(() => {
        if (durationType === 'weekly') return 52;
        if (durationType === 'monthly') return 36;
        return 365;
    }, [durationType]);

    const durationUnitSuffix = useMemo(() => {
        if (durationType === 'weekly') {
            return durationCount === 1 ? 'Week' : 'Weeks';
        }
        if (durationType === 'monthly') {
            return durationCount === 1 ? 'Month' : 'Months';
        }
        return durationCount === 1 ? 'Day' : 'Days';
    }, [durationType, durationCount]);

    const durationLabel = useMemo(() => {
        if (durationType === 'weekly') return 'No. of Weeks';
        if (durationType === 'monthly') return 'No. of Months';
        return 'No. of Days';
    }, [durationType]);

    return (
        <form
            onSubmit={submit}
            className={cn(
                'relative w-full rounded-2xl border border-tijum-surface/90 bg-white p-4 shadow-xl shadow-tijum-plum/5 transition-all duration-300 sm:rounded-3xl sm:p-5 lg:p-6',
                className,
            )}
            aria-label="Search TIJUM stays"
            noValidate
        >
            {/* Top Duration Tab Switcher (Joey Rooms design in brand colors) */}
            <div className="mb-4 sm:mb-5">
                <div className="inline-flex items-center rounded-full border border-tijum-surface bg-tijum-cream/70 p-1 shadow-inner">
                    <button
                        type="button"
                        onClick={() => handleDurationTab('daily')}
                        className={cn(
                            'cursor-pointer rounded-full px-5 py-1.5 text-xs font-semibold transition-all duration-200 sm:px-6 sm:text-sm',
                            durationType === 'daily'
                                ? 'border border-tijum-surface/80 bg-white text-tijum-coral shadow-sm'
                                : 'text-tijum-plum/70 hover:bg-white/40 hover:text-tijum-plum',
                        )}
                    >
                        Daily
                    </button>
                    <button
                        type="button"
                        onClick={() => handleDurationTab('weekly')}
                        className={cn(
                            'cursor-pointer rounded-full px-5 py-1.5 text-xs font-semibold transition-all duration-200 sm:px-6 sm:text-sm',
                            durationType === 'weekly'
                                ? 'border border-tijum-surface/80 bg-white text-tijum-coral shadow-sm'
                                : 'text-tijum-plum/70 hover:bg-white/40 hover:text-tijum-plum',
                        )}
                    >
                        Weekly
                    </button>
                    <button
                        type="button"
                        onClick={() => handleDurationTab('monthly')}
                        className={cn(
                            'cursor-pointer rounded-full px-5 py-1.5 text-xs font-semibold transition-all duration-200 sm:px-6 sm:text-sm',
                            durationType === 'monthly'
                                ? 'border border-tijum-surface/80 bg-white text-tijum-coral shadow-sm'
                                : 'text-tijum-plum/70 hover:bg-white/40 hover:text-tijum-plum',
                        )}
                    >
                        Monthly
                    </button>
                </div>
            </div>

            {/* Fields Row: Desktop in ONE single row, tablet 2-cols, mobile stacked */}
            <div
                className={cn(
                    'flex flex-col gap-3 sm:grid sm:grid-cols-2 lg:flex lg:flex-row lg:items-start lg:gap-2.5 xl:gap-3',
                    compact ? 'lg:gap-2' : '',
                )}
            >
                {/* 1. Location with Autocomplete & Pin Icon */}
                <div className="relative z-30 space-y-1.5 sm:col-span-2 lg:min-w-[200px] lg:flex-[2.5]">
                    <Label
                        htmlFor={`${id}-location`}
                        className="flex h-5 items-center gap-1.5 font-heading text-xs font-semibold whitespace-nowrap text-tijum-plum"
                    >
                        <MapPin
                            className="size-3.5 shrink-0 text-tijum-coral"
                            aria-hidden="true"
                        />
                        <span>Location</span>
                    </Label>
                    <LocationAutocomplete
                        id={`${id}-location`}
                        value={locationInput}
                        onChange={handleLocationInputChange}
                        onSelect={handleLocationSelect}
                        locations={locations}
                        placeholder="Search exact area, address or landmark..."
                    />
                </div>

                {/* 2. Check-In Date */}
                <div className="space-y-1.5 sm:col-span-1 lg:min-w-[135px] lg:flex-[1.3]">
                    <Label
                        htmlFor={`${id}-checkin`}
                        className="flex h-5 items-center gap-1.5 font-heading text-xs font-semibold whitespace-nowrap text-tijum-plum"
                    >
                        <CalendarDays
                            className="size-3.5 shrink-0 text-tijum-coral"
                            aria-hidden="true"
                        />
                        <span>Check-In</span>
                    </Label>
                    <input
                        id={`${id}-checkin`}
                        name="check_in"
                        type="date"
                        min={TODAY_ISO}
                        value={checkIn}
                        onChange={(e) => setCheckIn(e.target.value)}
                        className="box-border h-12 w-full cursor-pointer rounded-xl border border-tijum-surface bg-white px-3 text-sm font-medium text-tijum-plum transition-all duration-150 outline-none focus:border-tijum-coral focus:ring-2 focus:ring-tijum-coral/25"
                    />
                </div>

                {/* 3. Duration: No. of Days / Weeks / Months (Number Input) */}
                <div className="space-y-1.5 sm:col-span-1 lg:min-w-[130px] lg:flex-[1.25]">
                    <Label
                        htmlFor={`${id}-duration`}
                        className="flex h-5 items-center gap-1.5 font-heading text-xs font-semibold whitespace-nowrap text-tijum-plum"
                    >
                        <CalendarDays
                            className="size-3.5 shrink-0 text-tijum-coral"
                            aria-hidden="true"
                        />
                        <span>{durationLabel}</span>
                    </Label>
                    <div className="box-border flex h-12 w-full items-center justify-between rounded-xl border border-tijum-surface bg-white px-1.5 transition-all duration-150 focus-within:border-tijum-coral focus-within:ring-2 focus-within:ring-tijum-coral/25">
                        <button
                            type="button"
                            onClick={() =>
                                setDurationCount((prev) =>
                                    Math.max(1, prev - 1),
                                )
                            }
                            disabled={durationCount <= 1}
                            aria-label={`Decrease ${durationLabel}`}
                            className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-tijum-plum transition-colors hover:bg-tijum-cream hover:text-tijum-coral active:scale-95 disabled:pointer-events-none disabled:opacity-30"
                        >
                            <Minus className="size-3.5" aria-hidden="true" />
                        </button>
                        <div className="flex min-w-0 flex-1 items-center justify-center gap-1 px-1">
                            <input
                                id={`${id}-duration`}
                                type="number"
                                min="1"
                                max={maxDuration}
                                value={durationCount}
                                onChange={(e) => {
                                    const v = parseInt(e.target.value, 10);
                                    setDurationCount(
                                        isNaN(v)
                                            ? 1
                                            : Math.max(
                                                  1,
                                                  Math.min(v, maxDuration),
                                              ),
                                    );
                                }}
                                onBlur={() => {
                                    if (!durationCount || durationCount < 1)
                                        setDurationCount(1);
                                }}
                                aria-label={durationLabel}
                                className="w-8 [appearance:textfield] bg-transparent text-center font-heading text-sm font-bold text-tijum-plum outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                            />
                            <span className="truncate text-xs font-medium text-tijum-lavender select-none">
                                {durationUnitSuffix}
                            </span>
                        </div>
                        <button
                            type="button"
                            onClick={() =>
                                setDurationCount((prev) =>
                                    Math.min(maxDuration, prev + 1),
                                )
                            }
                            disabled={durationCount >= maxDuration}
                            aria-label={`Increase ${durationLabel}`}
                            className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-tijum-plum transition-colors hover:bg-tijum-cream hover:text-tijum-coral active:scale-95 disabled:pointer-events-none disabled:opacity-30"
                        >
                            <Plus className="size-3.5" aria-hidden="true" />
                        </button>
                    </div>
                </div>

                {/* 4. Guests (Number Input) */}
                <div className="space-y-1.5 sm:col-span-1 lg:min-w-[120px] lg:flex-[1.15]">
                    <Label
                        htmlFor={`${id}-guests`}
                        className="flex h-5 items-center gap-1.5 font-heading text-xs font-semibold whitespace-nowrap text-tijum-plum"
                    >
                        <UsersRound
                            className="size-3.5 shrink-0 text-tijum-coral"
                            aria-hidden="true"
                        />
                        <span>Guests</span>
                    </Label>
                    <div className="box-border flex h-12 w-full items-center justify-between rounded-xl border border-tijum-surface bg-white px-1.5 transition-all duration-150 focus-within:border-tijum-coral focus-within:ring-2 focus-within:ring-tijum-coral/25">
                        <button
                            type="button"
                            onClick={() =>
                                setGuests((prev) =>
                                    String(
                                        Math.max(
                                            1,
                                            (parseInt(prev, 10) || 1) - 1,
                                        ),
                                    ),
                                )
                            }
                            disabled={(parseInt(guests, 10) || 1) <= 1}
                            aria-label="Decrease guests"
                            className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-tijum-plum transition-colors hover:bg-tijum-cream hover:text-tijum-coral active:scale-95 disabled:pointer-events-none disabled:opacity-30"
                        >
                            <Minus className="size-3.5" aria-hidden="true" />
                        </button>
                        <div className="flex min-w-0 flex-1 items-center justify-center gap-1 px-1">
                            <input
                                id={`${id}-guests`}
                                type="number"
                                min="1"
                                max="30"
                                value={guests}
                                onChange={(e) => {
                                    const v = parseInt(e.target.value, 10);
                                    setGuests(
                                        String(
                                            isNaN(v)
                                                ? 1
                                                : Math.max(1, Math.min(v, 30)),
                                        ),
                                    );
                                }}
                                onBlur={() => {
                                    const v = parseInt(guests, 10);
                                    if (isNaN(v) || v < 1) setGuests('1');
                                }}
                                aria-label="Number of guests"
                                className="w-7 [appearance:textfield] bg-transparent text-center font-heading text-sm font-bold text-tijum-plum outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                            />
                            <span className="truncate text-xs font-medium text-tijum-lavender select-none">
                                {(parseInt(guests, 10) || 1) === 1
                                    ? 'Guest'
                                    : 'Guests'}
                            </span>
                        </div>
                        <button
                            type="button"
                            onClick={() =>
                                setGuests((prev) =>
                                    String(
                                        Math.min(
                                            30,
                                            (parseInt(prev, 10) || 1) + 1,
                                        ),
                                    ),
                                )
                            }
                            disabled={(parseInt(guests, 10) || 1) >= 30}
                            aria-label="Increase guests"
                            className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-tijum-plum transition-colors hover:bg-tijum-cream hover:text-tijum-coral active:scale-95 disabled:pointer-events-none disabled:opacity-30"
                        >
                            <Plus className="size-3.5" aria-hidden="true" />
                        </button>
                    </div>
                </div>

                {/* 5. Gender (Dropdown) */}
                <div className="space-y-1.5 sm:col-span-1 lg:min-w-[115px] lg:flex-[1.1]">
                    <Label
                        htmlFor={`${id}-gender`}
                        className="flex h-5 items-center gap-1.5 font-heading text-xs font-semibold whitespace-nowrap text-tijum-plum"
                    >
                        <UserCheck
                            className="size-3.5 shrink-0 text-tijum-coral"
                            aria-hidden="true"
                        />
                        <span>Gender</span>
                    </Label>
                    <Select
                        value={genderPreference}
                        onValueChange={setGenderPreference}
                    >
                        <SelectTrigger
                            id={`${id}-gender`}
                            className="box-border h-12 w-full cursor-pointer rounded-xl !border !border-tijum-surface !bg-white px-3.5 text-sm font-medium text-tijum-plum shadow-none focus-visible:border-tijum-coral focus-visible:ring-2 focus-visible:ring-tijum-coral/25"
                        >
                            <SelectValue placeholder="All" />
                        </SelectTrigger>
                        <SelectContent align="start">
                            <SelectItem value="all" className="cursor-pointer">
                                All
                            </SelectItem>
                            <SelectItem value="male" className="cursor-pointer">
                                Male
                            </SelectItem>
                            <SelectItem
                                value="female"
                                className="cursor-pointer"
                            >
                                Female
                            </SelectItem>
                            <SelectItem value="both" className="cursor-pointer">
                                Both
                            </SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* 6. Action: Search Button with Top Spacer */}
                <div className="w-full space-y-1.5 sm:col-span-2 lg:w-auto lg:shrink-0">
                    <div
                        className="hidden h-5 items-center select-none lg:flex"
                        aria-hidden="true"
                    >
                        &nbsp;
                    </div>
                    <Button
                        type="submit"
                        size="lg"
                        className="box-border flex h-12 w-full shrink-0 cursor-pointer items-center justify-center gap-2 rounded-xl bg-tijum-coral px-7 font-heading text-sm font-semibold text-white shadow-md shadow-tijum-coral/25 transition-all duration-200 hover:scale-[1.02] hover:bg-tijum-coral-hover hover:shadow-lg hover:shadow-tijum-coral/30 active:scale-[0.98] lg:w-auto"
                        aria-label="Search available stays"
                    >
                        <Search
                            className="size-4 shrink-0"
                            aria-hidden="true"
                        />
                        <span>Search</span>
                    </Button>
                </div>
            </div>

            {/* Error notifications */}
            {errors.length > 0 && (
                <div
                    role="alert"
                    className="mt-3 rounded-xl border border-red-200 bg-red-50/80 px-4 py-2.5 text-xs font-semibold text-red-700 sm:text-sm"
                >
                    {errors.join(' ')}
                </div>
            )}
        </form>
    );
}

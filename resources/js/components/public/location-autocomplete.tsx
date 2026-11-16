/* eslint-disable jsx-a11y/prefer-tag-over-role -- This custom combobox requires a listbox popup for keyboard navigation. */
import { Loader2, LocateFixed, MapPin, X } from 'lucide-react';
import type { ChangeEvent, KeyboardEvent as ReactKeyboardEvent } from 'react';
import {
    useCallback,
    useEffect,
    useId,
    useMemo,
    useRef,
    useState,
} from 'react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { reverse as reverseGeocode } from '@/routes/api/v1/public/geocode';
import { autocomplete as autocompleteLocations } from '@/routes/api/v1/public/locations';
import type { SearchLocationOption } from '@/types/public-search';

type RemoteLocation = SearchLocationOption & {
    label?: string;
    source?: 'photon';
};

type Suggestion = {
    id: string;
    title: string;
    subtitle: string;
    city: string;
    locality: string;
    type: 'city' | 'locality' | 'landmark';
    lat?: number;
    lng?: number;
    source: 'inventory' | 'photon';
};

type LocationAutocompleteResponse = {
    data?: RemoteLocation[];
};

type ReverseGeocodeResponse = {
    success?: boolean;
    data?: {
        display?: string;
        locality?: string;
        city?: string;
        city_slug?: string;
        formatted_address?: string;
        lat?: number;
        lng?: number;
    };
};

export type LocationSelection = {
    address: string;
    city: string;
    locality: string;
    lat?: number;
    lng?: number;
    isAutoLocated?: boolean;
};

const AUTO_LOCATION_STORAGE_KEY = 'tijum_auto_location_v1';

export type LocationAutocompleteProps = {
    value: string;
    onChange: (text: string) => void;
    onSelect: (selection: LocationSelection) => void;
    locations?: SearchLocationOption[];
    id?: string;
    placeholder?: string;
    className?: string;
    inputClassName?: string;
    autoLocate?: boolean;
};

function toInventorySuggestion(location: SearchLocationOption): Suggestion {
    return {
        id: location.id,
        title: location.name,
        subtitle: location.secondary_text,
        city: location.city,
        locality: location.locality ?? '',
        type: location.type,
        lat: location.lat ?? undefined,
        lng: location.lng ?? undefined,
        source: 'inventory',
    };
}

function toRemoteSuggestion(location: RemoteLocation): Suggestion {
    return {
        id: location.id,
        title: location.name,
        subtitle: location.secondary_text,
        city: location.city,
        locality: location.locality ?? '',
        type: location.type,
        lat: location.lat ?? undefined,
        lng: location.lng ?? undefined,
        source: 'photon',
    };
}

function suggestionAddress(suggestion: Suggestion): string {
    return suggestion.subtitle
        ? `${suggestion.title}, ${suggestion.subtitle}`
        : suggestion.title;
}

export function LocationAutocomplete({
    value,
    onChange,
    onSelect,
    locations = [],
    id,
    placeholder = 'Search exact area, address or landmark...',
    className,
    inputClassName,
    autoLocate = true,
}: LocationAutocompleteProps) {
    const reactId = useId();
    const inputId = id ?? `${reactId}-location`;
    const listboxId = `${inputId}-suggestions`;
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const requestRef = useRef<AbortController | null>(null);
    const cacheRef = useRef<Map<string, Suggestion[]>>(new Map());
    const biasRef = useRef<{ lat: number; lng: number } | null>(null);
    const autoLocateAttemptedRef = useRef(false);
    const userEditedRef = useRef(false);

    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [locating, setLocating] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const [remoteSuggestions, setRemoteSuggestions] = useState<Suggestion[]>(
        [],
    );

    const inventorySuggestions = useMemo(
        () => locations.map(toInventorySuggestion),
        [locations],
    );

    const localMatches = useMemo(() => {
        const query = value.trim().toLowerCase();

        if (query === '') {
            return inventorySuggestions;
        }

        return inventorySuggestions.filter((suggestion) =>
            [
                suggestion.title,
                suggestion.subtitle,
                suggestion.locality,
                suggestion.city,
            ].some((candidate) => candidate.toLowerCase().includes(query)),
        );
    }, [inventorySuggestions, value]);

    const visibleSuggestions = useMemo(() => {
        const candidates =
            value.trim().length >= 2
                ? [...remoteSuggestions, ...localMatches]
                : localMatches;
        const seen = new Set<string>();

        return candidates.filter((suggestion) => {
            const key = suggestionAddress(suggestion).toLowerCase();

            if (seen.has(key)) {
                return false;
            }

            seen.add(key);
            return true;
        });
    }, [localMatches, remoteSuggestions, value]);

    const fetchSuggestions = useCallback(async (query: string) => {
        const cleanQuery = query.trim();

        if (cleanQuery.length < 2) {
            requestRef.current?.abort();
            setRemoteSuggestions([]);
            setLoading(false);
            return;
        }

        const bias = biasRef.current;
        const cacheKey = `${cleanQuery.toLowerCase()}:${bias?.lat.toFixed(2) ?? 'default'}:${bias?.lng.toFixed(2) ?? 'default'}`;
        const cached = cacheRef.current.get(cacheKey);

        if (cached) {
            setRemoteSuggestions(cached);
            setLoading(false);
            setOpen(true);
            return;
        }

        requestRef.current?.abort();
        const controller = new AbortController();
        requestRef.current = controller;
        setLoading(true);

        try {
            const response = await fetch(
                autocompleteLocations.url({
                    query: {
                        q: cleanQuery,
                        limit: 8,
                        lat: bias?.lat,
                        lng: bias?.lng,
                    },
                }),
                {
                    signal: controller.signal,
                    headers: { Accept: 'application/json' },
                },
            );

            if (!response.ok) {
                throw new Error('Location suggestions are unavailable.');
            }

            const payload =
                (await response.json()) as LocationAutocompleteResponse;
            const suggestions = (payload.data ?? []).map(toRemoteSuggestion);
            cacheRef.current.set(cacheKey, suggestions);
            setRemoteSuggestions(suggestions);
            setOpen(true);
        } catch (error) {
            if (
                !(error instanceof DOMException && error.name === 'AbortError')
            ) {
                setRemoteSuggestions([]);
            }
        } finally {
            if (requestRef.current === controller) {
                setLoading(false);
            }
        }
    }, []);

    const scheduleSuggestions = useCallback(
        (query: string, delay = 220) => {
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }

            if (query.trim().length < 2) {
                void fetchSuggestions(query);
                return;
            }

            setLoading(true);
            debounceTimerRef.current = setTimeout(() => {
                void fetchSuggestions(query);
            }, delay);
        },
        [fetchSuggestions],
    );

    const applyReverseGeocode = useCallback(
        (
            data: NonNullable<ReverseGeocodeResponse['data']>,
            latitude: number,
            longitude: number,
            automatic: boolean,
        ) => {
            if (automatic && userEditedRef.current) {
                return;
            }

            const city = data.city_slug || 'hyderabad';
            const locality = data.locality || '';
            const address =
                data.formatted_address ||
                data.display ||
                [locality, data.city].filter(Boolean).join(', ') ||
                'Current location';

            const resolvedLat = data.lat ?? latitude;
            const resolvedLng = data.lng ?? longitude;

            try {
                sessionStorage.setItem(
                    AUTO_LOCATION_STORAGE_KEY,
                    JSON.stringify({
                        data,
                        latitude: resolvedLat,
                        longitude: resolvedLng,
                    }),
                );
            } catch {
                // Ignore storage quota / privacy errors
            }

            onChange(address);
            onSelect({
                address,
                city,
                locality,
                lat: resolvedLat,
                lng: resolvedLng,
                isAutoLocated: automatic,
            });
            setOpen(false);
            setHighlightedIndex(-1);
        },
        [onChange, onSelect],
    );

    const locateCurrentUser = useCallback(
        (automatic = false) => {
            if (!navigator.geolocation) {
                if (!automatic) {
                    toast.error(
                        'Location services are not available in this browser.',
                    );
                }
                return;
            }

            setLocating(true);

            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    const { latitude, longitude } = position.coords;
                    biasRef.current = { lat: latitude, lng: longitude };

                    try {
                        const response = await fetch(
                            reverseGeocode.url({
                                query: {
                                    lat: latitude,
                                    lng: longitude,
                                },
                            }),
                            { headers: { Accept: 'application/json' } },
                        );

                        if (!response.ok) {
                            throw new Error('Reverse geocoding failed.');
                        }

                        const payload =
                            (await response.json()) as ReverseGeocodeResponse;
                        if (payload.data) {
                            applyReverseGeocode(
                                payload.data,
                                latitude,
                                longitude,
                                automatic,
                            );
                        }
                    } catch {
                        if (!automatic) {
                            toast.error(
                                'We found your position but could not resolve the address.',
                            );
                        }
                    } finally {
                        setLocating(false);
                    }
                },
                (error) => {
                    setLocating(false);

                    if (!automatic) {
                        toast.error(
                            error.code === error.PERMISSION_DENIED
                                ? 'Allow location access to fill your address automatically.'
                                : 'We could not determine your current location.',
                        );
                    }
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10_000,
                    maximumAge: 300_000,
                },
            );
        },
        [applyReverseGeocode],
    );

    useEffect(() => {
        if (
            !autoLocate ||
            value.trim() !== '' ||
            autoLocateAttemptedRef.current
        ) {
            return;
        }

        autoLocateAttemptedRef.current = true;

        try {
            const cachedRaw = sessionStorage.getItem(AUTO_LOCATION_STORAGE_KEY);
            if (cachedRaw) {
                const cached = JSON.parse(cachedRaw) as {
                    data?: NonNullable<ReverseGeocodeResponse['data']>;
                    latitude?: number;
                    longitude?: number;
                };
                if (
                    cached?.data &&
                    typeof cached.latitude === 'number' &&
                    typeof cached.longitude === 'number'
                ) {
                    biasRef.current = {
                        lat: cached.latitude,
                        lng: cached.longitude,
                    };
                    applyReverseGeocode(
                        cached.data,
                        cached.latitude,
                        cached.longitude,
                        true,
                    );
                    return;
                }
            }
        } catch {
            // Fall through to live geolocation
        }

        locateCurrentUser(true);
    }, [applyReverseGeocode, autoLocate, locateCurrentUser, value]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                containerRef.current &&
                !containerRef.current.contains(event.target as Node)
            ) {
                setOpen(false);
                setHighlightedIndex(-1);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            requestRef.current?.abort();

            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
        };
    }, []);

    const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
        const nextValue = event.target.value;
        userEditedRef.current = true;
        onChange(nextValue);
        setOpen(true);
        setHighlightedIndex(-1);
        scheduleSuggestions(nextValue);
    };

    const handleSelect = (suggestion: Suggestion) => {
        const address = suggestionAddress(suggestion);

        if (suggestion.lat !== undefined && suggestion.lng !== undefined) {
            biasRef.current = { lat: suggestion.lat, lng: suggestion.lng };
        }

        onChange(address);
        onSelect({
            address,
            city: suggestion.city,
            locality: suggestion.locality,
            lat: suggestion.lat,
            lng: suggestion.lng,
        });
        setOpen(false);
        setHighlightedIndex(-1);
        inputRef.current?.focus();
    };

    const handleClear = () => {
        userEditedRef.current = true;
        requestRef.current?.abort();
        onChange('');
        setRemoteSuggestions([]);
        setOpen(true);
        setHighlightedIndex(-1);
        inputRef.current?.focus();
    };

    const handleKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
        if (!open) {
            if (event.key === 'ArrowDown') {
                event.preventDefault();
                setOpen(true);
            }
            return;
        }

        if (event.key === 'ArrowDown') {
            event.preventDefault();
            setHighlightedIndex((current) =>
                current < visibleSuggestions.length - 1 ? current + 1 : 0,
            );
        } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            setHighlightedIndex((current) =>
                current > 0 ? current - 1 : visibleSuggestions.length - 1,
            );
        } else if (event.key === 'Enter' && highlightedIndex >= 0) {
            const suggestion = visibleSuggestions[highlightedIndex];
            if (suggestion) {
                event.preventDefault();
                handleSelect(suggestion);
            }
        } else if (event.key === 'Escape') {
            event.preventDefault();
            setOpen(false);
            setHighlightedIndex(-1);
        }
    };

    const query = value.trim();
    const showNoResults =
        query.length >= 2 && !loading && visibleSuggestions.length === 0;

    return (
        <div
            ref={containerRef}
            className={cn('relative min-w-[280px]', className)}
        >
            <div className="relative">
                <input
                    ref={inputRef}
                    id={inputId}
                    name="location"
                    type="text"
                    role="combobox"
                    value={value}
                    onChange={handleInputChange}
                    onFocus={() => {
                        setOpen(true);
                        if (value.trim().length >= 2) {
                            scheduleSuggestions(value, 0);
                        }
                    }}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    aria-autocomplete="list"
                    aria-expanded={open}
                    aria-haspopup="listbox"
                    aria-controls={listboxId}
                    aria-activedescendant={
                        highlightedIndex >= 0
                            ? `${listboxId}-${highlightedIndex}`
                            : undefined
                    }
                    autoComplete="off"
                    spellCheck={false}
                    className={cn(
                        'h-12 w-full rounded-xl border border-tijum-surface bg-white px-3.5 text-sm text-tijum-plum shadow-xs transition-all duration-150 outline-none placeholder:text-tijum-plum/45 focus:border-tijum-coral focus:ring-2 focus:ring-tijum-coral/25',
                        value && (loading || locating) ? 'pr-24' : 'pr-20',
                        inputClassName,
                    )}
                />

                <div className="absolute top-1/2 right-2.5 flex -translate-y-1/2 items-center gap-0.5">
                    {(loading || locating) && (
                        <Loader2
                            className="size-4 animate-spin text-tijum-plum"
                            aria-label={
                                locating
                                    ? 'Finding your location'
                                    : 'Loading address suggestions'
                            }
                        />
                    )}
                    {value && (
                        <button
                            type="button"
                            onClick={handleClear}
                            aria-label="Clear location"
                            title="Clear location"
                            className="cursor-pointer rounded-lg p-1.5 text-tijum-plum/75 transition-colors hover:bg-tijum-cream hover:text-tijum-plum focus-visible:ring-2 focus-visible:ring-tijum-coral focus-visible:outline-none"
                        >
                            <X className="size-4" aria-hidden="true" />
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={() => locateCurrentUser(false)}
                        disabled={locating}
                        aria-label="Use my current location"
                        title="Use my current location"
                        className="cursor-pointer rounded-lg p-1.5 text-tijum-plum/80 transition-colors hover:bg-tijum-peach/25 hover:text-tijum-plum focus-visible:ring-2 focus-visible:ring-tijum-coral focus-visible:outline-none disabled:cursor-wait disabled:opacity-50"
                    >
                        <LocateFixed className="size-4" aria-hidden="true" />
                    </button>
                </div>
            </div>

            {open && (
                <div
                    id={listboxId}
                    role="listbox"
                    aria-label="Location suggestions"
                    className="absolute top-full right-0 left-0 z-50 mt-1.5 max-h-80 overflow-y-auto rounded-xl border border-tijum-surface bg-white py-1.5 shadow-tijum-card"
                >
                    <button
                        type="button"
                        onClick={() => locateCurrentUser(false)}
                        disabled={locating}
                        className="flex w-full items-center gap-2.5 border-b border-tijum-surface px-3 py-2.5 text-left text-xs font-semibold text-tijum-plum transition-colors hover:bg-tijum-cream disabled:cursor-wait disabled:opacity-60"
                    >
                        {locating ? (
                            <Loader2
                                className="size-4 shrink-0 animate-spin text-tijum-coral"
                                aria-hidden="true"
                            />
                        ) : (
                            <LocateFixed
                                className="size-4 shrink-0 text-tijum-coral"
                                aria-hidden="true"
                            />
                        )}
                        {locating
                            ? 'Finding your exact location...'
                            : 'Use my current location'}
                    </button>

                    {visibleSuggestions.length > 0 && (
                        <div>
                            <p className="px-3 pt-2 pb-1 font-heading text-[10px] font-semibold tracking-[0.12em] text-tijum-plum-muted uppercase">
                                {query.length >= 2
                                    ? 'Suggested addresses'
                                    : 'Available TIJUM locations'}
                            </p>
                            {visibleSuggestions.map((suggestion, index) => (
                                <button
                                    key={suggestion.id}
                                    id={`${listboxId}-${index}`}
                                    type="button"
                                    role="option"
                                    aria-selected={highlightedIndex === index}
                                    onMouseEnter={() =>
                                        setHighlightedIndex(index)
                                    }
                                    onClick={() => handleSelect(suggestion)}
                                    className={cn(
                                        'flex w-full items-start gap-2.5 px-3 py-2.5 text-left transition-colors',
                                        highlightedIndex === index
                                            ? 'bg-tijum-coral/12'
                                            : 'hover:bg-tijum-cream',
                                    )}
                                >
                                    <MapPin
                                        className="mt-0.5 size-3.5 shrink-0 text-tijum-plum-muted"
                                        aria-hidden="true"
                                    />
                                    <span className="min-w-0 text-xs leading-relaxed">
                                        <span className="font-semibold text-tijum-plum">
                                            {suggestion.title}
                                        </span>
                                        {suggestion.subtitle && (
                                            <span className="ml-1 text-tijum-plum-muted">
                                                {suggestion.subtitle}
                                            </span>
                                        )}
                                    </span>
                                </button>
                            ))}
                        </div>
                    )}

                    {showNoResults && (
                        <p className="px-4 py-4 text-center text-xs leading-relaxed text-tijum-plum-muted">
                            No matching address was found near TIJUM's supported
                            cities.
                        </p>
                    )}

                    {query.length >= 2 && (
                        <div className="border-t border-tijum-surface px-3 py-1.5 text-right text-[10px] text-tijum-plum-muted">
                            Powered by{' '}
                            <a
                                href="https://www.openstreetmap.org/copyright"
                                target="_blank"
                                rel="noreferrer"
                                className="font-semibold text-tijum-plum hover:text-tijum-coral"
                            >
                                OpenStreetMap
                            </a>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

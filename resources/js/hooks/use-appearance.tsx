import { useSyncExternalStore } from 'react';

export type ResolvedAppearance = 'light' | 'dark';
export type Appearance = ResolvedAppearance | 'system';

export type UseAppearanceReturn = {
    readonly appearance: Appearance;
    readonly resolvedAppearance: ResolvedAppearance;
    readonly updateAppearance: (mode: Appearance) => void;
};

const listeners = new Set<() => void>();

const getStoredAppearance = (): Appearance => {
    if (typeof window === 'undefined') {
        return 'light';
    }

    try {
        const local = localStorage.getItem('appearance') as Appearance | null;
        if (local === 'dark' || local === 'light' || local === 'system') {
            return local;
        }

        const cookieMatch = document.cookie.match(/(?:^|; )appearance=([^;]*)/);
        const cookieVal = cookieMatch ? decodeURIComponent(cookieMatch[1]) : null;
        if (cookieVal === 'dark' || cookieVal === 'light' || cookieVal === 'system') {
            return cookieVal;
        }
    } catch {
        // Fallback to DOM detection
    }

    if (typeof document !== 'undefined' && document.documentElement.classList.contains('dark')) {
        return 'dark';
    }

    return 'light';
};

let currentAppearance: Appearance = getStoredAppearance();

const setCookie = (name: string, value: string, days = 365): void => {
    if (typeof document === 'undefined') {
        return;
    }

    const maxAge = days * 24 * 60 * 60;
    document.cookie = `${name}=${value};path=/;max-age=${maxAge};SameSite=Lax`;
};

const resolveTheme = (mode: Appearance): ResolvedAppearance => {
    if (mode === 'system') {
        if (
            typeof window !== 'undefined' &&
            window.matchMedia('(prefers-color-scheme: dark)').matches
        ) {
            return 'dark';
        }
        return 'light';
    }
    return mode;
};

/**
 * Disables all CSS transitions instantaneously across the document while classes
 * mutate, guaranteeing zero layout thrashing, zero white/black intermediate flashing,
 * and zero animation lag across deeply nested DOM subtrees.
 */
const executeThemeMutation = (mutate: () => void): void => {
    if (typeof document === 'undefined') {
        mutate();
        return;
    }

    const style = document.createElement('style');
    style.appendChild(
        document.createTextNode(
            '*,*::before,*::after{-webkit-transition:none!important;-moz-transition:none!important;-o-transition:none!important;-ms-transition:none!important;transition:none!important}',
        ),
    );
    document.head.appendChild(style);

    mutate();

    // Force synchronous layout recalculation so the style takes effect before transitions are restored
    (() => window.getComputedStyle(document.body))();

    // Restore transitions on the following frame without UI freeze
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            if (style.parentNode) {
                style.parentNode.removeChild(style);
            }
        });
    });
};

const performDomUpdate = (resolved: ResolvedAppearance): void => {
    if (typeof document === 'undefined') {
        return;
    }

    const root = document.documentElement;
    if (resolved === 'dark') {
        root.classList.add('dark');
        root.style.colorScheme = 'dark';
    } else {
        root.classList.remove('dark');
        root.style.colorScheme = 'light';
    }

    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
        metaThemeColor.setAttribute(
            'content',
            resolved === 'dark' ? '#1E131D' : '#FFF4EE',
        );
    }
};

const applyTheme = (resolved: ResolvedAppearance): void => {
    executeThemeMutation(() => {
        performDomUpdate(resolved);
    });
};

const subscribe = (callback: () => void) => {
    listeners.add(callback);

    return () => listeners.delete(callback);
};

const notify = (): void => listeners.forEach((listener) => listener());

export function initializeTheme(): void {
    if (typeof window === 'undefined') {
        return;
    }

    currentAppearance = getStoredAppearance();
    const resolved = resolveTheme(currentAppearance);
    applyTheme(resolved);

    // Listen to OS system color-scheme changes if currently on 'system'
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', () => {
        if (currentAppearance === 'system') {
            applyTheme(mediaQuery.matches ? 'dark' : 'light');
            notify();
        }
    });

    // Listen to storage events from other tabs / windows
    window.addEventListener('storage', (e) => {
        if (e.key === 'appearance' && e.newValue) {
            const mode = (e.newValue as Appearance) || 'light';
            currentAppearance = mode;
            applyTheme(resolveTheme(mode));
            notify();
        }
    });
}

export function useAppearance(): UseAppearanceReturn {
    const appearance: Appearance = useSyncExternalStore(
        subscribe,
        () => currentAppearance,
        () => 'light',
    );

    const resolvedAppearance: ResolvedAppearance = resolveTheme(appearance);

    const updateAppearance = (mode: Appearance): void => {
        currentAppearance = mode;

        if (typeof window !== 'undefined') {
            try {
                localStorage.setItem('appearance', mode);
            } catch {}
        }

        setCookie('appearance', mode);
        applyTheme(resolveTheme(mode));
        notify();
    };

    return { appearance, resolvedAppearance, updateAppearance } as const;
}

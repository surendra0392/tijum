/**
 * Deep-link input sanitization utility.
 * Protects against ReDoS in URL parsing and malicious intent URLs.
 */

const MAX_DEEP_LINK_LENGTH = 2048;
const ALLOWED_SCHEMES = ['tijum:', 'https:'];
const ALLOWED_HOSTS = ['tijum.com', 'staging.tijum.com'];

export interface SanitizedLinkResult {
    isValid: boolean;
    sanitizedUrl: string | null;
    rejectionReason?: string;
}

/**
 * Validates and sanitizes an incoming deep-link URL.
 */
export function sanitizeDeepLink(
    rawUrl: string | null | undefined,
): SanitizedLinkResult {
    if (!rawUrl || typeof rawUrl !== 'string') {
        return {
            isValid: false,
            sanitizedUrl: null,
            rejectionReason: 'Empty or non-string URL',
        };
    }

    // 1. Enforce length boundary (prevent regex memory/time exhaustion)
    if (rawUrl.length > MAX_DEEP_LINK_LENGTH) {
        return {
            isValid: false,
            sanitizedUrl: null,
            rejectionReason: `URL length (${rawUrl.length}) exceeds maximum boundary (${MAX_DEEP_LINK_LENGTH})`,
        };
    }

    const trimmed = rawUrl.trim();

    // 2. Enforce scheme validation
    try {
        // Check custom scheme tijum://
        if (trimmed.startsWith('tijum://')) {
            // Validate path and params
            const afterScheme = trimmed.slice(8);
            // Check for excessive repetitive percent-encoded sequences (e.g. %25%25%25 or malformed runs)
            if (/(?:%[0-9a-fA-F]{2}){100,}/.test(afterScheme)) {
                return {
                    isValid: false,
                    sanitizedUrl: null,
                    rejectionReason:
                        'Excessive percent-encoded sequence detected (ReDoS prevention)',
                };
            }
            return { isValid: true, sanitizedUrl: trimmed };
        }

        // Check https:// scheme
        const parsed = new URL(trimmed);
        if (!ALLOWED_SCHEMES.includes(parsed.protocol)) {
            return {
                isValid: false,
                sanitizedUrl: null,
                rejectionReason: `Disallowed URL protocol: ${parsed.protocol}`,
            };
        }

        if (
            parsed.protocol === 'https:' &&
            !ALLOWED_HOSTS.includes(parsed.hostname.toLowerCase())
        ) {
            return {
                isValid: false,
                sanitizedUrl: null,
                rejectionReason: `Disallowed external host: ${parsed.hostname}`,
            };
        }

        // Pre-validate search params against exponential runs
        if (parsed.search && /(?:%[0-9a-fA-F]{2}){100,}/.test(parsed.search)) {
            return {
                isValid: false,
                sanitizedUrl: null,
                rejectionReason:
                    'Excessive percent-encoded parameter sequence (ReDoS prevention)',
            };
        }

        return { isValid: true, sanitizedUrl: trimmed };
    } catch (err) {
        return {
            isValid: false,
            sanitizedUrl: null,
            rejectionReason: `Malformed URL structure: ${err instanceof Error ? err.message : 'Parse error'}`,
        };
    }
}

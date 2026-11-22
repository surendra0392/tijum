import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeDeepLink } from '../src/utils/deepLinkSanitizer.ts';
import { resolveDeepLinkPath } from '../src/utils/deepLinkRouting.ts';

describe('Behavioral Suite 4: Deep Link Sanitization, Role Routing & Notification Targets', () => {
    it('sanitizes and resolves customer and partner deep links across tijum:// and https://tijum.com', () => {
        const propSanitized = sanitizeDeepLink(
            'https://tijum.com/properties/green-valley-homestay?city=hyderabad',
        );
        assert.equal(propSanitized.isValid, true);
        assert.equal(
            resolveDeepLinkPath(propSanitized.sanitizedUrl!),
            '/(customer)/explore/property/green-valley-homestay?city=hyderabad',
        );

        const customerBookingSanitized = sanitizeDeepLink(
            'tijum://reservations/TIJ-202611-ABCD',
        );
        assert.equal(customerBookingSanitized.isValid, true);
        assert.equal(
            resolveDeepLinkPath(customerBookingSanitized.sanitizedUrl!),
            '/(customer)/bookings/TIJ-202611-ABCD',
        );

        const partnerBookingSanitized = sanitizeDeepLink(
            'https://tijum.com/owner/reservations/TIJ-202611-ABCD',
        );
        assert.equal(partnerBookingSanitized.isValid, true);
        assert.equal(
            resolveDeepLinkPath(partnerBookingSanitized.sanitizedUrl!),
            '/(partner)/reservations/TIJ-202611-ABCD',
        );
    });

    it('resolves partner support cases, settlements, and customer support sub-routes accurately', () => {
        assert.equal(
            resolveDeepLinkPath('/owner/cases/CASE-2026-99'),
            '/(partner)/cases/CASE-2026-99',
        );
        assert.equal(
            resolveDeepLinkPath('/owner/settlements/STL-2026-11'),
            '/(partner)/settlements/STL-2026-11',
        );
        assert.equal(
            resolveDeepLinkPath('/r/TIJUM500'),
            '/(auth)/customer-register?referral_code=TIJUM500',
        );
    });

    it('blocks unsafe schemes, path traversal, and untrusted external hosts', () => {
        assert.equal(sanitizeDeepLink('javascript:alert(1)').isValid, false);
        assert.equal(
            sanitizeDeepLink('data:text/html,<h1>phish</h1>').isValid,
            false,
        );
        assert.equal(
            sanitizeDeepLink('https://evil-tijum.com/properties/test').isValid,
            false,
        );
        assert.equal(
            resolveDeepLinkPath('/../../etc/passwd'),
            '/',
        );
    });
});

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeDeepLink } from '../src/utils/deepLinkSanitizer.ts';
import { redirectSystemPath } from '../app/+native-intent.ts';

describe('Deep Link Sanitizer & ReDoS Protection', () => {
    it('allows valid tijum:// custom scheme URLs', () => {
        const res = sanitizeDeepLink(
            'tijum://properties/prop_123?check_in=2026-11-20',
        );
        assert.equal(res.isValid, true);
        assert.equal(
            res.sanitizedUrl,
            'tijum://properties/prop_123?check_in=2026-11-20',
        );
    });

    it('allows valid https://tijum.com universal links', () => {
        const res = sanitizeDeepLink(
            'https://tijum.com/reservations/RES-2026-001',
        );
        assert.equal(res.isValid, true);
        assert.equal(
            res.sanitizedUrl,
            'https://tijum.com/reservations/RES-2026-001',
        );
    });

    it('rejects URLs exceeding 2048 characters boundary', () => {
        const longParam = 'a'.repeat(2100);
        const res = sanitizeDeepLink(`tijum://search?q=${longParam}`);
        assert.equal(res.isValid, false);
        assert.ok(res.rejectionReason?.includes('exceeds maximum boundary'));
    });

    it('rejects disallowed schemes like javascript: or file:', () => {
        const resJs = sanitizeDeepLink('javascript:alert(1)');
        assert.equal(resJs.isValid, false);

        const resFile = sanitizeDeepLink('file:///etc/passwd');
        assert.equal(resFile.isValid, false);
    });

    it('rejects external unauthorized domains under https', () => {
        const res = sanitizeDeepLink('https://evil-phishing.com/tijum');
        assert.equal(res.isValid, false);
        assert.ok(res.rejectionReason?.includes('Disallowed external host'));
    });

    it('detects and rejects excessive repetitive percent-encoded runs (ReDoS mitigation)', () => {
        const malicious = 'tijum://properties?' + '%25'.repeat(120);
        const res = sanitizeDeepLink(malicious);
        assert.equal(res.isValid, false);
        assert.ok(res.rejectionReason?.includes('Excessive percent-encoded'));
    });
});

describe('Native Deep Link Routing', () => {
    it('rewrites official property links to the customer property route', () => {
        assert.equal(
            redirectSystemPath({
                path: 'https://tijum.com/properties/greenview-pg',
                initial: true,
            }),
            '/(customer)/explore/property/greenview-pg',
        );
    });

    it('rewrites official reservation links to customer booking details', () => {
        assert.equal(
            redirectSystemPath({
                path: 'tijum://reservations/TJM123',
                initial: false,
            }),
            '/(customer)/bookings/TJM123',
        );
    });

    it('normalizes role-prefixed routes and rejects unknown destinations', () => {
        assert.equal(
            redirectSystemPath({
                path: 'tijum://partner/dashboard',
                initial: true,
            }),
            '/(partner)/dashboard',
        );
        assert.equal(
            redirectSystemPath({
                path: 'https://evil.example/phishing',
                initial: true,
            }),
            '/',
        );
        assert.equal(
            redirectSystemPath({
                path: 'tijum://unknown/destination',
                initial: true,
            }),
            '/',
        );
        assert.equal(
            redirectSystemPath({
                path: '/(customer)/../(partner)/dashboard',
                initial: true,
            }),
            '/',
        );
    });

    it('rewrites backend notification action paths', () => {
        assert.equal(
            redirectSystemPath({
                path: 'https://tijum.com/owner/reservations/TJM123',
                initial: false,
            }),
            '/(partner)/reservations/TJM123',
        );
        assert.equal(
            redirectSystemPath({
                path: 'https://tijum.com/my-support/CASE123',
                initial: false,
            }),
            '/(customer)/support/CASE123',
        );
        assert.equal(
            redirectSystemPath({
                path: 'https://tijum.com/rewards',
                initial: false,
            }),
            '/(customer)/rewards',
        );
    });
});

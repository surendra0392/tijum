# TIJUM Platform Security Audit & Hardening Report

**Date:** 2026-11-17  
**Scope:** Full TIJUM Laravel 13 backend + React/Inertia 3 web platform (`apps/mobile` excluded per request).  
**Standard:** OWASP Top 10:2025, Dependency Supply Chain (`composer audit`, `npm audit`), Multi-Guard Access Control, XSS/Injection/Upload Prevention, Payment & Webhook Integrity.

---

## 1. Supply Chain & Dependency Audit

| Check | Scope | Result |
| --- | --- | --- |
| `composer audit --locked` | Locked PHP Composer dependencies | **0 known security advisories** |
| `npm audit --omit=dev` | Production Node/Web dependencies | **0 vulnerabilities found** |

---

## 2. Vulnerabilities Identified & Remediated

| Severity | Finding | Location | Remediation Applied |
| --- | --- | --- | --- |
| **High** | **Cross-Tenant IDOR on Owner Support Ticket Creation:** `property_id` validated global table existence (`exists:properties,id`), allowing an authenticated owner to attach another owner's property to a ticket and view its name. | `app/Http/Controllers/Owner/Support/OwnerSupportTicketController.php` | Scoped validation with `Rule::exists('properties', 'id')->where('owner_id', $owner->id)`. |
| **High** | **Incomplete Rich-HTML Sanitization & Unsanitized Email Campaigns (Stored XSS):** `BlogArticleService` had a `tr>` tag typo and relied on regex `preg_replace('/(javascript:\|on\w+=)/i', ...)` bypassable via entity encoding, whitespace (`on click=`), `vbscript:`, or double-nesting; `ContentBlockSanitizer` shared the same regex flaw; `AdminMarketingEmailCampaignController` persisted raw `content_html` without sanitization. | `app/Services/Security/HtmlSanitizer.php`, `app/Services/Blog/BlogArticleService.php`, `app/Services/Content/ContentBlockSanitizer.php`, `app/Http/Controllers/Admin/Marketing/AdminMarketingEmailCampaignController.php` | Created strict `DOMDocument` element/attribute/URL-scheme allowlist sanitizer `HtmlSanitizer::sanitizeRichHtml()` & `sanitizeUrl()`, stripping dangerous subtrees (`script`, `style`, `iframe`, `svg`, `object`, `embed`, `form`), all `on*` handlers, and unsafe URI schemes (`javascript:`, `vbscript:`, `data:`), enforcing `rel="noopener noreferrer"` on `target="_blank"`, and wired across Blog, CMS blocks, and Marketing Email campaigns. |
| **High** | **SVG XSS Upload Vector in Platform Brand Settings & Weak SVG Regex in Media Library:** `uploadAsset()` accepted `.svg` uploads onto `public` disk with zero executable content checks, while `MediaStorageService` checked a minimal regex bypassable via `foreignObject`, `<use xlink:href="javascript:...">`, `<animate>`, or entity encoding. | `app/Http/Controllers/Admin/System/AdminPlatformSettingController.php`, `app/Services/Media/MediaStorageService.php`, `app/Services/Security/HtmlSanitizer.php` | Enforced `HtmlSanitizer::assertSafeSvg()` rejecting missing `<svg>` roots, `<script>`, `<foreignObject>`, `<iframe>`, `<object>`, `<embed>`, `<animate*>`, `<set>`, all `on*=` attributes, and `javascript:`/`vbscript:`/`data:text/html` schemes (returning HTTP `422`). |
| **Medium** | **JSON-LD `<script>` Breakout Risk:** `JSON.stringify(...)` / `json_encode(...)` inside `<script type="application/ld+json">` did not escape `<` characters (`</script>` breakout vector). | `resources/js/components/public/public-seo-head.tsx`, `resources/js/components/breadcrumbs.tsx`, `resources/views/app.blade.php` | Escaped `<` as `\u003c` in React structured-data components and added `JSON_HEX_TAG \| JSON_HEX_AMP` in `app.blade.php`. |
| **Medium** | **Missing Baseline Browser Security Headers:** Responses lacked baseline clickjacking, MIME-sniffing, referrer, permission-policy, and HSTS headers. | `app/Http/Middleware/SecurityHeaders.php`, `bootstrap/app.php` | Registered global `SecurityHeaders` middleware setting `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`, and `Strict-Transport-Security` on HTTPS/production. |
| **Medium** | **Fail-Closed Non-Local Webhook Secret Handling & Config Alignment:** `WhatsAppWebhookController` read both `tijum.notifications.channels.whatsapp.app_secret` and `services.whatsapp.webhook_secret`, while `WebhookProcessingService` checked only the former and both SMS/WhatsApp failed closed only on `isProduction()`, leaving staging environments exposed if unconfigured. | `app/Http/Controllers/Webhooks/SmsWebhookController.php`, `app/Http/Controllers/Webhooks/WhatsAppWebhookController.php`, `app/Services/Notifications/WebhookProcessingService.php` | Aligned config lookup consistently and enforced fail-closed rejection (`503`) whenever webhook signing secrets are unconfigured outside `['local', 'testing']`. |
| **Low** | **Missing Endpoint Rate Limits on Token/Code/Geocode Lookups:** Referral code validation/redirects, newsletter unsubscribe token probes, reverse geocode lookups, and contact validation lacked dedicated route-level throttles. | `routes/web.php`, `routes/api.php` | Added explicit `throttle:30,1` and `throttle:20,1` limiters on referral, unsubscribe, geocode, and contact validation routes. |

---

## 3. Verified Core Security Controls Confirmed Intact

- **Authentication & Multi-Guard Isolation:** Separate guards (`web`, `owner`, `admin` + mandatory TOTP 2FA via `EnsureAdminTwoFactorVerified`) and Sanctum API guard middlewares (`EnsureCustomerToken`, `EnsureOwnerToken`) block cross-portal token and session escalation. `RedirectToPortalIntended` and `CustomerLoginResponse` restrict redirects to validated same-origin portal paths. `_dev/design-system` aborts `404` outside `['local', 'testing']`.
- **Payment & Webhook Integrity:** `VerifyCheckoutPayment` and `ProcessWebhookEvent` enforce HMAC signature verification, database `lockForUpdate()`, `order_id` binding, currency/amount verification against server-side records, and deduplication.
- **SQL & Mass Assignment Safety:** Dynamic query clauses use parameter bindings or strict Enum/numeric/date allowlists (`AdminPropertyController`, `AdminOperationsQueueService`, `PropertySearchService`); form controllers validate via `FormRequest` / explicit validated subsets. Admin report CSV exports escape spreadsheet formula characters (`sanitizeCell()`).
- **Private Document Storage & Sensitive Response Cache Control:** Owner KYC and Property verification documents stream from private disks with ownership/role policy checks (`Gate::authorize`), `X-Content-Type-Options: nosniff`, and `Cache-Control: no-store, private`. `NoStoreSensitiveResponses` applies `no-store` across authenticated and checkout/payment/auth responses.

---

## 4. Verification Summary

- `composer audit --locked`: **0 advisories**
- `npm audit --omit=dev`: **0 vulnerabilities**
- `vendor/bin/pint --dirty --format agent`: **Passed**
- `vendor/bin/phpstan analyse` (all security, controller, middleware, and service files touched): **0 errors**
- `php artisan test --compact tests/Feature/Security tests/Feature/Notifications/NotificationWebhookTest.php tests/Feature/Pwa tests/Feature/PublicWebsiteTest.php tests/Feature/SeoAndMarketing/SitemapAndRobotsTest.php tests/Feature/Auth tests/Feature/Payments tests/Feature/Reservations`: Executed against latest edits (results recorded in session output).
- Frontend checks (`npx vp lint`, `npm run types:check`, `npm run build`): Verified clean TypeScript/lint/production bundle output.

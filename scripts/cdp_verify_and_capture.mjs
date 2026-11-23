import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const configPath = process.argv[2];
if (!configPath) {
    console.error('Usage: node scripts/cdp_verify_and_capture.mjs <config.json>');
    process.exit(1);
}

const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const {
    cdpPort,
    baseUrl,
    screenshotsDir,
    fixtures,
    credentials,
} = config;

if (!/^http:\/\/127\.0\.0\.1:\d+$/.test(baseUrl)) {
    throw new Error('CDP verification requires the isolated loopback QA proxy.');
}

const statesDir = path.join(screenshotsDir, 'states');
fs.mkdirSync(screenshotsDir, { recursive: true });
fs.mkdirSync(statesDir, { recursive: true });

class CdpClient {
    constructor(wsUrl) {
        this.wsUrl = wsUrl;
        this.nextId = 1;
        this.pending = new Map();
        this.listeners = new Map();
    }

    async connect() {
        await new Promise((resolve, reject) => {
            this.ws = new WebSocket(this.wsUrl);
            this.ws.addEventListener('open', resolve);
            this.ws.addEventListener('error', (err) =>
                reject(new Error(`CDP WebSocket error: ${err?.message || err}`)),
            );
            this.ws.addEventListener('message', (event) => {
                const msg = JSON.parse(event.data);
                if (msg.id && this.pending.has(msg.id)) {
                    const { resolve: res, reject: rej } = this.pending.get(msg.id);
                    this.pending.delete(msg.id);
                    if (msg.error) {
                        rej(new Error(`CDP ${msg.error.code}: ${msg.error.message}`));
                    } else {
                        res(msg.result);
                    }
                } else if (msg.method) {
                    const handlers = this.listeners.get(msg.method) || [];
                    for (const h of handlers) {
                        h(msg.params);
                    }
                }
            });
        });
    }

    on(method, handler) {
        if (!this.listeners.has(method)) {
            this.listeners.set(method, []);
        }
        this.listeners.get(method).push(handler);
    }

    send(method, params = {}) {
        const id = this.nextId++;
        return new Promise((resolve, reject) => {
            this.pending.set(id, { resolve, reject });
            this.ws.send(JSON.stringify({ id, method, params }));
        });
    }

    close() {
        try {
            this.ws?.close();
        } catch {}
    }
}

async function getPageWsUrl(port) {
    for (let attempt = 0; attempt < 30; attempt++) {
        try {
            const res = await fetch(`http://127.0.0.1:${port}/json/list`);
            const targets = await res.json();
            const page = targets.find((t) => t.type === 'page' && t.webSocketDebuggerUrl);
            if (page) {
                return page.webSocketDebuggerUrl;
            }
        } catch {}
        await new Promise((r) => setTimeout(r, 300));
    }
    throw new Error(`Timed out waiting for Chrome CDP page target on port ${port}`);
}

async function apiLogin(role, email, password) {
    const endpoint =
        role === 'owner'
            ? `${baseUrl}/api/v1/auth/owner/login`
            : `${baseUrl}/api/v1/auth/customer/login`;
    const res = await fetch(endpoint, {
        method: 'POST',
        redirect: 'error',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            email,
            password,
            device_name: 'TIJUM QA CDP Harness',
        }),
    });
    const body = await res.json();
    if (!res.ok || !body?.success || !body?.data?.token) {
        throw new Error(
            `API login failed for ${role} (${email}): HTTP ${res.status} ${JSON.stringify(body)}`,
        );
    }
    return body.data.token;
}

async function apiFetch(endpoint, token, options = {}) {
    const res = await fetch(`${baseUrl}/api/v1/${endpoint.replace(/^\//, '')}`, {
        method: options.method || 'GET',
        redirect: 'error',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(options.headers || {}),
        },
        body: options.body ? JSON.stringify(options.body) : undefined,
    });
    const text = await res.text();
    let json = null;
    try {
        json = text ? JSON.parse(text) : null;
    } catch {}
    return { status: res.status, ok: res.ok, json, text };
}

async function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
}

async function evalJs(cdp, expression) {
    const result = await cdp.send('Runtime.evaluate', {
        expression,
        awaitPromise: true,
        returnByValue: true,
    });
    if (result.exceptionDetails) {
        throw new Error(
            `JS eval error: ${result.exceptionDetails.text} ${JSON.stringify(result.exceptionDetails.exception)}`,
        );
    }
    return result.result?.value;
}

async function setSession(cdp, token, principalType) {
    await cdp.send('Page.navigate', { url: `${baseUrl}/` });
    await sleep(600);
    await evalJs(
        cdp,
        `(() => {
            window.sessionStorage.clear();
            window.localStorage.clear();
            ${
                token && principalType
                    ? `window.sessionStorage.setItem('tijum_active_session_token', ${JSON.stringify(token)});
                       window.sessionStorage.setItem('tijum_active_principal_type', ${JSON.stringify(principalType)});`
                    : ''
            }
            return true;
        })()`,
    );
}

async function toggleSimulatedApiError(enabled) {
    const res = await fetch(`${baseUrl}/__qa/simulate-error?on=${enabled ? '1' : '0'}`);
    if (!res.ok) {
        throw new Error(`Failed to toggle simulated API error: HTTP ${res.status}`);
    }
}

async function run() {
    const wsUrl = await getPageWsUrl(cdpPort);
    const cdp = new CdpClient(wsUrl);
    await cdp.connect();

    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    await cdp.send('Network.enable');
    await cdp.send('Emulation.setDeviceMetricsOverride', {
        width: 390,
        height: 844,
        deviceScaleFactor: 2,
        mobile: true,
    });

    let currentNetFailures = [];
    let currentExceptions = [];

    const requestUrlById = new Map();
    cdp.on('Network.requestWillBeSent', (params) => {
        requestUrlById.set(params.requestId, params.request.url);
    });
    cdp.on('Network.responseReceived', (params) => {
        const url = params.response.url;
        if (url.includes('/api/v1/') && params.response.status >= 400) {
            currentNetFailures.push({
                url,
                status: params.response.status,
                statusText: params.response.statusText,
            });
        }
    });
    cdp.on('Network.loadingFailed', (params) => {
        const url = requestUrlById.get(params.requestId) || '';
        if (url.includes('/api/v1/') && !params.canceled) {
            currentNetFailures.push({
                url,
                status: 0,
                errorText: params.errorText,
            });
        }
    });
    cdp.on('Runtime.exceptionThrown', (params) => {
        currentExceptions.push(
            params.exceptionDetails?.exception?.description ||
                params.exceptionDetails?.text ||
                'Uncaught exception',
        );
    });

    const results = [];
    const uiInteractionResults = [];
    const apiIntegrationResults = [];
    const failures = [];

    async function captureAndVerify(spec) {
        const {
            name,
            file,
            route,
            role = 'guest',
            token = null,
            expectTexts = [],
            forbidTexts = [],
            expectApiFailure = false,
            fullPage = false,
            maxFullHeight = 2200,
            beforeCapture = null,
            timeoutMs = 15000,
        } = spec;

        currentNetFailures = [];
        currentExceptions = [];

        const principalType =
            role === 'customer' ? 'customer' : role === 'owner' ? 'owner' : null;
        await setSession(cdp, token, principalType);

        // Reset viewport to standard phone dimensions before navigation
        await cdp.send('Emulation.setDeviceMetricsOverride', {
            width: 390,
            height: 844,
            deviceScaleFactor: 2,
            mobile: true,
        });

        currentNetFailures = [];
        currentExceptions = [];

        const targetUrl = `${baseUrl}${route}`;
        await cdp.send('Page.navigate', { url: targetUrl });

        if (beforeCapture) {
            await beforeCapture(cdp);
        }

        const start = Date.now();
        let lastText = '';
        let matched = false;
        let missing = expectTexts;

        while (Date.now() - start < timeoutMs) {
            await sleep(350);
            lastText =
                (await evalJs(
                    cdp,
                    `(() => (document.body?.innerText || '').trim())()`,
                )) || '';

            const lower = lastText.toLowerCase();
            missing = expectTexts.filter(
                (t) => !lower.includes(t.toLowerCase()),
            );
            if (lastText.length > 0 && missing.length === 0) {
                // Give images & layout 500ms to finish painting
                await sleep(500);
                lastText =
                    (await evalJs(
                        cdp,
                        `(() => (document.body?.innerText || '').trim())()`,
                    )) || '';
                matched = true;
                break;
            }
        }

        const lowerFinal = lastText.toLowerCase();
        const foundForbidden = forbidTexts.filter((t) => {
            if (t === 'NaN') {
                return /\bNaN\b/.test(lastText);
            }
            return lowerFinal.includes(t.toLowerCase());
        });

        const metrics = await evalJs(
            cdp,
            `(() => {
                const imgs = Array.from(document.querySelectorAll('img'));
                const brokenImgs = imgs
                    .filter((img) => img.src && (!img.complete || img.naturalWidth === 0))
                    .map((img) => img.src);
                const docOverflow = document.documentElement.scrollWidth - window.innerWidth;
                let maxScrollHeight = document.documentElement.scrollHeight;
                for (const el of document.querySelectorAll('div')) {
                    const style = window.getComputedStyle(el);
                    if ((style.overflowY === 'auto' || style.overflowY === 'scroll') && el.scrollHeight > el.clientHeight + 20) {
                        const needed = el.scrollHeight + (window.innerHeight - el.clientHeight);
                        if (needed > maxScrollHeight) {
                            maxScrollHeight = needed;
                        }
                    }
                }
                const loadedFonts = Array.from(document.fonts || [])
                    .filter((f) => f.status === 'loaded')
                    .map((f) => f.family);
                return {
                    textLength: (document.body?.innerText || '').trim().length,
                    nestedButtons: document.querySelectorAll('button button').length,
                    docOverflow,
                    maxScrollHeight,
                    totalImgs: imgs.length,
                    brokenImgs,
                    loadedFonts: Array.from(new Set(loadedFonts)),
                };
            })()`,
        );

        let captureHeight = 844;
        if (fullPage && metrics?.maxScrollHeight > 844) {
            captureHeight = Math.min(
                Math.ceil(metrics.maxScrollHeight) + 24,
                maxFullHeight,
            );
            await cdp.send('Emulation.setDeviceMetricsOverride', {
                width: 390,
                height: captureHeight,
                deviceScaleFactor: 2,
                mobile: true,
            });
            await sleep(300);
        }

        const shot = await cdp.send('Page.captureScreenshot', {
            format: 'png',
        });

        // Restore viewport
        if (captureHeight !== 844) {
            await cdp.send('Emulation.setDeviceMetricsOverride', {
                width: 390,
                height: 844,
                deviceScaleFactor: 2,
                mobile: true,
            });
        }

        const outPath = path.join(screenshotsDir, file);
        fs.mkdirSync(path.dirname(outPath), { recursive: true });
        fs.writeFileSync(outPath, Buffer.from(shot.data, 'base64'));

        const screenErrors = [];
        if (!matched) {
            screenErrors.push(
                `Missing expected content: ${JSON.stringify(missing)}`,
            );
        }
        if (foundForbidden.length > 0) {
            screenErrors.push(
                `Found forbidden content: ${JSON.stringify(foundForbidden)}`,
            );
        }
        if (!expectApiFailure && currentNetFailures.length > 0) {
            screenErrors.push(
                `Unexpected API failure(s): ${JSON.stringify(currentNetFailures)}`,
            );
        }
        if (expectApiFailure && currentNetFailures.length === 0) {
            screenErrors.push('Expected simulated API failure did not occur.');
        }
        if (currentExceptions.length > 0) {
            screenErrors.push(
                `Uncaught JS exception(s): ${JSON.stringify(currentExceptions)}`,
            );
        }
        if (metrics.nestedButtons > 0) {
            screenErrors.push(`Buttons nested inside buttons: ${metrics.nestedButtons}`);
        }
        if (metrics.docOverflow > 4) {
            screenErrors.push(
                `Horizontal overflow detected: +${metrics.docOverflow}px`,
            );
        }
        if (metrics.brokenImgs.length > 0) {
            screenErrors.push(
                `Broken image(s): ${JSON.stringify(metrics.brokenImgs)}`,
            );
        }

        const record = {
            name,
            file,
            route,
            role,
            passed: screenErrors.length === 0,
            viewportHeight: captureHeight,
            bytes: fs.statSync(outPath).size,
            metrics,
            errors: screenErrors,
            textPreview: lastText.slice(0, 260).replace(/\s+/g, ' '),
        };
        results.push(record);

        if (record.passed) {
            console.log(
                `[PASS] ${file} (${captureHeight}px, ${record.bytes}B, imgs=${metrics.totalImgs}) — ${name}`,
            );
        } else {
            console.error(
                `[FAIL] ${file} — ${name}: ${screenErrors.join(' | ')} | preview="${record.textPreview}"`,
            );
            failures.push(record);
        }
    }

    // 1. Obtain real Sanctum tokens from the isolated Laravel backend
    console.log('Authenticating isolated QA fixtures against test backend...');
    const customerToken = await apiLogin(
        'customer',
        fixtures.customer_email,
        credentials.customerPassword,
    );
    const partnerToken = await apiLogin(
        'owner',
        fixtures.partner_email,
        credentials.partnerPassword,
    );
    const emptyCustomerToken = await apiLogin(
        'customer',
        fixtures.empty_customer_email,
        credentials.emptyPassword,
    );
    const emptyPartnerToken = await apiLogin(
        'owner',
        fixtures.empty_partner_email,
        credentials.emptyPassword,
    );

    const COMMON_HEALTHY_FORBID = [
        'Failed to fetch',
        'Unable to Load',
        'Something Went Wrong',
        'Partner Access Required',
        'Sign In Required',
        'NaN',
    ];

    // 2. Capture Public & Auth Screens
    await captureAndVerify({
        name: 'Onboarding Welcome Screen',
        file: '01-onboarding.png',
        route: '/',
        role: 'guest',
        expectTexts: ['Skip', 'Comfortable Stays', 'Hostels, PGs, Homestays & Co-living spaces'],
        forbidTexts: ['Failed to fetch', 'Something Went Wrong'],
    });

    await captureAndVerify({
        name: 'Customer Login Screen',
        file: '02-customer-login.png',
        route: '/(auth)/customer-login',
        role: 'guest',
        expectTexts: ['Welcome Back', 'Log In', 'Sign Up'],
        forbidTexts: ['Failed to fetch', 'Something Went Wrong'],
    });

    await captureAndVerify({
        name: 'Customer Register Screen',
        file: '03-customer-register.png',
        route: '/(auth)/customer-register',
        role: 'guest',
        fullPage: true,
        expectTexts: ['Create Customer Account', 'Full Name', 'Email'],
        forbidTexts: ['Failed to fetch', 'Something Went Wrong'],
    });

    await captureAndVerify({
        name: 'Partner Login Screen',
        file: '04-owner-login.png',
        route: '/(auth)/owner-login',
        role: 'guest',
        expectTexts: ['Welcome Back, Partner', 'Sign In as Partner', 'Register as Partner'],
        forbidTexts: ['Failed to fetch', 'Something Went Wrong'],
    });

    await captureAndVerify({
        name: 'Partner Onboarding Register Screen (Real Cities Loaded)',
        file: '05-owner-register.png',
        route: '/(auth)/owner-register',
        role: 'guest',
        fullPage: true,
        expectTexts: ['List Your Property', 'Hostels/PG', 'Homestays', 'Co-Living', 'Hyderabad', 'Visakhapatnam'],
        forbidTexts: ['Failed to fetch', 'Something Went Wrong'],
    });

    // 3. Capture Populated Public Explore & Property Detail Screens
    await captureAndVerify({
        name: 'Explore Verified Stays (Populated with Real Seeded Properties)',
        file: '06-explore-stays.png',
        route: '/(customer)/explore',
        role: 'customer',
        token: customerToken,
        fullPage: true,
        maxFullHeight: 1900,
        expectTexts: [
            'All Stays',
            'Hostels/PG',
            'Homestays',
            'Co-Living',
            'Featured Properties',
            'Book Now',
            'Verified',
        ],
        forbidTexts: COMMON_HEALTHY_FORBID,
    });

    await captureAndVerify({
        name: 'Property Details (Rooms, Pricing, Meals & Reviews)',
        file: '07-property-details.png',
        route: `/(customer)/explore/property/${fixtures.property_slug}`,
        role: 'customer',
        token: customerToken,
        fullPage: true,
        maxFullHeight: 2400,
        expectTexts: [
            fixtures.property_name,
            'Available Room Categories',
            'Executive Single Room',
            'Book Stay',
            'Amenities',
            'Spotless rooms and punctual South Indian meals',
        ],
        forbidTexts: [...COMMON_HEALTHY_FORBID, 'T00:'],
    });

    await captureAndVerify({
        name: 'Booking Creation with Authoritative Server Quote',
        file: '08-booking-create.png',
        route: `/(customer)/bookings/create?property_id=${fixtures.property_id}&property_slug=${fixtures.property_slug}&property_room_type_id=${fixtures.room_type_id}`,
        role: 'customer',
        token: customerToken,
        fullPage: true,
        maxFullHeight: 2200,
        expectTexts: [
            'Confirm Booking',
            fixtures.property_name,
            'Estimated Summary',
            'Total Payable',
            'Request Reservation',
        ],
        forbidTexts: COMMON_HEALTHY_FORBID,
    });

    // 4. Capture Authenticated Customer Screens (Real Data)
    await captureAndVerify({
        name: 'Customer Bookings List (Authenticated Populated Stays)',
        file: '09-customer-bookings.png',
        route: '/(customer)/bookings',
        role: 'customer',
        token: customerToken,
        fullPage: true,
        maxFullHeight: 1800,
        expectTexts: [
            'My Bookings',
            'Upcoming',
            'Sri Sai Balaji Executive Hostel & PG',
        ],
        forbidTexts: COMMON_HEALTHY_FORBID,
    });

    await captureAndVerify({
        name: 'Customer Booking Detail — Active Payment Hold Countdown',
        file: '10-booking-detail-hold.png',
        route: `/(customer)/bookings/${fixtures.hold_booking_ref}`,
        role: 'customer',
        token: customerToken,
        fullPage: true,
        maxFullHeight: 2200,
        expectTexts: [
            fixtures.hold_booking_ref,
            'Action Required: Pay to Confirm',
            'Pay with Razorpay',
            'Cancel Reservation',
        ],
        forbidTexts: COMMON_HEALTHY_FORBID,
    });

    await captureAndVerify({
        name: 'Customer Support & Protection Cases (Authenticated)',
        file: '11-customer-support.png',
        route: '/(customer)/support',
        role: 'customer',
        token: customerToken,
        fullPage: true,
        maxFullHeight: 1900,
        expectTexts: [
            'Raise a Request',
            fixtures.case_ref,
            'Customer Protection SLAs',
            'Official Support Helpline',
        ],
        forbidTexts: COMMON_HEALTHY_FORBID,
    });

    await captureAndVerify({
        name: 'Customer Profile (Authenticated Rahul Sharma)',
        file: '12-customer-profile.png',
        route: '/(customer)/profile',
        role: 'customer',
        token: customerToken,
        fullPage: true,
        maxFullHeight: 1700,
        expectTexts: ['Rahul Sharma', 'customer@tijum.com'],
        forbidTexts: COMMON_HEALTHY_FORBID,
    });

    await captureAndVerify({
        name: 'Customer Rewards & Points Wallet (Authenticated)',
        file: '13-customer-rewards.png',
        route: '/(customer)/rewards',
        role: 'customer',
        token: customerToken,
        fullPage: true,
        maxFullHeight: 1900,
        expectTexts: ['Rewards', '750'],
        forbidTexts: COMMON_HEALTHY_FORBID,
    });

    await captureAndVerify({
        name: 'Customer Wishlist (Authenticated Saved Stays)',
        file: '14-customer-wishlist.png',
        route: '/(customer)/wishlist',
        role: 'customer',
        token: customerToken,
        fullPage: true,
        maxFullHeight: 1600,
        expectTexts: ['Sri Sai Balaji Executive Hostel & PG'],
        forbidTexts: COMMON_HEALTHY_FORBID,
    });

    // 5. Capture Authenticated Partner Screens (Real Data)
    await captureAndVerify({
        name: 'Partner Dashboard (Authenticated Kalyan Chakravarthy)',
        file: '15-partner-dashboard.png',
        route: '/(partner)/dashboard',
        role: 'owner',
        token: partnerToken,
        fullPage: true,
        maxFullHeight: 2000,
        expectTexts: [
            'Hello, Kalyan Chakravarthy',
            'Arrivals Today',
            'Confirmed Stays',
            'Monthly Earnings',
            '₹12,861',
            'Recent Bookings',
        ],
        forbidTexts: COMMON_HEALTHY_FORBID,
    });

    await captureAndVerify({
        name: 'Partner Properties List (Authenticated Listings & Tools)',
        file: '16-partner-properties.png',
        route: '/(partner)/properties',
        role: 'owner',
        token: partnerToken,
        fullPage: true,
        maxFullHeight: 2200,
        expectTexts: [
            'My Properties',
            'Sri Sai Balaji Executive Hostel & PG',
            'Inspect Physical Rooms',
            'Pricing',
            'Rooms',
        ],
        forbidTexts: COMMON_HEALTHY_FORBID,
    });

    await captureAndVerify({
        name: 'Partner Reservations List (Authenticated Guest Bookings)',
        file: '17-partner-reservations.png',
        route: '/(partner)/reservations',
        role: 'owner',
        token: partnerToken,
        fullPage: true,
        maxFullHeight: 1900,
        expectTexts: [
            'Upcoming',
            'Sri Sai Balaji Executive Hostel & PG',
            'Manage Booking',
            'Gross booking value: ₹5,950',
            'Estimated partner payout: Settlement calculation pending',
        ],
        forbidTexts: COMMON_HEALTHY_FORBID,
    });

    await captureAndVerify({
        name: 'Partner Reservation Detail & Front-Desk Check-In Panel',
        file: '18-partner-reservation-detail.png',
        route: `/(partner)/reservations/${fixtures.today_booking_ref}`,
        role: 'owner',
        token: partnerToken,
        fullPage: true,
        maxFullHeight: 2300,
        expectTexts: [
            fixtures.today_booking_ref,
            'Physical Room Allocation',
            'Front-Desk Actions',
            'Check In Guest',
            'Gross Booking Value:',
            '₹3,400',
            'Estimated Partner Payout:',
            '₹2,918.56',
        ],
        forbidTexts: COMMON_HEALTHY_FORBID,
    });

    await captureAndVerify({
        name: 'Partner Financial Profile & KYC (Verified PAN/GSTIN/IFSC)',
        file: '19-partner-financial-profile.png',
        route: '/(partner)/financial-profile',
        role: 'owner',
        token: partnerToken,
        fullPage: true,
        maxFullHeight: 2000,
        expectTexts: [
            'Financial Profile',
            'Sri Sai Balaji Hospitality Private Limited',
            'Private Limited Company',
            'ABCDE1234F',
            'HDFC0001234',
            'HDFC Bank Ltd',
        ],
        forbidTexts: [...COMMON_HEALTHY_FORBID, 'hospitality_service_provider'],
    });

    await captureAndVerify({
        name: 'Partner Settlements List (Settled & Approved Cycles)',
        file: '20-partner-settlements.png',
        route: '/(partner)/settlements',
        role: 'owner',
        token: partnerToken,
        fullPage: true,
        maxFullHeight: 1900,
        expectTexts: [
            '₹12,861',
            '₹2,915.16',
            fixtures.settlement_settled_ref,
            fixtures.settlement_pending_ref,
        ],
        forbidTexts: [...COMMON_HEALTHY_FORBID, 'T00:00:00'],
    });

    await captureAndVerify({
        name: 'Partner Settlement Statement Detail Breakdown',
        file: '21-partner-settlement-detail.png',
        route: `/(partner)/settlements/${fixtures.settlement_settled_ref}`,
        role: 'owner',
        token: partnerToken,
        fullPage: true,
        maxFullHeight: 2000,
        expectTexts: [
            'Settlement Statement',
            fixtures.settlement_settled_ref,
        ],
        forbidTexts: COMMON_HEALTHY_FORBID,
    });

    await captureAndVerify({
        name: 'Public Help & FAQs Screen (API-Loaded FAQs)',
        file: '22-help-faq.png',
        route: '/help',
        role: 'guest',
        fullPage: true,
        maxFullHeight: 1900,
        expectTexts: ['Help'],
        forbidTexts: ['Failed to fetch', 'Something Went Wrong'],
    });

    await captureAndVerify({
        name: 'Legal Terms of Service Screen',
        file: '23-legal-terms.png',
        route: '/legal/terms',
        role: 'guest',
        fullPage: true,
        maxFullHeight: 1900,
        expectTexts: ['Terms'],
        forbidTexts: ['Failed to fetch', 'Something Went Wrong'],
    });

    // 6. Explicitly Capture Legitimate Empty, Error & Auth-Gate States in states/
    await captureAndVerify({
        name: 'Legitimate Empty State — Customer with Zero Bookings',
        file: 'states/state-empty-customer-bookings.png',
        route: '/(customer)/bookings',
        role: 'customer',
        token: emptyCustomerToken,
        expectTexts: ['Upcoming'],
        forbidTexts: ['Failed to fetch', 'Sign In Required', 'Something Went Wrong'],
    });

    await captureAndVerify({
        name: 'Legitimate Empty State — Partner with Zero Properties',
        file: 'states/state-empty-partner-properties.png',
        route: '/(partner)/properties',
        role: 'owner',
        token: emptyPartnerToken,
        expectTexts: ['My Properties'],
        forbidTexts: ['Failed to fetch', 'Partner Access Required', 'Something Went Wrong'],
    });

    await captureAndVerify({
        name: 'Legitimate Auth Gate — Guest Visiting Partner Dashboard',
        file: 'states/state-auth-gate-partner-dashboard.png',
        route: '/(partner)/dashboard',
        role: 'guest',
        expectTexts: ['Partner Access Required', 'Sign In as Partner'],
        forbidTexts: ['Failed to fetch', 'Something Went Wrong'],
    });

    await toggleSimulatedApiError(true);
    try {
        await captureAndVerify({
            name: 'Legitimate Error State — Explore Screen When API Returns HTTP 503',
            file: 'states/state-error-explore-api-down.png',
            route: '/(customer)/explore',
            role: 'guest',
            expectApiFailure: true,
            expectTexts: ['Unable to Load Stays', 'Tap to Retry'],
            forbidTexts: ['Sri Sai Balaji Executive Hostel & PG'],
        });
    } finally {
        await toggleSimulatedApiError(false);
    }

    async function verifyCheck(results, label, name, fn) {
        try {
            const detail = await fn();
            console.log(`[${label} PASS] ${name} — ${detail}`);
            results.push({ name, passed: true, detail });
        } catch (err) {
            console.error(`[${label} FAIL] ${name} — ${err.message}`);
            results.push({ name, passed: false, error: err.message });
            failures.push({ name, errors: [err.message] });
        }
    }

    // M1: Customer UI Login via real form controls on /(auth)/customer-login
    await verifyCheck(uiInteractionResults, 'WEB UI', 'Customer login form establishes a session', async () => {
        await setSession(cdp, null, null);
        await cdp.send('Page.navigate', { url: `${baseUrl}/(auth)/customer-login` });
        await sleep(1200);
        const loginResult = await evalJs(
            cdp,
            `(async () => {
                const setNativeValue = (el, val) => {
                    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
                    setter.call(el, val);
                    el.dispatchEvent(new Event('input', { bubbles: true }));
                    el.dispatchEvent(new Event('change', { bubbles: true }));
                };
                const idEl = document.querySelector('[data-testid="login-identifier-input"]');
                const pwEl = document.querySelector('[data-testid="login-password-input"]');
                const btn = document.querySelector('[data-testid="login-submit-button"]');
                if (!idEl || !pwEl || !btn) {
                    return { ok: false, reason: 'Missing login testIDs in rendered DOM' };
                }
                setNativeValue(idEl, ${JSON.stringify(fixtures.customer_email)});
                setNativeValue(pwEl, ${JSON.stringify(credentials.customerPassword)});
                await new Promise(r => setTimeout(r, 150));
                btn.click();
                for (let i = 0; i < 30; i++) {
                    await new Promise(r => setTimeout(r, 250));
                    const tok = window.sessionStorage.getItem('tijum_active_session_token');
                    const pType = window.sessionStorage.getItem('tijum_active_principal_type');
                    if (tok && pType === 'customer' && document.querySelector('[data-testid="explore-search-input"]')) {
                        return { ok: true };
                    }
                }
                return { ok: false, reason: 'Session token not persisted after login submit', text: document.body.innerText.slice(0, 200) };
            })()`,
        );
        if (!loginResult?.ok) {
            throw new Error(JSON.stringify(loginResult));
        }
        return 'Submitted the rendered login form and reached Explore as a signed-in customer';
    });

    await verifyCheck(uiInteractionResults, 'WEB UI', 'Explore filters open and close', async () => {
        const filtersClosed = await evalJs(cdp, `(async () => {
            async function waitFor(testId, visible = true) {
                for (let attempt = 0; attempt < 40; attempt++) {
                    const control = document.querySelector('[data-testid="' + testId + '"]');
                    if (Boolean(control) === visible) return visible ? control : true;
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
                throw new Error('Unexpected visibility for ' + testId);
            }
            (await waitFor('explore-filter-button')).click();
            (await waitFor('explore-filter-close-button')).click();
            return await waitFor('explore-filter-close-button', false);
        })()`);
        if (!filtersClosed) {
            throw new Error('Stay Filters did not close.');
        }
        return 'Opened the rendered filter dialog and dismissed it with its close button';
    });

    await verifyCheck(uiInteractionResults, 'WEB UI', 'Explore wishlist and property actions work independently', async () => {
        await evalJs(cdp, `(async () => {
            async function waitFor(predicate, message) {
                for (let attempt = 0; attempt < 50; attempt++) {
                    const result = predicate();
                    if (result) return result;
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
                throw new Error(message);
            }
            const card = await waitFor(
                () => document.querySelector('[data-testid^="property-card-"]'),
                'No Explore property card was rendered',
            );
            const heart = card.parentElement.querySelector('button[aria-label$="wishlist"]');
            if (!heart || heart.parentElement !== card.parentElement) {
                throw new Error('The property and wishlist actions must be sibling buttons');
            }
            const explorePath = location.pathname;
            const propertyName = card.getAttribute('aria-label').replace('View property ', '');
            const previousLabel = heart.getAttribute('aria-label');
            heart.scrollIntoView({ block: 'center' });
            const bounds = heart.getBoundingClientRect();
            const target = document.elementFromPoint(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
            if (!heart.contains(target)) throw new Error('Wishlist button is covered by the card');
            heart.click();
            await waitFor(() => heart.getAttribute('aria-label') !== previousLabel, 'Wishlist action did not toggle');
            if (location.pathname !== explorePath) throw new Error('Wishlist action navigated away from Explore');

            card.click();
            await waitFor(
                () => location.pathname !== explorePath && document.querySelector('[data-testid="property-book-stay-btn"]') && document.body.innerText.includes(propertyName),
                'Property action did not open the selected property',
            );
        })()`);
        return 'Toggled the wishlist from Explore, then opened the same property using its card';
    });

    console.log('\nExecuting direct API integration checks against the isolated test database...');
    const verifyApi = (name, fn) => verifyCheck(apiIntegrationResults, 'API', name, fn);

    await verifyApi('Customer booking hold, unpaid status and cancellation', async () => {
        const createRes = await apiFetch('customer/reservations', customerToken, {
            method: 'POST',
            body: {
                submission_token: crypto.randomUUID(),
                property_id: fixtures.property_id,
                property_room_type_id: fixtures.room_type_id,
                check_in_date: fixtures.booking_check_in_date,
                duration_type: 'daily',
                duration_quantity: 2,
                quantity: 1,
                guest_count: 1,
                guest_gender: 'male',
                guest_composition: 'individuals',
            },
        });
        if (!createRes.ok || !createRes.json?.data?.reference) {
            throw new Error(`Create reservation failed: HTTP ${createRes.status} ${createRes.text}`);
        }
        const ref = createRes.json.data.reference;
        if (createRes.json.data.status !== 'awaiting_payment') {
            throw new Error(`Expected awaiting_payment, got ${createRes.json.data.status}`);
        }

        // Verify payment status remains unconfirmed prior to gateway capture
        const payStatusRes = await apiFetch(`customer/reservations/${ref}/payment/status`, customerToken);
        const payment = payStatusRes.json?.data;
        if (!payStatusRes.ok || payment?.booking_reference !== ref || payment.status !== 'awaiting_payment' || payment.has_captured_payment !== false) {
            throw new Error(`Expected an unpaid awaiting-payment hold for ${ref}: HTTP ${payStatusRes.status}`);
        }

        // Cancel reservation and assert backend state transitions to cancelled
        const cancelRes = await apiFetch(`customer/reservations/${ref}/cancel`, customerToken, {
            method: 'POST',
            body: { reason: 'QA automated cancellation verification' },
        });
        if (!cancelRes.ok) {
            throw new Error(`Cancel reservation failed: HTTP ${cancelRes.status} ${cancelRes.text}`);
        }

        const verifyRes = await apiFetch(`customer/reservations/${ref}`, customerToken);
        if (!verifyRes.ok || verifyRes.json?.data?.reference !== ref || verifyRes.json.data.status !== 'cancelled') {
            throw new Error(`Expected backend status 'cancelled', got '${verifyRes.json?.data?.status}'`);
        }
        return `Created hold ${ref} (awaiting_payment), verified status endpoint, cancelled & confirmed backend status=cancelled`;
    });

    // M3: Customer Support Protection Case Submission -> Backend Persistence Assert
    await verifyApi('Customer Protection Case Creation & Backend Persistence', async () => {
        const createCaseRes = await apiFetch('customer/cases', customerToken, {
            method: 'POST',
            body: {
                booking_reference: fixtures.upcoming_booking_ref,
                category: 'booking_problem',
                description: 'Automated E2E verification request confirming breakfast timings and room check-in preparation.',
            },
        });
        if (!createCaseRes.ok || !createCaseRes.json?.data?.case_reference) {
            throw new Error(`Case creation failed: HTTP ${createCaseRes.status} ${createCaseRes.text}`);
        }
        const newCaseRef = createCaseRes.json.data.case_reference;
        const listCasesRes = await apiFetch('customer/cases', customerToken);
        const found = (listCasesRes.json?.data || []).some((c) => c.case_reference === newCaseRef);
        if (!found) {
            throw new Error(`Created case ${newCaseRef} not found in GET /customer/cases`);
        }
        return `Submitted case ${newCaseRef} & verified persistence via GET /customer/cases`;
    });

    // M4: Partner Property Draft Creation -> Backend Persistence Assert
    let createdPropertyId = null;
    await verifyApi('Partner Property Draft Creation & Backend Persistence', async () => {
        const refDataRes = await apiFetch('owner/reference-data', partnerToken);
        const hostelsCat = (refDataRes.json?.data?.categories || []).find((c) => c.slug === 'hostels-pg');
        const hydCity = (refDataRes.json?.data?.cities || []).find((c) => c.slug === 'hyderabad');
        if (!hostelsCat || !hydCity) {
            throw new Error('Missing canonical hostels-pg category or hyderabad city in reference data');
        }
        const propName = `QA Verified Residency ${Date.now().toString().slice(-4)}`;
        const storeRes = await apiFetch('owner/properties', partnerToken, {
            method: 'POST',
            body: {
                name: propName,
                category_id: hostelsCat.id,
                city_id: hydCity.id,
                description: 'Automated QA draft property verifying canonical category and partner creation flow with spacious rooms.',
                contact_person_name: 'Kalyan Chakravarthy',
                contact_phone: '9848099888',
                address_line_1: 'Plot 99, QA Test Avenue',
                locality: 'Madhapur',
                postal_code: '500081',
            },
        });
        if (!storeRes.ok || !storeRes.json?.data?.id) {
            throw new Error(`Property creation failed: HTTP ${storeRes.status} ${storeRes.text}`);
        }
        createdPropertyId = storeRes.json.data.id;
        const listRes = await apiFetch('owner/properties', partnerToken);
        const found = (listRes.json?.data || []).some((p) => p.id === createdPropertyId && p.name === propName);
        if (!found) {
            throw new Error(`Created property #${createdPropertyId} not found in GET /owner/properties`);
        }
        return `Created property draft #${createdPropertyId} (${propName}) & verified persistence`;
    });

    // M5: Partner Inventory Mutation (Add Physical Room) -> Backend Persistence Assert
    await verifyApi('Partner Physical Room Inventory Addition & Persistence', async () => {
        const roomNo = `QA-${Date.now().toString().slice(-3)}`;
        const addRoomRes = await apiFetch(`owner/properties/${fixtures.property_id}/rooms`, partnerToken, {
            method: 'POST',
            body: {
                property_room_type_id: fixtures.room_type_id,
                room_number: roomNo,
                floor_number: '3',
                wing_name: 'North Wing',
            },
        });
        if (!addRoomRes.ok || !addRoomRes.json?.data?.id) {
            throw new Error(`Add physical room failed: HTTP ${addRoomRes.status} ${addRoomRes.text}`);
        }
        const listRoomsRes = await apiFetch(`owner/properties/${fixtures.property_id}/rooms`, partnerToken);
        const found = (listRoomsRes.json?.data || []).some((r) => r.room_number === roomNo);
        if (!found) {
            throw new Error(`Added room ${roomNo} not found in GET /owner/properties/${fixtures.property_id}/rooms`);
        }
        return `Added physical room ${roomNo} to property #${fixtures.property_id} & verified persistence`;
    });

    // M6: Partner Front-Desk Check-In & Check-Out -> Backend State Assert
    await verifyApi('Partner Front-Desk Check-In and Check-Out Lifecycle', async () => {
        const ref = fixtures.today_booking_ref;
        const checkInRes = await apiFetch(`owner/reservations/${ref}/check-in`, partnerToken, {
            method: 'POST',
            body: { notes: 'QA front-desk arrival verified and keys handed over' },
        });
        if (!checkInRes.ok || !checkInRes.json?.data?.checked_in_at) {
            throw new Error(`Check-in failed: HTTP ${checkInRes.status} ${checkInRes.text}`);
        }
        const checkOutRes = await apiFetch(`owner/reservations/${ref}/check-out`, partnerToken, {
            method: 'POST',
            body: { notes: 'QA checkout completed and room inspected' },
        });
        if (!checkOutRes.ok || !checkOutRes.json?.data?.checked_out_at) {
            throw new Error(`Check-out failed: HTTP ${checkOutRes.status} ${checkOutRes.text}`);
        }
        const verifyRes = await apiFetch(`owner/reservations/${ref}`, partnerToken);
        if (!verifyRes.json?.data?.checked_in_at || !verifyRes.json?.data?.checked_out_at) {
            throw new Error(`Backend missing checked_in_at/checked_out_at on ${ref}`);
        }
        return `Checked in & checked out ${ref} with persisted timestamps`;
    });

    // M7: Partner KYC Financial Profile Update -> Backend Persistence Assert
    await verifyApi('Partner Financial KYC Submission & Backend Persistence', async () => {
        const updateRes = await apiFetch('owner/financial-profile', partnerToken, {
            method: 'PUT',
            body: {
                legal_business_name: 'Sri Sai Balaji Hospitality Private Limited',
                business_constitution: 'private_limited',
                supplier_legal_classification: 'regular',
                pan_number: 'ABCDE1234F',
                gst_registered: true,
                gstin: '36ABCDE1234F1Z5',
                bank_account_number: '50100123454892',
                bank_ifsc: 'HDFC0004321',
                bank_name: 'HDFC Bank Ltd',
                bank_beneficiary_name: 'Sri Sai Balaji Hospitality Pvt Ltd',
            },
        });
        if (!updateRes.ok) {
            throw new Error(`KYC update failed: HTTP ${updateRes.status} ${updateRes.text}`);
        }
        const getKycRes = await apiFetch('owner/financial-profile', partnerToken);
        const kyc = getKycRes.json?.data;
        if (!getKycRes.ok || !kyc || (kyc.pan_number || kyc.pan) !== 'ABCDE1234F' || kyc.bank_ifsc !== 'HDFC0004321') {
            throw new Error('Updated PAN or IFSC was not returned by the financial profile API.');
        }
        return 'Updated the financial profile and verified the persisted PAN and changed IFSC';
    });

    const manifest = {
        generatedAt: new Date().toISOString(),
        viewport: '390x844 @2x mobile',
        totalScreens: results.length,
        passedScreens: results.filter((r) => r.passed).length,
        failedScreens: results.filter((r) => !r.passed).length,
        screens: results,
        webUiInteractions: uiInteractionResults,
        apiIntegrationChecks: apiIntegrationResults,
    };

    fs.writeFileSync(
        path.join(screenshotsDir, 'verification_manifest.json'),
        JSON.stringify(manifest, null, 2),
    );

    cdp.close();

    if (failures.length > 0) {
        console.error(`\nVERIFICATION FAILED: ${failures.length} check(s) failed.`);
        process.exit(1);
    }

    console.log(
        `\nALL VERIFICATIONS PASSED: ${manifest.passedScreens}/${manifest.totalScreens} web screen checks, ${uiInteractionResults.length} web UI interactions, ${apiIntegrationResults.length} direct API checks.`,
    );
}

run().catch((err) => {
    console.error('Fatal CDP verification error:', err);
    process.exit(1);
});

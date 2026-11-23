// Maestro JS assertion helper: verifies front-desk check-in and/or check-out persisted on backend.

if (!MAESTRO_API_URL || !MAESTRO_PARTNER_EMAIL || !MAESTRO_PARTNER_PASSWORD || !MAESTRO_TODAY_BOOKING_REF) {
    throw new Error('Missing required MAESTRO_* environment variables for front-desk assertion.');
}
if (MAESTRO_API_URL.indexOf('tijum.com/api') !== -1 && MAESTRO_API_URL.indexOf('staging.tijum.com') === -1) {
    throw new Error('REFUSING E2E BACKEND ASSERTION AGAINST PRODUCTION API: ' + MAESTRO_API_URL);
}

var loginRes = http.post(MAESTRO_API_URL + '/auth/owner/login', {
    headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        email: MAESTRO_PARTNER_EMAIL,
        password: MAESTRO_PARTNER_PASSWORD,
        device_name: 'Maestro E2E Verifier'
    })
});

if (!loginRes.ok) {
    throw new Error('Partner verifier login failed: HTTP ' + loginRes.status);
}
var token = json(loginRes.body).data.token;

var res = http.get(MAESTRO_API_URL + '/owner/reservations/' + MAESTRO_TODAY_BOOKING_REF, {
    headers: {
        'Accept': 'application/json',
        'Authorization': 'Bearer ' + token
    }
});

if (!res.ok) {
    throw new Error('Failed to fetch reservation ' + MAESTRO_TODAY_BOOKING_REF + ': HTTP ' + res.status);
}

var booking = json(res.body).data;
if (!booking || !booking.checked_in_at) {
    throw new Error('Backend assertion failed: checked_in_at is not set on ' + MAESTRO_TODAY_BOOKING_REF);
}

if (typeof ASSERT_CHECKOUT !== 'undefined' && ASSERT_CHECKOUT === 'true') {
    if (!booking.checked_out_at) {
        throw new Error('Backend assertion failed: checked_out_at is not set on ' + MAESTRO_TODAY_BOOKING_REF);
    }
}

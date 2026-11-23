// Verify the booking reference copied from the app after creating the hold.

if (!MAESTRO_API_URL || !MAESTRO_CUSTOMER_EMAIL || !MAESTRO_CUSTOMER_PASSWORD) {
    throw new Error('Missing required MAESTRO_API_URL, MAESTRO_CUSTOMER_EMAIL, or MAESTRO_CUSTOMER_PASSWORD.');
}
var reference = String(output.reservationReference || '').trim();
if (!/^TJR-\d{4}-[0-9A-Z]{26}$/i.test(reference)) {
    throw new Error('Expected a newly created reservation reference from the booking screen.');
}

var loginRes = http.post(MAESTRO_API_URL + '/auth/customer/login', {
    headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        email: MAESTRO_CUSTOMER_EMAIL,
        password: MAESTRO_CUSTOMER_PASSWORD,
        device_name: 'Maestro E2E Verifier'
    })
});

if (!loginRes.ok) {
    throw new Error('Customer verifier login failed: HTTP ' + loginRes.status);
}
var token = json(loginRes.body).data.token;

var bookingRes = http.get(MAESTRO_API_URL + '/customer/reservations/' + encodeURIComponent(reference), {
    headers: {
        'Accept': 'application/json',
        'Authorization': 'Bearer ' + token
    }
});

if (!bookingRes.ok) {
    throw new Error('Failed to fetch reservation ' + reference + ': HTTP ' + bookingRes.status);
}

var booking = json(bookingRes.body).data;
if (!booking || booking.reference !== reference || booking.status !== EXPECTED_BOOKING_STATUS) {
    throw new Error('Expected reservation ' + reference + ' to be ' + EXPECTED_BOOKING_STATUS);
}

if (EXPECTED_BOOKING_STATUS === 'cancelled' && booking.cancellation_reason !== 'Customer requested cancellation via mobile app') {
    throw new Error('Expected the mobile cancellation reason on reservation ' + reference);
}

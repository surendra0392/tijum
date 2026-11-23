// Maestro JS assertion helper: verifies newly created customer booking was cancelled in backend.
// Refuses to run against production tijum.com.

if (!MAESTRO_API_URL || !MAESTRO_CUSTOMER_EMAIL || !MAESTRO_CUSTOMER_PASSWORD) {
    throw new Error('Missing required MAESTRO_API_URL, MAESTRO_CUSTOMER_EMAIL, or MAESTRO_CUSTOMER_PASSWORD.');
}
if (MAESTRO_API_URL.indexOf('tijum.com/api') !== -1 && MAESTRO_API_URL.indexOf('staging.tijum.com') === -1) {
    throw new Error('REFUSING E2E BACKEND ASSERTION AGAINST PRODUCTION API: ' + MAESTRO_API_URL);
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
    throw new Error('Customer verifier login failed: HTTP ' + loginRes.status + ' ' + loginRes.body);
}
var token = json(loginRes.body).data.token;

var listRes = http.get(MAESTRO_API_URL + '/customer/reservations?status=cancelled', {
    headers: {
        'Accept': 'application/json',
        'Authorization': 'Bearer ' + token
    }
});

if (!listRes.ok) {
    throw new Error('Failed to fetch cancelled reservations: HTTP ' + listRes.status);
}

var items = json(listRes.body).data || [];
var matched = false;
for (var i = 0; i < items.length; i++) {
    var item = items[i];
    if (
        item.status === 'cancelled' &&
        item.cancellation_reason &&
        item.cancellation_reason.indexOf('Customer requested cancellation via mobile app') !== -1
    ) {
        matched = true;
        output.cancelledBookingRef = item.reference || item.booking_reference;
        break;
    }
}

if (!matched) {
    throw new Error('Backend assertion failed: no mobile-cancelled reservation found in GET /customer/reservations?status=cancelled');
}

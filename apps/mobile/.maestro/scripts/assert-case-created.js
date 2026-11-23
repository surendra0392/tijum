// Maestro JS assertion helper: verifies customer protection case was persisted in backend.

if (!MAESTRO_API_URL || !MAESTRO_CUSTOMER_EMAIL || !MAESTRO_CUSTOMER_PASSWORD || !MAESTRO_CASE_MARKER) {
    throw new Error('Missing required MAESTRO_* environment variables for case assertion.');
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
    throw new Error('Customer verifier login failed: HTTP ' + loginRes.status);
}
var token = json(loginRes.body).data.token;

var casesRes = http.get(MAESTRO_API_URL + '/customer/cases', {
    headers: {
        'Accept': 'application/json',
        'Authorization': 'Bearer ' + token
    }
});

if (!casesRes.ok) {
    throw new Error('Failed to fetch customer cases: HTTP ' + casesRes.status);
}

var cases = json(casesRes.body).data || [];
var found = false;
for (var i = 0; i < cases.length; i++) {
    var desc = cases[i].description || '';
    if (desc.indexOf(MAESTRO_CASE_MARKER) !== -1) {
        found = true;
        output.createdCaseRef = cases[i].case_reference;
        break;
    }
}

if (!found) {
    throw new Error('Backend assertion failed: no protection case matching marker "' + MAESTRO_CASE_MARKER + '" found.');
}

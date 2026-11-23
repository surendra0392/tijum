// Maestro JS assertion helper: verifies partner financial KYC profile update persisted in backend.

if (!MAESTRO_API_URL || !MAESTRO_PARTNER_EMAIL || !MAESTRO_PARTNER_PASSWORD || !MAESTRO_KYC_PAN || !MAESTRO_KYC_IFSC) {
    throw new Error('Missing required MAESTRO_* environment variables for KYC assertion.');
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

var kycRes = http.get(MAESTRO_API_URL + '/owner/financial-profile', {
    headers: {
        'Accept': 'application/json',
        'Authorization': 'Bearer ' + token
    }
});

if (!kycRes.ok) {
    throw new Error('Failed to fetch financial profile: HTTP ' + kycRes.status);
}

var profile = json(kycRes.body).data || {};
var actualPan = profile.pan_number || profile.pan;
if (actualPan !== MAESTRO_KYC_PAN || profile.bank_ifsc !== MAESTRO_KYC_IFSC) {
    throw new Error(
        'Backend KYC assertion failed: expected PAN=' +
            MAESTRO_KYC_PAN +
            ', IFSC=' +
            MAESTRO_KYC_IFSC +
            ' but got PAN=' +
            actualPan +
            ', IFSC=' +
            profile.bank_ifsc
    );
}

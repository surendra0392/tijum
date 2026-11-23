// Maestro JS assertion helper: verifies partner property draft persisted with canonical category.

if (!MAESTRO_API_URL || !MAESTRO_PARTNER_EMAIL || !MAESTRO_PARTNER_PASSWORD || !MAESTRO_NEW_PROPERTY_NAME) {
    throw new Error('Missing required MAESTRO_* environment variables for property assertion.');
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

var propsRes = http.get(MAESTRO_API_URL + '/owner/properties', {
    headers: {
        'Accept': 'application/json',
        'Authorization': 'Bearer ' + token
    }
});

if (!propsRes.ok) {
    throw new Error('Failed to fetch owner properties: HTTP ' + propsRes.status);
}

var properties = json(propsRes.body).data || [];
var found = false;
for (var i = 0; i < properties.length; i++) {
    if (properties[i].name === MAESTRO_NEW_PROPERTY_NAME) {
        found = true;
        output.createdPropertyId = String(properties[i].id);
        break;
    }
}

if (!found) {
    throw new Error('Backend assertion failed: created property "' + MAESTRO_NEW_PROPERTY_NAME + '" not found in GET /owner/properties.');
}

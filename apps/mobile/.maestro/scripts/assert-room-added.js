// Maestro JS assertion helper: verifies physical room inventory mutation persisted in backend.

if (!MAESTRO_API_URL || !MAESTRO_PARTNER_EMAIL || !MAESTRO_PARTNER_PASSWORD || !MAESTRO_PROPERTY_ID || !MAESTRO_NEW_ROOM_NUMBER) {
    throw new Error('Missing required MAESTRO_* environment variables for room assertion.');
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

var roomsRes = http.get(MAESTRO_API_URL + '/owner/properties/' + MAESTRO_PROPERTY_ID + '/rooms', {
    headers: {
        'Accept': 'application/json',
        'Authorization': 'Bearer ' + token
    }
});

if (!roomsRes.ok) {
    throw new Error('Failed to fetch property rooms: HTTP ' + roomsRes.status);
}

var rooms = json(roomsRes.body).data || [];
var found = false;
for (var i = 0; i < rooms.length; i++) {
    if (String(rooms[i].room_number) === String(MAESTRO_NEW_ROOM_NUMBER)) {
        found = true;
        break;
    }
}

if (!found) {
    throw new Error('Backend assertion failed: room "' + MAESTRO_NEW_ROOM_NUMBER + '" not found in property #' + MAESTRO_PROPERTY_ID);
}

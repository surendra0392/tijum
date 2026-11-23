// Run before launching a mutating flow. The app must target this same isolated backend.
if (typeof MAESTRO_API_URL !== 'string' || !/^(?:http:\/\/(?:127\.0\.0\.1|localhost):\d+|https:\/\/staging\.tijum\.com)\/api\/v1$/.test(MAESTRO_API_URL)) {
    throw new Error('Set MAESTRO_API_URL to the isolated loopback or TIJUM staging API.');
}

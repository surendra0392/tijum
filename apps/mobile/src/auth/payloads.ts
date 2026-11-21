export function buildLoginPayload(
    identifier: string,
    password: string,
    deviceName = 'TIJUM Mobile App',
) {
    return {
        email: identifier.trim(),
        password,
        device_name: deviceName,
    };
}

export function withPasswordConfirmation<T extends { password: string }>(
    payload: T,
): T & { password_confirmation: string } {
    return {
        ...payload,
        password_confirmation: payload.password,
    };
}

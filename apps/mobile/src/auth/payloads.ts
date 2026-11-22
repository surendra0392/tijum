export interface TwoFactorCredentials {
    code?: string;
    recoveryCode?: string;
}

export type CustomerLoginErrorClassification =
    | { kind: 'two_factor_required'; message: string }
    | { kind: 'invalid_two_factor_code'; message: string }
    | {
          kind: 'rate_limited';
          retryAfterSeconds: number | null;
          message: string;
      }
    | { kind: 'invalid_credentials'; message: string }
    | { kind: 'generic'; message: string };

export function buildLoginPayload(
    identifier: string,
    password: string,
    deviceName = 'TIJUM Mobile App',
    twoFactor?: TwoFactorCredentials,
) {
    const payload: {
        email: string;
        password: string;
        device_name: string;
        code?: string;
        recovery_code?: string;
    } = {
        email: identifier.trim(),
        password,
        device_name: deviceName,
    };

    const recoveryCode = twoFactor?.recoveryCode?.trim();
    const totpCode = twoFactor?.code?.trim();

    if (recoveryCode) {
        payload.recovery_code = recoveryCode;
    } else if (totpCode) {
        payload.code = totpCode;
    }

    return payload;
}

export function classifyCustomerLoginError(
    err: unknown,
): CustomerLoginErrorClassification {
    const errorObj = (err && typeof err === 'object' ? err : {}) as {
        status?: number;
        errorCode?: string;
        errors?: Record<string, any>;
        retryAfter?: number;
        message?: string;
    };
    const message =
        typeof errorObj.message === 'string' && errorObj.message.trim() !== ''
            ? errorObj.message
            : 'Login failed. Please check your credentials.';
    const errorCode = errorObj.errorCode;

    if (
        errorCode === 'TWO_FACTOR_REQUIRED' ||
        (errorObj.status === 403 &&
            errorObj.errors?.two_factor_required === true)
    ) {
        return {
            kind: 'two_factor_required',
            message:
                typeof errorObj.message === 'string' &&
                errorObj.message.trim() !== ''
                    ? errorObj.message
                    : 'Enter the 6-digit code from your authenticator app or a recovery code.',
        };
    }

    if (errorCode === 'INVALID_TWO_FACTOR_CODE') {
        return {
            kind: 'invalid_two_factor_code',
            message,
        };
    }

    if (errorCode === 'RATE_LIMITED' || errorObj.status === 429) {
        let retryAfterSeconds: number | null = null;
        if (
            typeof errorObj.retryAfter === 'number' &&
            Number.isFinite(errorObj.retryAfter) &&
            errorObj.retryAfter > 0
        ) {
            retryAfterSeconds = Math.ceil(errorObj.retryAfter);
        } else if (
            typeof errorObj.errors?.retry_after === 'number' &&
            Number.isFinite(errorObj.errors.retry_after) &&
            errorObj.errors.retry_after > 0
        ) {
            retryAfterSeconds = Math.ceil(errorObj.errors.retry_after);
        } else {
            const match = message.match(/(\d+)\s+seconds?/i);
            if (match) {
                const parsed = Number(match[1]);
                if (Number.isFinite(parsed) && parsed > 0) {
                    retryAfterSeconds = parsed;
                }
            }
        }

        return {
            kind: 'rate_limited',
            retryAfterSeconds,
            message,
        };
    }

    if (errorCode === 'INVALID_CREDENTIALS' || errorObj.status === 401) {
        return {
            kind: 'invalid_credentials',
            message,
        };
    }

    return {
        kind: 'generic',
        message,
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

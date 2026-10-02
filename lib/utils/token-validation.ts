/**
 * JWT Token Validation Utility
 *
 * Validates JWT tokens by checking:
 * - Presence (non-empty string)
 * - Parsability (well-formed JWT structure: header.payload.signature, base64url encoded)
 * - Expiration (exp claim not in the past)
 * - Required claims (userId and role must be present)
 */

export interface TokenValidationResult {
    valid: boolean;
    payload?: JwtPayload;
}

export interface JwtPayload {
    userId: string;
    role: string;
    exp: number;
    [key: string]: unknown;
}

/**
 * Decodes a base64url-encoded string to a UTF-8 string.
 */
function base64UrlDecode(str: string): string {
    // Replace base64url characters with standard base64
    let base64 = str.replace(/-/g, '+').replace(/_/g, '/');

    // Pad with '=' to make length a multiple of 4
    const padding = base64.length % 4;
    if (padding === 2) {
        base64 += '==';
    } else if (padding === 3) {
        base64 += '=';
    }

    // Decode using atob (browser) or Buffer (Node.js)
    if (typeof atob === 'function') {
        return atob(base64);
    }
    return Buffer.from(base64, 'base64').toString('utf-8');
}

/**
 * Validates a JWT token string.
 *
 * Returns `{ valid: true, payload }` if the token is:
 * - A non-empty string
 * - Well-formed JWT structure (header.payload.signature)
 * - Not expired (exp > current time)
 * - Contains required claims: userId (string) and role (string)
 *
 * Returns `{ valid: false }` for any other case.
 */
export function validateToken(token: unknown): TokenValidationResult {
    // Check presence - must be a non-empty string
    if (!token || typeof token !== 'string' || token.trim() === '') {
        return { valid: false };
    }

    // Check JWT structure: must have exactly 3 parts separated by dots
    const parts = token.split('.');
    if (parts.length !== 3) {
        return { valid: false };
    }

    // Each part must be a non-empty string
    if (parts.some((part) => part.length === 0)) {
        return { valid: false };
    }

    // Try to decode and parse the payload (second part)
    let payload: Record<string, unknown>;
    try {
        const decoded = base64UrlDecode(parts[1]);
        payload = JSON.parse(decoded) as Record<string, unknown>;
    } catch {
        return { valid: false };
    }

    // Validate required claims
    if (
        !payload.userId ||
        typeof payload.userId !== 'string' ||
        payload.userId.trim() === ''
    ) {
        return { valid: false };
    }

    if (
        !payload.role ||
        typeof payload.role !== 'string' ||
        payload.role.trim() === ''
    ) {
        return { valid: false };
    }

    // Validate expiration
    if (typeof payload.exp !== 'number') {
        return { valid: false };
    }

    const currentTimeInSeconds = Math.floor(Date.now() / 1000);
    if (payload.exp <= currentTimeInSeconds) {
        return { valid: false };
    }

    return {
        valid: true,
        payload: payload as unknown as JwtPayload,
    };
}

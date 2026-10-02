/**
 * Property 4: Token validation correctly classifies valid and invalid tokens
 *
 * **Validates: Requirements 3.4, 3.5**
 *
 * For any JWT string, the token validation function SHALL return `valid` if and only if
 * the token is parseable, not expired, and contains both `userId` and `role` claims.
 * For any token that is expired, missing required claims, or not a well-formed JWT structure,
 * the validation function SHALL return `invalid`.
 */

import { validateToken } from '@/lib/utils/token-validation';
import * as fc from 'fast-check';
import { describe, expect, it } from 'vitest';

// Helper: encode a string to base64url
function base64UrlEncode(str: string): string {
    const base64 = Buffer.from(str, 'utf-8').toString('base64');
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// Helper: create a valid JWT-like token from a payload
function createToken(payload: Record<string, unknown>): string {
    const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const body = base64UrlEncode(JSON.stringify(payload));
    const signature = base64UrlEncode('fake-signature-data');
    return `${header}.${body}.${signature}`;
}

// Arbitrary: generate a non-empty string for userId
const userIdArb = fc.string({ minLength: 1 }).filter((s) => s.trim().length > 0);

// Arbitrary: generate a non-empty string for role
const roleArb = fc.string({ minLength: 1 }).filter((s) => s.trim().length > 0);

// Arbitrary: generate a future expiration timestamp (valid token)
const futureExpArb = fc.integer({
    min: Math.floor(Date.now() / 1000) + 60,
    max: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 365 * 10,
});

// Arbitrary: generate a past expiration timestamp (expired token)
const pastExpArb = fc.integer({
    min: 0,
    max: Math.floor(Date.now() / 1000) - 1,
});

// Arbitrary: generate a valid token payload
const validPayloadArb = fc.record({
    userId: userIdArb,
    role: roleArb,
    exp: futureExpArb,
});

describe('Property 4: Token validation correctly classifies valid and invalid tokens', () => {
    it('should classify valid tokens as valid (parseable, not expired, has userId + role)', () => {
        fc.assert(
            fc.property(validPayloadArb, (payload) => {
                const token = createToken(payload);
                const result = validateToken(token);

                expect(result.valid).toBe(true);
                expect(result.payload).toBeDefined();
                expect(result.payload!.userId).toBe(payload.userId);
                expect(result.payload!.role).toBe(payload.role);
                expect(result.payload!.exp).toBe(payload.exp);
            }),
            { numRuns: 100 }
        );
    });

    it('should classify expired tokens as invalid', () => {
        fc.assert(
            fc.property(
                userIdArb,
                roleArb,
                pastExpArb,
                (userId, role, exp) => {
                    const token = createToken({ userId, role, exp });
                    const result = validateToken(token);

                    expect(result.valid).toBe(false);
                }
            ),
            { numRuns: 100 }
        );
    });

    it('should classify tokens missing userId as invalid', () => {
        fc.assert(
            fc.property(
                roleArb,
                futureExpArb,
                fc.oneof(
                    fc.constant(undefined),
                    fc.constant(null),
                    fc.constant(''),
                    fc.constant('   '),
                    fc.integer(),
                    fc.boolean()
                ),
                (role, exp, badUserId) => {
                    const payload: Record<string, unknown> = { role, exp };
                    if (badUserId !== undefined) {
                        payload.userId = badUserId;
                    }
                    const token = createToken(payload);
                    const result = validateToken(token);

                    expect(result.valid).toBe(false);
                }
            ),
            { numRuns: 100 }
        );
    });

    it('should classify tokens missing role as invalid', () => {
        fc.assert(
            fc.property(
                userIdArb,
                futureExpArb,
                fc.oneof(
                    fc.constant(undefined),
                    fc.constant(null),
                    fc.constant(''),
                    fc.constant('   '),
                    fc.integer(),
                    fc.boolean()
                ),
                (userId, exp, badRole) => {
                    const payload: Record<string, unknown> = { userId, exp };
                    if (badRole !== undefined) {
                        payload.role = badRole;
                    }
                    const token = createToken(payload);
                    const result = validateToken(token);

                    expect(result.valid).toBe(false);
                }
            ),
            { numRuns: 100 }
        );
    });

    it('should classify tokens with non-numeric or missing exp as invalid', () => {
        fc.assert(
            fc.property(
                userIdArb,
                roleArb,
                fc.oneof(
                    fc.constant(undefined),
                    fc.constant(null),
                    fc.constant('not-a-number'),
                    fc.boolean(),
                    fc.constant({})
                ),
                (userId, role, badExp) => {
                    const payload: Record<string, unknown> = { userId, role };
                    if (badExp !== undefined) {
                        payload.exp = badExp;
                    }
                    const token = createToken(payload);
                    const result = validateToken(token);

                    expect(result.valid).toBe(false);
                }
            ),
            { numRuns: 100 }
        );
    });

    it('should classify malformed tokens (not 3 dot-separated parts) as invalid', () => {
        fc.assert(
            fc.property(
                fc.oneof(
                    fc.string(), // random string, unlikely to have exactly 2 dots
                    fc.constant(''),
                    fc.constant('only-one-part'),
                    fc.constant('two.parts'),
                    fc.constant('four.parts.here.extra'),
                    fc.constant('a.b.c.d.e')
                ),
                (malformedToken) => {
                    // Only test tokens that don't have exactly 3 parts
                    const parts = malformedToken.split('.');
                    if (parts.length === 3 && parts.every((p) => p.length > 0)) {
                        return; // Skip - this might accidentally be valid structure
                    }
                    const result = validateToken(malformedToken);
                    expect(result.valid).toBe(false);
                }
            ),
            { numRuns: 100 }
        );
    });

    it('should classify non-string inputs as invalid', () => {
        fc.assert(
            fc.property(
                fc.oneof(
                    fc.constant(null),
                    fc.constant(undefined),
                    fc.integer(),
                    fc.boolean(),
                    fc.constant({}),
                    fc.constant([]),
                    fc.constant(0),
                    fc.constant(NaN)
                ),
                (nonStringInput) => {
                    const result = validateToken(nonStringInput);
                    expect(result.valid).toBe(false);
                }
            ),
            { numRuns: 100 }
        );
    });

    it('should classify tokens with unparseable payload (invalid base64/JSON) as invalid', () => {
        fc.assert(
            fc.property(
                fc.string({ minLength: 1 }),
                (randomPayload) => {
                    // Create a token with a non-base64url payload that won't parse as JSON
                    const header = base64UrlEncode(
                        JSON.stringify({ alg: 'HS256', typ: 'JWT' })
                    );
                    const signature = base64UrlEncode('sig');
                    // Use raw string that's not valid base64url JSON
                    const token = `${header}.!!!${randomPayload}!!!.${signature}`;
                    const result = validateToken(token);

                    expect(result.valid).toBe(false);
                }
            ),
            { numRuns: 100 }
        );
    });
});

import * as fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import {
    ALLOWED_IMAGE_MIME_TYPES,
    MAX_FILE_SIZE_BYTES,
    validateImageFile,
} from '@/lib/utils/file-validation';

/**
 * Property 5: File upload validation correctly accepts and rejects files
 *
 * **Validates: Requirements 6.7**
 *
 * For any file metadata with a size in bytes and a MIME type string,
 * the banner image validation function SHALL return valid if and only if
 * the size is ≤ 5,242,880 bytes (5 MB) AND the MIME type is one of
 * image/jpeg, image/png, or image/webp. All other combinations SHALL be rejected.
 */
describe('Property 5: File upload validation correctly accepts and rejects files', () => {
    const VALID_MIME_TYPES = [...ALLOWED_IMAGE_MIME_TYPES];
    const INVALID_MIME_TYPES = [
        'image/gif',
        'image/svg+xml',
        'image/bmp',
        'image/tiff',
        'application/pdf',
        'text/plain',
        'video/mp4',
        'application/octet-stream',
        '',
    ];

    const ALL_MIME_TYPES = [...VALID_MIME_TYPES, ...INVALID_MIME_TYPES];

    // Generator for file sizes between 0 and 10 MB
    const fileSizeArb = fc.integer({ min: 0, max: 10_485_760 });

    // Generator for MIME types (mix of valid and invalid)
    const mimeTypeArb = fc.oneof(
        fc.constantFrom(...ALL_MIME_TYPES),
        fc.string(), // random strings to cover unexpected MIME types
    );

    it('should return valid=true iff size ≤ 5,242,880 AND type is in allowed set', () => {
        fc.assert(
            fc.property(fileSizeArb, mimeTypeArb, (size, mimeType) => {
                const result = validateImageFile(size, mimeType);

                const isValidSize = size <= MAX_FILE_SIZE_BYTES;
                const isValidType = VALID_MIME_TYPES.includes(
                    mimeType as (typeof VALID_MIME_TYPES)[number],
                );
                const expectedValid = isValidSize && isValidType;

                expect(result.valid).toBe(expectedValid);
            }),
            { numRuns: 200 },
        );
    });

    it('should always accept files with valid size and valid MIME type', () => {
        const validSizeArb = fc.integer({ min: 0, max: MAX_FILE_SIZE_BYTES });
        const validMimeArb = fc.constantFrom(...VALID_MIME_TYPES);

        fc.assert(
            fc.property(validSizeArb, validMimeArb, (size, mimeType) => {
                const result = validateImageFile(size, mimeType);
                expect(result.valid).toBe(true);
                expect(result.error).toBeUndefined();
            }),
            { numRuns: 100 },
        );
    });

    it('should always reject files exceeding 5 MB regardless of MIME type', () => {
        const oversizeArb = fc.integer({
            min: MAX_FILE_SIZE_BYTES + 1,
            max: 10_485_760,
        });

        fc.assert(
            fc.property(oversizeArb, mimeTypeArb, (size, mimeType) => {
                const result = validateImageFile(size, mimeType);
                expect(result.valid).toBe(false);
                expect(result.error).toBeDefined();
            }),
            { numRuns: 100 },
        );
    });

    it('should always reject files with invalid MIME type regardless of size', () => {
        const invalidMimeArb = fc.string().filter(
            (s) => !VALID_MIME_TYPES.includes(s as (typeof VALID_MIME_TYPES)[number]),
        );

        fc.assert(
            fc.property(fileSizeArb, invalidMimeArb, (size, mimeType) => {
                const result = validateImageFile(size, mimeType);

                if (size <= MAX_FILE_SIZE_BYTES) {
                    // Size is valid but MIME is invalid → rejected for MIME
                    expect(result.valid).toBe(false);
                    expect(result.error).toBeDefined();
                } else {
                    // Both invalid → rejected (for size, since it's checked first)
                    expect(result.valid).toBe(false);
                    expect(result.error).toBeDefined();
                }
            }),
            { numRuns: 100 },
        );
    });

    it('should reject at the exact boundary: size = 5,242,881 bytes with valid MIME', () => {
        fc.assert(
            fc.property(
                fc.constantFrom(...VALID_MIME_TYPES),
                (mimeType) => {
                    const result = validateImageFile(
                        MAX_FILE_SIZE_BYTES + 1,
                        mimeType,
                    );
                    expect(result.valid).toBe(false);
                },
            ),
            { numRuns: 100 },
        );
    });

    it('should accept at the exact boundary: size = 5,242,880 bytes with valid MIME', () => {
        fc.assert(
            fc.property(
                fc.constantFrom(...VALID_MIME_TYPES),
                (mimeType) => {
                    const result = validateImageFile(
                        MAX_FILE_SIZE_BYTES,
                        mimeType,
                    );
                    expect(result.valid).toBe(true);
                },
            ),
            { numRuns: 100 },
        );
    });
});

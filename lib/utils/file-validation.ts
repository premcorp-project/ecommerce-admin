/**
 * File validation utility for upload operations.
 * Used by banner image upload and other file upload features.
 */

export const ALLOWED_IMAGE_MIME_TYPES = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/avif',
    'image/gif',
    'image/svg+xml',
    // Source/print formats (Cloudinary converts these on delivery)
    'image/tiff',
    'image/bmp',
    'image/heic',
    'image/heif',
] as const;

export type AllowedImageMimeType = (typeof ALLOWED_IMAGE_MIME_TYPES)[number];

/** Maximum file size in bytes (30 MB) */
export const MAX_FILE_SIZE_BYTES = 31_457_280;

export interface FileValidationResult {
    valid: boolean;
    error?: string;
}

/**
 * Validates a file for image upload.
 * Checks that the file size is ≤ 30 MB and the MIME type is one of
 * image/jpeg, image/png, or image/webp.
 *
 * @param size - File size in bytes
 * @param mimeType - File MIME type string
 * @returns Validation result with optional error message
 */
export function validateImageFile(
    size: number,
    mimeType: string,
): FileValidationResult {
    if (size > MAX_FILE_SIZE_BYTES) {
        return {
            valid: false,
            error: `File size exceeds 30 MB limit (${(size / 1_048_576).toFixed(1)} MB)`,
        };
    }

    if (
        !ALLOWED_IMAGE_MIME_TYPES.includes(mimeType as AllowedImageMimeType)
    ) {
        return {
            valid: false,
            error: `Invalid file type "${mimeType}". Allowed: JPEG, PNG, WebP`,
        };
    }

    return { valid: true };
}

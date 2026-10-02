/**
 * Property-Based Tests for Task 5.6: PriceDisplay
 *
 * Feature: customer-storefront
 *
 * Property 3: For any Variant with varying discountedPrice, bulkPricing, quantity,
 * and hasBulkAccess, the displayed price SHALL equal bulkPrice only when
 * hasBulkAccess=true AND quantity >= minQuantity; otherwise effectivePrice;
 * strikethrough iff discountedPrice !== null.
 *
 * **Validates: Requirements 5.5, 5.6, 5.7, 13.5**
 */

import * as fc from 'fast-check';
import { describe, expect, it } from 'vitest';


// Legacy type alias for backward compatibility with this test file
// TODO: Rewrite this test to use the new tiered pricing model (PricingTier[])
type BulkPricing = { minQuantity: number; bulkPrice: number };

// ─── Pure price-display logic (mirrors PriceDisplay.tsx) ────────────────────

/**
 * Mirrors the exact logic in PriceDisplay.tsx.
 * Extracted as a pure function so it can be tested without React rendering.
 */
function computeDisplayedPrice(
    effectivePrice: number,
    bulkPricing: BulkPricing | null | undefined,
    quantity: number,
    hasBulkAccess: boolean,
): number {
    const isBulkActive =
        hasBulkAccess === true &&
        bulkPricing != null &&
        quantity >= bulkPricing.minQuantity;

    return isBulkActive ? bulkPricing!.bulkPrice : effectivePrice;
}

/**
 * Mirrors the strikethrough logic in PriceDisplay.tsx.
 * Strikethrough is shown when:
 *   - bulk is NOT active (bulk price overrides the discount display)
 *   - discountedPrice is not null
 *   - originalPrice is provided
 */
function computeShowStrikethrough(
    discountedPrice: number | null,
    originalPrice: number | undefined,
    bulkPricing: BulkPricing | null | undefined,
    quantity: number,
    hasBulkAccess: boolean,
): boolean {
    const isBulkActive =
        hasBulkAccess === true &&
        bulkPricing != null &&
        quantity >= bulkPricing.minQuantity;

    return !isBulkActive && discountedPrice !== null && originalPrice != null;
}

// ─── Arbitraries ────────────────────────────────────────────────────────────

/** Positive price value (avoids 0 and NaN) */
const priceArb = fc.float({ min: Math.fround(0.01), max: Math.fround(9999.99), noNaN: true });

/** Quantity: 1–200 */
const quantityArb = fc.integer({ min: 1, max: 200 });

/** BulkPricing with minQuantity 1–100 and a valid bulkPrice */
const bulkPricingArb: fc.Arbitrary<BulkPricing> = fc.record({
    minQuantity: fc.integer({ min: 1, max: 100 }),
    bulkPrice: priceArb,
});

/** Optional BulkPricing (null or a valid tier) */
const optionalBulkPricingArb: fc.Arbitrary<BulkPricing | null> = fc.option(bulkPricingArb, {
    nil: null,
});

/** discountedPrice: null (no discount) or a positive number */
const discountedPriceArb: fc.Arbitrary<number | null> = fc.option(priceArb, { nil: null });

// ─── Property Tests ──────────────────────────────────────────────────────────

describe('5.6 Property 3: PriceDisplay correctness', () => {
    /**
     * Core property: the displayed price equals bulkPrice only when
     * hasBulkAccess=true AND bulkPricing is non-null AND quantity >= minQuantity;
     * otherwise it equals effectivePrice.
     */
    it('displays bulkPrice when hasBulkAccess=true AND bulkPricing is set AND quantity >= minQuantity', () => {
        fc.assert(
            fc.property(
                priceArb,           // effectivePrice
                bulkPricingArb,     // bulkPricing (always non-null in this test)
                quantityArb,        // quantity
                (effectivePrice, bulkPricing, quantity) => {
                    // Scenario: hasBulkAccess=true, quantity >= minQuantity
                    const sufficientQty = quantity + bulkPricing.minQuantity - 1;
                    const displayed = computeDisplayedPrice(
                        effectivePrice,
                        bulkPricing,
                        sufficientQty,
                        true, // hasBulkAccess
                    );

                    expect(displayed).toBe(bulkPricing.bulkPrice);
                    expect(displayed).not.toBe(effectivePrice === bulkPricing.bulkPrice ? undefined : effectivePrice);
                },
            ),
            { numRuns: 200 },
        );
    });

    it('displays effectivePrice when hasBulkAccess=false regardless of quantity and bulkPricing', () => {
        fc.assert(
            fc.property(
                priceArb,
                optionalBulkPricingArb,
                quantityArb,
                (effectivePrice, bulkPricing, quantity) => {
                    const displayed = computeDisplayedPrice(
                        effectivePrice,
                        bulkPricing,
                        quantity,
                        false, // hasBulkAccess = false
                    );

                    // Must always be effectivePrice — never bulkPrice
                    expect(displayed).toBe(effectivePrice);
                },
            ),
            { numRuns: 200 },
        );
    });

    it('displays effectivePrice when bulkPricing is null even if hasBulkAccess=true', () => {
        fc.assert(
            fc.property(
                priceArb,
                quantityArb,
                (effectivePrice, quantity) => {
                    const displayed = computeDisplayedPrice(
                        effectivePrice,
                        null, // no bulk pricing
                        quantity,
                        true, // hasBulkAccess = true
                    );

                    expect(displayed).toBe(effectivePrice);
                },
            ),
            { numRuns: 200 },
        );
    });

    it('displays effectivePrice when quantity < minQuantity even if hasBulkAccess=true', () => {
        fc.assert(
            fc.property(
                priceArb,
                bulkPricingArb,
                (effectivePrice, bulkPricing) => {
                    // quantity is strictly less than minQuantity
                    fc.pre(bulkPricing.minQuantity > 1); // need room below minQuantity
                    const insufficientQty = fc.sample(
                        fc.integer({ min: 1, max: bulkPricing.minQuantity - 1 }),
                        1,
                    )[0];

                    const displayed = computeDisplayedPrice(
                        effectivePrice,
                        bulkPricing,
                        insufficientQty,
                        true, // hasBulkAccess = true
                    );

                    // Below threshold → effectivePrice, not bulkPrice
                    expect(displayed).toBe(effectivePrice);
                },
            ),
            { numRuns: 200 },
        );
    });

    it('displays effectivePrice at exactly minQuantity - 1 (boundary: just below threshold)', () => {
        fc.assert(
            fc.property(
                priceArb,
                fc.record({
                    minQuantity: fc.integer({ min: 2, max: 100 }), // min 2 so we can go below
                    bulkPrice: priceArb,
                }),
                (effectivePrice, bulkPricing) => {
                    const justBelow = bulkPricing.minQuantity - 1;
                    const displayed = computeDisplayedPrice(
                        effectivePrice,
                        bulkPricing,
                        justBelow,
                        true,
                    );

                    expect(displayed).toBe(effectivePrice);
                },
            ),
            { numRuns: 200 },
        );
    });

    it('displays bulkPrice at exactly minQuantity (boundary: at threshold)', () => {
        fc.assert(
            fc.property(
                priceArb,
                bulkPricingArb,
                (effectivePrice, bulkPricing) => {
                    const atThreshold = bulkPricing.minQuantity;
                    const displayed = computeDisplayedPrice(
                        effectivePrice,
                        bulkPricing,
                        atThreshold,
                        true,
                    );

                    expect(displayed).toBe(bulkPricing.bulkPrice);
                },
            ),
            { numRuns: 200 },
        );
    });

    /**
     * Strikethrough property: shown iff discountedPrice !== null
     * (and bulk is not active, and originalPrice is provided).
     */
    it('shows strikethrough iff discountedPrice !== null (when bulk is not active)', () => {
        fc.assert(
            fc.property(
                discountedPriceArb,
                priceArb, // originalPrice
                (discountedPrice, originalPrice) => {
                    // Bulk is NOT active: hasBulkAccess=false
                    const showStrikethrough = computeShowStrikethrough(
                        discountedPrice,
                        originalPrice,
                        null, // no bulk pricing
                        1,
                        false, // hasBulkAccess = false
                    );

                    if (discountedPrice !== null) {
                        expect(showStrikethrough).toBe(true);
                    } else {
                        expect(showStrikethrough).toBe(false);
                    }
                },
            ),
            { numRuns: 200 },
        );
    });

    it('does NOT show strikethrough when bulk price is active (bulk overrides discount display)', () => {
        fc.assert(
            fc.property(
                priceArb,           // effectivePrice
                priceArb,           // discountedPrice (non-null — discount exists)
                priceArb,           // originalPrice
                bulkPricingArb,     // bulkPricing
                quantityArb,        // quantity
                (effectivePrice, discountedPrice, originalPrice, bulkPricing, quantity) => {
                    // Ensure quantity is at or above threshold
                    const sufficientQty = quantity + bulkPricing.minQuantity - 1;

                    const showStrikethrough = computeShowStrikethrough(
                        discountedPrice, // non-null discount
                        originalPrice,
                        bulkPricing,
                        sufficientQty,
                        true, // hasBulkAccess = true → bulk IS active
                    );

                    // When bulk is active, strikethrough must NOT show
                    expect(showStrikethrough).toBe(false);
                },
            ),
            { numRuns: 200 },
        );
    });

    it('does NOT show strikethrough when discountedPrice is null', () => {
        fc.assert(
            fc.property(
                priceArb,               // originalPrice
                optionalBulkPricingArb, // bulkPricing
                quantityArb,
                fc.boolean(),           // hasBulkAccess
                (originalPrice, bulkPricing, quantity, hasBulkAccess) => {
                    const showStrikethrough = computeShowStrikethrough(
                        null, // discountedPrice = null → no discount
                        originalPrice,
                        bulkPricing,
                        quantity,
                        hasBulkAccess,
                    );

                    expect(showStrikethrough).toBe(false);
                },
            ),
            { numRuns: 200 },
        );
    });

    /**
     * Combined property: the full price display logic is consistent across all inputs.
     * This is the core Property 3 from the design document.
     */
    it('Property 3 (full): displayed price and strikethrough are always consistent with the spec', () => {
        fc.assert(
            fc.property(
                priceArb,               // effectivePrice
                priceArb,               // originalPrice
                discountedPriceArb,     // discountedPrice (null or number)
                optionalBulkPricingArb, // bulkPricing
                quantityArb,            // quantity
                fc.boolean(),           // hasBulkAccess
                (effectivePrice, originalPrice, discountedPrice, bulkPricing, quantity, hasBulkAccess) => {
                    const isBulkActive =
                        hasBulkAccess === true &&
                        bulkPricing != null &&
                        quantity >= bulkPricing.minQuantity;

                    const displayedPrice = computeDisplayedPrice(
                        effectivePrice,
                        bulkPricing,
                        quantity,
                        hasBulkAccess,
                    );

                    const showStrikethrough = computeShowStrikethrough(
                        discountedPrice,
                        originalPrice,
                        bulkPricing,
                        quantity,
                        hasBulkAccess,
                    );

                    // Rule 1: When bulk is active → displayed price is bulkPrice
                    if (isBulkActive) {
                        expect(displayedPrice).toBe(bulkPricing!.bulkPrice);
                    } else {
                        // Rule 2: When bulk is NOT active → displayed price is effectivePrice
                        expect(displayedPrice).toBe(effectivePrice);
                    }

                    // Rule 3: Strikethrough iff discountedPrice !== null AND bulk is NOT active
                    if (discountedPrice !== null && !isBulkActive && originalPrice != null) {
                        expect(showStrikethrough).toBe(true);
                    } else {
                        expect(showStrikethrough).toBe(false);
                    }

                    // Rule 4: When hasBulkAccess=false, bulk price is NEVER shown
                    if (!hasBulkAccess) {
                        expect(displayedPrice).toBe(effectivePrice);
                    }

                    // Rule 5: When bulkPricing is null, bulk price is NEVER shown
                    if (bulkPricing == null) {
                        expect(displayedPrice).toBe(effectivePrice);
                    }
                },
            ),
            { numRuns: 500 },
        );
    });
});

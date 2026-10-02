/**
 * Location Data Utility — thin wrapper around country-state-city.
 *
 * Provides country and city data for address forms.
 * Only imports the specific methods needed to keep bundle size minimal.
 *
 * Usage:
 *   import { getCountryOptions, getCityOptions } from '@/lib/utils/location-data';
 *
 *   const countries = getCountryOptions();        // all countries
 *   const cities = getCityOptions('GB');          // cities in UK
 *   const ukCities = getCityOptions('GB');        // cities in Great Britain
 */

import { City, Country } from 'country-state-city';

export interface LocationOption {
    label: string;
    value: string;
}

/**
 * Get all countries as select options.
 * Returns { label: "United Kingdom", value: "GB" }
 */
export function getCountryOptions(): LocationOption[] {
    return Country.getAllCountries().map((c) => ({
        label: c.name,
        value: c.isoCode,
    }));
}

/**
 * Get a single country by ISO code.
 */
export function getCountryByCode(isoCode: string) {
    return Country.getCountryByCode(isoCode);
}

/**
 * Get cities for a given country ISO code as select options.
 * Returns { label: "London", value: "London" }
 *
 * Note: Uses city name as value (not an ID) since addresses store city as a string.
 */
export function getCityOptions(countryCode: string): LocationOption[] {
    if (!countryCode) return [];
    const cities = City.getCitiesOfCountry(countryCode);
    if (!cities) return [];

    // Deduplicate by name (some countries have duplicate city entries)
    const seen = new Set<string>();
    return cities
        .filter((c) => {
            if (seen.has(c.name)) return false;
            seen.add(c.name);
            return true;
        })
        .map((c) => ({
            label: c.name,
            value: c.name,
        }))
        .sort((a, b) => a.label.localeCompare(b.label));
}

/**
 * Get country name from ISO code.
 * e.g. "GB" → "United Kingdom"
 */
export function getCountryName(isoCode: string): string {
    const country = Country.getCountryByCode(isoCode);
    return country?.name ?? isoCode;
}

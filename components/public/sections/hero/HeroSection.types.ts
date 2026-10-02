/**
 * HeroSection types
 *
 * All variants of HeroSection must satisfy this interface.
 * Requirements: 3.2, 3.3, 3.7, 3.8
 */

export interface HeroSectionProps {
    /**
     * Optional override for the section heading shown when no banners are available.
     * Defaults to the i18n key public.home.heroTitle.
     */
    title?: string;
    /**
     * Optional override for the section subtitle shown when no banners are available.
     * Defaults to the i18n key public.home.heroSubtitle.
     */
    subtitle?: string;
}

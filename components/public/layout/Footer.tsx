'use client';

/**
 * Footer — public storefront footer.
 *
 * Sections: company info | navigation link groups | social icons | legal links.
 * Uses dynamic config data for business info and social links.
 * Responsive: multi-column on desktop → single column on mobile.
 *
 * Requirements: 2.7
 */

import { Separator } from '@/components/ui/separator';
import { useConfig } from '@/hooks/use-config';
import {
    Facebook,
    Instagram,
    Leaf,
    Linkedin,
    Mail,
    MapPin,
    Phone,
    Twitter,
    Youtube,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';

// ─── Types ────────────────────────────────────────────────────────────────────

interface FooterLink {
    href: string;
    labelKey: string;
}

interface FooterLinkGroup {
    titleKey: string;
    links: FooterLink[];
}

// ─── Static data ──────────────────────────────────────────────────────────────

const LINK_GROUPS: FooterLinkGroup[] = [
    {
        titleKey: 'shopTitle',
        links: [
            { href: '/products', labelKey: 'products' },
            { href: '/order-lookup', labelKey: 'orderLookup' },
        ],
    },
    {
        titleKey: 'accountTitle',
        links: [
            { href: '/account', labelKey: 'myAccount' },
            { href: '/orders', labelKey: 'myOrders' },
            { href: '/account/wishlist', labelKey: 'wishlist' },
            { href: '/account/support', labelKey: 'support' },
        ],
    },
    {
        titleKey: 'companyTitle',
        links: [
            { href: '/about', labelKey: 'aboutUs' },
            { href: '/contact', labelKey: 'contactUs' },
            { href: '/terms', labelKey: 'terms' },
            { href: '/privacy', labelKey: 'privacy' },
            { href: '/returns', labelKey: 'returns' },
        ],
    },
];

// ─── Component ────────────────────────────────────────────────────────────────

export function Footer() {
    const tNav = useTranslations('public.nav');
    const tFooter = useTranslations('public.nav.footer');
    const { businessName, businessPhone, businessEmail, businessAddress, businessCity, businessPostcode, businessHours, socialLinks } = useConfig();

    // Build social links from config — only show those that are configured
    const socialItems = [
        { href: socialLinks.facebook, Icon: Facebook, label: 'Facebook' },
        { href: socialLinks.twitter, Icon: Twitter, label: 'Twitter' },
        { href: socialLinks.linkedin, Icon: Linkedin, label: 'LinkedIn' },
        { href: socialLinks.instagram, Icon: Instagram, label: 'Instagram' },
        { href: socialLinks.youtube, Icon: Youtube, label: 'YouTube' },
    ].filter((item) => !!item.href);

    return (
        <footer className="border-t border-border mt-auto">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
                {/* Main grid: company info + 3 link groups */}
                <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-5">

                    {/* Company info — spans 2 cols on lg */}
                    <div className="sm:col-span-2 lg:col-span-2">
                        <Link
                            href="/"
                            className="inline-flex items-center gap-1.5 font-bold text-xl tracking-tight text-foreground mb-3"
                            aria-label={`${businessName || 'OttimoDirect'} — Home`}
                        >
                            <Leaf className="size-5 text-primary" aria-hidden="true" />
                            <span className="text-primary">Ottimo</span>
                            <span>Direct</span>
                        </Link>
                        <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mb-4">
                            {tFooter('tagline')}
                        </p>

                        {/* Dynamic business contact info */}
                        <div className="flex flex-col gap-2 text-sm text-muted-foreground">
                            {businessPhone && (
                                <a href={`tel:${businessPhone}`} className="inline-flex items-center gap-2 hover:text-foreground transition-colors">
                                    <Phone className="size-3.5 shrink-0" aria-hidden="true" />
                                    {businessPhone}
                                </a>
                            )}
                            {businessEmail && (
                                <a href={`mailto:${businessEmail}`} className="inline-flex items-center gap-2 hover:text-foreground transition-colors">
                                    <Mail className="size-3.5 shrink-0" aria-hidden="true" />
                                    {businessEmail}
                                </a>
                            )}
                            {businessAddress && (
                                <span className="inline-flex items-start gap-2">
                                    <MapPin className="size-3.5 shrink-0 mt-0.5" aria-hidden="true" />
                                    <span>{businessAddress}{businessCity ? `, ${businessCity}` : ''}{businessPostcode ? ` ${businessPostcode}` : ''}</span>
                                </span>
                            )}
                            {businessHours && (
                                <span className="text-xs text-muted-foreground/80 mt-1">{businessHours}</span>
                            )}
                        </div>

                        {/* Social icons — from config */}
                        {socialItems.length > 0 && (
                            <div className="flex items-center gap-3 mt-5">
                                {socialItems.map(({ href, Icon, label }) => (
                                    <a
                                        key={label}
                                        href={href}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        aria-label={label}
                                        className="flex size-9 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                                    >
                                        <Icon className="size-4" aria-hidden="true" />
                                    </a>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Navigation link groups */}
                    {LINK_GROUPS.map((group) => (
                        <div key={group.titleKey}>
                            <h3 className="text-sm font-semibold text-foreground mb-3 uppercase tracking-wider">
                                {tFooter(group.titleKey as Parameters<typeof tFooter>[0])}
                            </h3>
                            <ul className="flex flex-col gap-2">
                                {group.links.map(({ href, labelKey }) => (
                                    <li key={href}>
                                        <Link
                                            href={href}
                                            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                                        >
                                            {tFooter(labelKey as Parameters<typeof tFooter>[0])}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>

                <Separator className="my-8" />

                {/* Bottom bar */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
                    <p>
                        © {new Date().getFullYear()} {businessName || 'OttimoDirect'}. {tFooter('allRightsReserved')}
                    </p>
                    <div className="flex items-center gap-4">
                        <Link href="/privacy" className="hover:text-foreground transition-colors">
                            {tFooter('privacyPolicy')}
                        </Link>
                        <Link href="/terms" className="hover:text-foreground transition-colors">
                            {tFooter('termsOfService')}
                        </Link>
                        <Link href="/returns" className="hover:text-foreground transition-colors">
                            {tFooter('returns')}
                        </Link>
                    </div>
                </div>
            </div>
        </footer>
    );
}

export default Footer;

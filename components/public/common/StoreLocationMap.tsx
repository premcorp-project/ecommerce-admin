'use client';

/**
 * StoreLocationMap — interactive map showing store location with optional route.
 *
 * Features:
 * - Shows store marker with theme-coloured pin
 * - "Get Directions" button: gets user's location, draws route on map
 * - Uses OpenRouteService for routing (free 2,000 req/day)
 * - Graceful fallback: if routing fails, offers "Open in Google Maps" link
 * - If geolocation denied or unavailable, shows Google Maps link directly
 * - Adapts to light/dark mode
 * - No hardcoded colours — uses CSS variables
 */

import { useTranslations } from 'next-intl';
import { useTheme } from 'next-themes';
import { useCallback, useEffect, useRef, useState } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface StoreLocationMapProps {
    latitude: number;
    longitude: number;
    zoom?: number;
    height?: string;
    className?: string;
    storeName?: string;
    storeAddress?: string;
}

interface RouteState {
    status: 'idle' | 'locating' | 'routing' | 'done' | 'error';
    distance?: string; // e.g. "5.2 km"
    duration?: string; // e.g. "12 min"
    userCoords?: [number, number]; // [lng, lat]
}

// ─── Constants ────────────────────────────────────────────────────────────────

const LIGHT_STYLE = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';
const DARK_STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';
const ORS_API_KEY = process.env.NEXT_PUBLIC_ORS_API_KEY || '';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getCSSColor(varName: string, fallback: string): string {
    if (typeof window === 'undefined') return fallback;
    const value = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
    if (!value) return fallback;

    // MapLibre doesn't support oklch/lab — convert to hex via canvas
    try {
        const canvas = document.createElement('canvas');
        canvas.width = 1;
        canvas.height = 1;
        const ctx = canvas.getContext('2d');
        if (!ctx) return fallback;
        ctx.fillStyle = value;
        ctx.fillRect(0, 0, 1, 1);
        const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    } catch {
        return fallback;
    }
}

function getGoogleMapsUrl(storeLat: number, storeLng: number, userCoords?: [number, number]) {
    if (userCoords) {
        return `https://www.google.com/maps/dir/${userCoords[1]},${userCoords[0]}/${storeLat},${storeLng}`;
    }
    return `https://www.google.com/maps/search/?api=1&query=${storeLat},${storeLng}`;
}

async function fetchRoute(
    from: [number, number],
    to: [number, number],
): Promise<{ coordinates: [number, number][]; distance: number; duration: number } | null> {
    if (!ORS_API_KEY) return null;

    try {
        const res = await fetch(
            `https://api.openrouteservice.org/v2/directions/driving-car?start=${from[0]},${from[1]}&end=${to[0]},${to[1]}`,
            {
                headers: { Authorization: ORS_API_KEY },
                signal: AbortSignal.timeout(8000),
            },
        );

        if (!res.ok) return null;

        const data = await res.json();
        const feature = data.features?.[0];
        if (!feature) return null;

        const coords = feature.geometry.coordinates as [number, number][];
        const summary = feature.properties.summary;

        return {
            coordinates: coords,
            distance: summary.distance, // meters
            duration: summary.duration, // seconds
        };
    } catch {
        return null;
    }
}

function formatDistance(meters: number): string {
    if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`;
    return `${Math.round(meters)} m`;
}

function formatDuration(seconds: number): string {
    const mins = Math.round(seconds / 60);
    if (mins >= 60) {
        const hrs = Math.floor(mins / 60);
        const remainMins = mins % 60;
        return `${hrs}h ${remainMins}min`;
    }
    return `${mins} min`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function StoreLocationMap({
    latitude,
    longitude,
    zoom = 15,
    height = '400px',
    className = '',
    storeName,
    storeAddress,
}: StoreLocationMapProps) {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<maplibregl.Map | null>(null);
    const routeLayerAdded = useRef(false);
    const { resolvedTheme } = useTheme();
    const t = useTranslations('public.common');
    const [mounted, setMounted] = useState(false);
    const [route, setRoute] = useState<RouteState>({ status: 'idle' });

    useEffect(() => { setMounted(true); }, []);

    // Initialize map
    useEffect(() => {
        if (!mounted || !mapContainerRef.current) return;

        const initMap = async () => {
            const maplibregl = (await import('maplibre-gl')).default;
            await import('maplibre-gl/dist/maplibre-gl.css');

            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }

            routeLayerAdded.current = false;
            const isDark = resolvedTheme === 'dark';
            const style = isDark ? DARK_STYLE : LIGHT_STYLE;
            const primaryColor = getCSSColor('--primary', '#2563eb');

            const map = new maplibregl.Map({
                container: mapContainerRef.current!,
                style,
                center: [longitude, latitude],
                zoom,
                attributionControl: false,
            });

            // Store marker
            const marker = new maplibregl.Marker({ color: primaryColor })
                .setLngLat([longitude, latitude])
                .addTo(map);

            if (storeName || storeAddress) {
                const popupHtml = `
                    <div style="padding: 4px 0; font-family: inherit;">
                        ${storeName ? `<strong style="font-size: 14px; color: var(--foreground);">${storeName}</strong>` : ''}
                        ${storeAddress ? `<p style="font-size: 12px; margin: 4px 0 0; color: var(--muted-foreground);">${storeAddress}</p>` : ''}
                    </div>
                `;
                marker.setPopup(new maplibregl.Popup({ offset: 25 }).setHTML(popupHtml));
            }

            map.addControl(new maplibregl.NavigationControl(), 'top-right');
            mapRef.current = map;
        };

        initMap();

        return () => {
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }
        };
    }, [mounted, latitude, longitude, zoom, resolvedTheme, storeName, storeAddress]);

    // Get directions handler
    const handleGetDirections = useCallback(async () => {
        if (!mapRef.current) return;

        setRoute({ status: 'locating' });

        // Get user location
        let userCoords: [number, number];
        try {
            const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                    enableHighAccuracy: true,
                    timeout: 10000,
                });
            });
            userCoords = [pos.coords.longitude, pos.coords.latitude];
        } catch {
            // Geolocation denied/unavailable — fallback to Google Maps
            setRoute({ status: 'error' });
            return;
        }

        setRoute({ status: 'routing', userCoords });

        // Add user marker
        const maplibregl = (await import('maplibre-gl')).default;
        new maplibregl.Marker({ color: '#10b981' })
            .setLngLat(userCoords)
            .addTo(mapRef.current);

        // Try to fetch route
        const storeCoords: [number, number] = [longitude, latitude];
        const routeData = await fetchRoute(userCoords, storeCoords);

        if (routeData && mapRef.current) {
            const map = mapRef.current;

            // Wait for map style to be loaded
            if (!map.isStyleLoaded()) {
                await new Promise<void>((resolve) => map.once('styledata', () => resolve()));
            }

            // Add route line
            if (!routeLayerAdded.current) {
                map.addSource('route', {
                    type: 'geojson',
                    data: {
                        type: 'Feature',
                        properties: {},
                        geometry: {
                            type: 'LineString',
                            coordinates: routeData.coordinates,
                        },
                    },
                });

                const primaryColor = getCSSColor('--primary', '#2563eb');
                map.addLayer({
                    id: 'route-line',
                    type: 'line',
                    source: 'route',
                    layout: { 'line-join': 'round', 'line-cap': 'round' },
                    paint: { 'line-color': primaryColor, 'line-width': 4, 'line-opacity': 0.8 },
                });

                routeLayerAdded.current = true;
            }

            // Fit bounds to show both markers + route
            const bounds = new maplibregl.LngLatBounds();
            bounds.extend(userCoords);
            bounds.extend(storeCoords);
            routeData.coordinates.forEach((c) => bounds.extend(c));
            map.fitBounds(bounds, { padding: 60, maxZoom: 14 });

            setRoute({
                status: 'done',
                userCoords,
                distance: formatDistance(routeData.distance),
                duration: formatDuration(routeData.duration),
            });
        } else {
            // Route API failed — fit bounds to show both markers, offer Google Maps
            const bounds = new maplibregl.LngLatBounds();
            bounds.extend(userCoords);
            bounds.extend(storeCoords);
            mapRef.current.fitBounds(bounds, { padding: 60, maxZoom: 14 });

            setRoute({ status: 'error', userCoords });
        }
    }, [latitude, longitude]);

    // ─── Render ───────────────────────────────────────────────────────────────

    if (!mounted) {
        return (
            <div
                className={`rounded-xl bg-muted animate-pulse ${className}`}
                style={{ height }}
                aria-label="Loading map"
            />
        );
    }

    return (
        <div className={`flex flex-col gap-3 ${className}`}>
            {/* Map */}
            <div className="relative group">
                <div className="absolute -inset-1 rounded-2xl bg-primary/10 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" aria-hidden="true" />
                <div
                    ref={mapContainerRef}
                    className="relative rounded-xl overflow-hidden border border-border shadow-sm"
                    style={{ height, width: '100%' }}
                    aria-label={storeName ? `Map showing ${storeName} location` : 'Store location map'}
                />
            </div>

            {/* Controls bar */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
                {/* Route info */}
                {route.status === 'done' && route.distance && route.duration && (
                    <div className="flex items-center gap-3 text-sm">
                        <span className="flex items-center gap-1.5 text-foreground font-medium">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-4 text-primary"><path fillRule="evenodd" d="M9.69 18.933l.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 00.281-.14c.186-.096.446-.24.757-.433.62-.384 1.445-.966 2.274-1.765C15.302 14.988 17 12.493 17 9A7 7 0 103 9c0 3.492 1.698 5.988 3.355 7.584a13.731 13.731 0 002.274 1.765 11.307 11.307 0 00.757.433c.113.058.2.1.281.14l.018.008.006.003zM10 11.25a2.25 2.25 0 100-4.5 2.25 2.25 0 000 4.5z" clipRule="evenodd" /></svg>
                            {route.distance}
                        </span>
                        <span className="text-muted-foreground">•</span>
                        <span className="flex items-center gap-1.5 text-foreground font-medium">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-4 text-primary"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-13a.75.75 0 00-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 000-1.5h-3.25V5z" clipRule="evenodd" /></svg>
                            {route.duration}
                        </span>
                    </div>
                )}

                {route.status === 'locating' && (
                    <p className="text-sm text-muted-foreground animate-pulse">{t('mapLocating')}</p>
                )}
                {route.status === 'routing' && (
                    <p className="text-sm text-muted-foreground animate-pulse">{t('mapRouting')}</p>
                )}

                {/* Buttons */}
                <div className="flex items-center gap-2 ml-auto">
                    {/* Get Directions — only when idle or error */}
                    {(route.status === 'idle' || route.status === 'error') && (
                        <button
                            type="button"
                            onClick={handleGetDirections}
                            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-4"><path fillRule="evenodd" d="M8.157 2.176a1.5 1.5 0 00-1.147 0l-4.084 1.69A1.5 1.5 0 002 5.25v10.877a1.5 1.5 0 002.074 1.386l3.51-1.452 4.26 1.762a1.5 1.5 0 001.147 0l4.084-1.69A1.5 1.5 0 0018 14.75V3.872a1.5 1.5 0 00-2.073-1.386l-3.51 1.452-4.26-1.762zM7.58 5a.75.75 0 01.75.75v6.5a.75.75 0 01-1.5 0v-6.5A.75.75 0 017.58 5zm5.59 2.75a.75.75 0 00-1.5 0v6.5a.75.75 0 001.5 0v-6.5z" clipRule="evenodd" /></svg>
                            {t('mapGetDirections')}
                        </button>
                    )}

                    {/* Google Maps fallback — always available after error or as secondary */}
                    {(route.status === 'error' || route.status === 'done') && (
                        <a
                            href={getGoogleMapsUrl(latitude, longitude, route.userCoords)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-4"><path fillRule="evenodd" d="M4.25 5.5a.75.75 0 00-.75.75v8.5c0 .414.336.75.75.75h8.5a.75.75 0 00.75-.75v-4a.75.75 0 011.5 0v4A2.25 2.25 0 0112.75 17h-8.5A2.25 2.25 0 012 14.75v-8.5A2.25 2.25 0 014.25 4h5a.75.75 0 010 1.5h-5zm7.5-3.25a.75.75 0 000 1.5h2.19l-4.72 4.72a.75.75 0 001.06 1.06l4.72-4.72v2.19a.75.75 0 001.5 0v-4.5a.75.75 0 00-.75-.75h-4.5z" clipRule="evenodd" /></svg>
                            {t('mapOpenGoogleMaps')}
                        </a>
                    )}
                </div>
            </div>
        </div>
    );
}

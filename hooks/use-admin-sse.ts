'use client';

/**
 * useAdminSSE — real-time SSE notification handler for admin/staff users.
 *
 * Uses a manual fetch-based SSE reader (ReadableStream) instead of EventSourcePolyfill.
 * This eliminates all unhandled promise rejections because we fully control the fetch lifecycle.
 *
 * - Connects to GET /notifications/stream with Bearer token
 * - Only connects when admin auth store has a valid token and page is visible
 * - Disconnects when page is hidden (laptop sleep, tab switch)
 * - Reconnects when page becomes visible again
 * - Handles admin-relevant events and shows toast notifications
 * - Invalidates relevant react-query caches so lists auto-update
 * - Retries silently on failure (30s delay)
 */

import { useAdminAuthStore } from '@/lib/stores/admin-auth-store';
import { useNotificationSoundStore } from '@/lib/stores/notification-sound-store';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useEffect, useRef } from 'react';
import toast from 'react-hot-toast';

// ─── Types ────────────────────────────────────────────────────────────────────

interface OrderConfirmedPayload {
    email: string;
    name: string;
    order: {
        orderId?: string;
        orderNumber?: string;
        total?: number;
        currency?: string;
        paymentMethod?: string;
        deliveryMethod?: string;
        status?: string;
        [key: string]: unknown;
    };
}

interface OrderCancelledPayload {
    orderId: string;
    userId: string;
}

interface OrderStatusPayload {
    email: string;
    name: string;
    orderId: string;
    estimatedDelivery?: string;
}

interface TicketCreatedPayload {
    ticketId: string;
    subject: string;
    userId: string;
}

interface TicketMessagePayload {
    ticketId: string;
    subject: string;
    senderId: string;
}

interface ContactMessagePayload {
    contactId: string;
    name: string;
    subject: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const RECONNECT_DELAY_MS = 30000; // 30s between retries
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';
const SSE_URL = `${API_BASE_URL}/notifications/stream`;
const NOTIFICATION_SOUND_URL = '/sounds/notification.wav';

// Events that play a sound (customer/visitor-initiated — not admin actions)
const SOUND_EVENTS = new Set([
    'order_confirmed',
    'order_cancelled',
    'ticket_created',
    'ticket_message',
    'contact_message',
]);

/**
 * Play notification sound. Fails silently if browser blocks autoplay.
 */
function playNotificationSound() {
    if (!useNotificationSoundStore.getState().enabled) return;
    try {
        const audio = new Audio(NOTIFICATION_SOUND_URL);
        audio.volume = 0.5;
        audio.play().catch(() => {
            // Browser blocked autoplay — ignore silently
        });
    } catch {
        // Audio not supported — ignore
    }
}

// ─── SSE Line Parser ──────────────────────────────────────────────────────────

interface SSEEvent {
    event: string;
    data: string;
}

/**
 * Parses raw SSE text chunks into structured events.
 * Handles multi-line data fields and event type fields.
 */
class SSEParser {
    private buffer = '';
    private currentEvent = '';
    private currentData = '';

    parse(chunk: string): SSEEvent[] {
        this.buffer += chunk;
        const events: SSEEvent[] = [];

        const lines = this.buffer.split('\n');
        // Keep the last incomplete line in the buffer
        this.buffer = lines.pop() ?? '';

        for (const line of lines) {
            if (line === '') {
                // Empty line = end of event
                if (this.currentData) {
                    events.push({
                        event: this.currentEvent || 'message',
                        data: this.currentData.trim(),
                    });
                }
                this.currentEvent = '';
                this.currentData = '';
            } else if (line.startsWith('event:')) {
                this.currentEvent = line.slice(6).trim();
            } else if (line.startsWith('data:')) {
                this.currentData += (this.currentData ? '\n' : '') + line.slice(5).trim();
            } else if (line.startsWith(':')) {
                // Comment / heartbeat — ignore
            }
        }

        return events;
    }

    reset() {
        this.buffer = '';
        this.currentEvent = '';
        this.currentData = '';
    }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAdminSSE() {
    const token = useAdminAuthStore((s) => s.token);
    const queryClient = useQueryClient();
    const t = useTranslations('admin.sse');

    const abortRef = useRef<AbortController | null>(null);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const mountedRef = useRef(true);
    const connectingRef = useRef(false);

    useEffect(() => {
        mountedRef.current = true;

        if (!token) {
            cleanup();
            return;
        }

        // Only connect if page is visible
        if (!document.hidden) {
            attemptConnect();
        }

        function handleVisibilityChange() {
            if (document.hidden) {
                cleanup();
            } else if (useAdminAuthStore.getState().token) {
                attemptConnect();
            }
        }

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            mountedRef.current = false;
            cleanup();
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token]);

    function cleanup() {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
        if (abortRef.current) {
            abortRef.current.abort();
            abortRef.current = null;
        }
    }

    function scheduleReconnect() {
        if (timerRef.current || !mountedRef.current) return;
        timerRef.current = setTimeout(() => {
            timerRef.current = null;
            if (mountedRef.current && !document.hidden && useAdminAuthStore.getState().token) {
                attemptConnect();
            }
        }, RECONNECT_DELAY_MS);
    }

    async function attemptConnect() {
        if (connectingRef.current) return; // prevent double connections
        connectingRef.current = true;

        const currentToken = useAdminAuthStore.getState().token;
        if (!currentToken || !mountedRef.current || document.hidden) {
            connectingRef.current = false;
            return;
        }

        // Create a fresh abort controller for this connection
        const controller = new AbortController();
        abortRef.current = controller;

        try {
            if (process.env.NODE_ENV === 'development') {
                console.log('[AdminSSE] Connecting to', SSE_URL);
            }

            const response = await fetch(SSE_URL, {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${currentToken}`,
                    Accept: 'text/event-stream',
                },
                signal: controller.signal,
            });

            if (!response.ok) {
                if (process.env.NODE_ENV === 'development') {
                    console.warn('[AdminSSE] HTTP', response.status, '— will retry');
                }
                connectingRef.current = false;
                if (response.status === 401) {
                    return;
                }
                scheduleReconnect();
                return;
            }

            if (!response.body) {
                connectingRef.current = false;
                scheduleReconnect();
                return;
            }

            if (process.env.NODE_ENV === 'development') {
                console.log('[AdminSSE] Connected successfully, reading stream...');
            }

            // Successfully connected — read the stream
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            const parser = new SSEParser();

            connectingRef.current = false;

            // Read loop
            while (true) {
                const { done, value } = await reader.read();

                if (done) {
                    // Server closed the connection — reconnect
                    scheduleReconnect();
                    return;
                }

                const text = decoder.decode(value, { stream: true });
                const events = parser.parse(text);

                for (const event of events) {
                    handleSSEEvent(event);
                }
            }
        } catch (err: unknown) {
            connectingRef.current = false;

            // AbortError = we intentionally closed (cleanup, visibility change) — don't retry
            if (err instanceof DOMException && err.name === 'AbortError') {
                if (process.env.NODE_ENV === 'development') {
                    console.log('[AdminSSE] Connection aborted (cleanup)');
                }
                return;
            }

            // Network error (sleep, disconnect, etc.) — retry silently
            if (process.env.NODE_ENV === 'development') {
                console.warn('[AdminSSE] Connection error, will retry in 30s:', (err as Error)?.message);
            }
            if (mountedRef.current && !document.hidden) {
                scheduleReconnect();
            }
        }
    }

    function handleSSEEvent(event: SSEEvent) {
        let data: unknown;
        try {
            data = JSON.parse(event.data);
        } catch {
            return; // Malformed JSON — skip
        }

        if (process.env.NODE_ENV === 'development') {
            console.log('[AdminSSE] Event received:', event.event, data);
        }

        // Play sound for customer/visitor-initiated events
        if (SOUND_EVENTS.has(event.event)) {
            playNotificationSound();
        }

        switch (event.event) {
            case 'order_confirmed': {
                const d = data as OrderConfirmedPayload;
                const orderId = d.order?.orderId || d.order?.orderNumber || '';
                toast.success(t('orderConfirmed', { orderNumber: orderId }), { duration: 6000 });
                queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] });
                queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
                break;
            }
            case 'order_cancelled': {
                const d = data as OrderCancelledPayload;
                toast(t('orderCancelled', { orderNumber: d.orderId }), { duration: 5000, icon: '❌' });
                queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] });
                queryClient.invalidateQueries({ queryKey: ['admin', 'order-detail', d.orderId] });
                break;
            }
            case 'order_shipped': {
                const d = data as OrderStatusPayload;
                toast(t('orderShipped', { orderNumber: d.orderId }), { duration: 5000 });
                queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] });
                queryClient.invalidateQueries({ queryKey: ['admin', 'order-detail', d.orderId] });
                break;
            }
            case 'order_delivered': {
                const d = data as OrderStatusPayload;
                toast.success(t('orderDelivered', { orderNumber: d.orderId }), { duration: 5000 });
                queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] });
                queryClient.invalidateQueries({ queryKey: ['admin', 'order-detail', d.orderId] });
                break;
            }
            case 'order_ready_for_pickup': {
                const d = data as OrderStatusPayload;
                toast(t('orderReadyForPickup', { orderNumber: d.orderId }), { duration: 5000 });
                queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] });
                queryClient.invalidateQueries({ queryKey: ['admin', 'order-detail', d.orderId] });
                break;
            }
            case 'order_picked_up': {
                const d = data as OrderStatusPayload;
                toast.success(t('orderPickedUp', { orderNumber: d.orderId }), { duration: 5000 });
                queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] });
                queryClient.invalidateQueries({ queryKey: ['admin', 'order-detail', d.orderId] });
                break;
            }
            case 'ticket_created': {
                const d = data as TicketCreatedPayload;
                toast(t('ticketCreated', { subject: d.subject }), { duration: 5000 });
                queryClient.invalidateQueries({ queryKey: ['admin', 'support'] });
                break;
            }
            case 'ticket_message': {
                const d = data as TicketMessagePayload;
                toast(t('ticketMessage', { subject: d.subject }), { duration: 5000 });
                queryClient.invalidateQueries({ queryKey: ['admin', 'support'] });
                break;
            }
            case 'contact_message': {
                const d = data as ContactMessagePayload;
                toast(t('contactMessage', { name: d.name, subject: d.subject }), { duration: 5000 });
                queryClient.invalidateQueries({ queryKey: ['admin', 'contact'] });
                break;
            }
            default:
                break;
        }
    }
}

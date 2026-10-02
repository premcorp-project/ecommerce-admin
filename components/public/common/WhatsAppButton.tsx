'use client';

/**
 * WhatsAppButton — floating WhatsApp chat widget (bottom-right corner).
 *
 * Click the FAB → opens a chat box with greeting + text input.
 * User types a message → clicks send → opens WhatsApp with that message.
 * Reads phone number from useConfig(). Only renders when businessPhone is set.
 * Uses semantic tokens — no hardcoded colours except WhatsApp brand green.
 */

import { useConfig } from '@/hooks/use-config';
import { X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';

// WhatsApp brand colour — acceptable brand identity exception
const WHATSAPP_GREEN = '#25D366';
const WHATSAPP_DARK = '#128C7E';

export function WhatsAppButton() {
    const { businessPhone, businessName } = useConfig();
    const t = useTranslations('public.common');
    const [open, setOpen] = useState(false);
    const [message, setMessage] = useState('');
    const inputRef = useRef<HTMLTextAreaElement>(null);

    // Focus input when chat opens
    useEffect(() => {
        if (open && inputRef.current) {
            setTimeout(() => inputRef.current?.focus(), 200);
        }
    }, [open]);

    if (!businessPhone) return null;

    const cleanPhone = businessPhone.replace(/[\s\-()]/g, '');

    const handleSend = () => {
        const text = message.trim() || t('whatsappMessage');
        const url = `https://wa.me/${cleanPhone.replace('+', '')}?text=${encodeURIComponent(text)}`;
        window.open(url, '_blank', 'noopener,noreferrer');
        setMessage('');
        setOpen(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <>
            {/* Chat box */}
            {open && (
                <div className="fixed bottom-24 right-6 z-50 w-[340px] max-w-[calc(100vw-3rem)] rounded-2xl border border-border bg-card shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 fade-in duration-200">
                    {/* Header */}
                    <div
                        className="flex items-center gap-3 px-4 py-3"
                        style={{ backgroundColor: WHATSAPP_DARK }}
                    >
                        <div className="flex size-10 items-center justify-center rounded-full bg-white/20">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" className="size-5" aria-hidden="true">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                            </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-white truncate">
                                {businessName || 'OttimoDirect'}
                            </p>
                            <p className="text-xs text-white/70">{t('whatsappOnline')}</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setOpen(false)}
                            className="flex size-8 items-center justify-center rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-colors"
                            aria-label={t('whatsappClose')}
                        >
                            <X className="size-4" />
                        </button>
                    </div>

                    {/* Chat body */}
                    <div className="px-4 py-5 bg-muted/30 min-h-[100px]">
                        {/* Greeting bubble */}
                        <div className="bg-card border border-border rounded-lg rounded-tl-none px-3 py-2 max-w-[85%] shadow-sm">
                            <p className="text-sm text-foreground">{t('whatsappGreeting', { name: businessName || 'OttimoDirect' })}</p>
                            <p className="text-[10px] text-muted-foreground mt-1 text-right">
                                {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                        </div>
                    </div>

                    {/* Input area */}
                    <div className="flex items-end gap-2 px-3 py-3 border-t border-border bg-card">
                        <textarea
                            ref={inputRef}
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder={t('whatsappPlaceholder')}
                            rows={1}
                            className="flex-1 resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring max-h-20"
                        />
                        <button
                            type="button"
                            onClick={handleSend}
                            className="flex size-9 shrink-0 items-center justify-center rounded-full transition-colors"
                            style={{ backgroundColor: WHATSAPP_GREEN }}
                            aria-label={t('whatsappSend')}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" className="size-4" aria-hidden="true">
                                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                            </svg>
                        </button>
                    </div>
                </div>
            )}

            {/* Floating Action Button */}
            <button
                type="button"
                onClick={() => setOpen(!open)}
                aria-label={t('whatsappAriaLabel')}
                className="fixed bottom-6 right-6 z-50 flex items-center justify-center size-14 rounded-full shadow-lg transition-all duration-200 hover:scale-110 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                style={{ backgroundColor: WHATSAPP_GREEN }}
            >
                {open ? (
                    <X className="size-6 text-white" />
                ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" className="size-7" aria-hidden="true">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                    </svg>
                )}
            </button>
        </>
    );
}

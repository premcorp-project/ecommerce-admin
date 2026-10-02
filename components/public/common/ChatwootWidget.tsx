'use client';

import { useEffect } from 'react';

/**
 * Chatwoot live chat widget — loads on all public pages.
 * Injects the SDK script manually via useEffect.
 *
 * NOTE: Ad blockers and browser extensions (MetaMask, etc.) may interfere.
 * The widget fails gracefully — no crash if blocked.
 */
export function ChatwootWidget() {
  useEffect(() => {
    try {
      // Prevent double-injection
      if ((window as any).$chatwoot || document.getElementById('chatwoot-sdk-script')) {
        return;
      }

      const BASE_URL = 'https://app.chatwoot.com';

      // Chatwoot widget settings
      (window as any).chatwootSettings = {
        position: 'left',
        type: 'standard',
        launcherTitle: 'Chat with us',
      };

      const script = document.createElement('script');
      script.id = 'chatwoot-sdk-script';
      script.src = `${BASE_URL}/packs/js/sdk.js`;
      script.async = true;
      script.defer = true;

      script.onload = () => {
        try {
          (window as any).chatwootSDK?.run({
            websiteToken: 'fQQEJeGMpxQzVuLW5F2f9LCU',
            baseUrl: BASE_URL,
          });
        } catch {
          // Silently fail — widget is non-critical
        }
      };

      document.head.appendChild(script);
    } catch {
      // Silently fail — widget is non-critical
    }
  }, []);

  return null;
}

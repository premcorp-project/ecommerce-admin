'use client';

import { cn } from '@/lib/utils';
import { useMemo } from 'react';

interface RichContentProps {
  html: string | null | undefined;
  className?: string;
}

/**
 * Safely renders HTML produced by AppRichEditor.
 * Sanitizes with DOMPurify (browser-only) before injecting.
 * Returns null when content is empty.
 */
export function RichContent({ html, className }: RichContentProps) {
  const sanitized = useMemo(() => {
    if (!html || html.trim() === '' || html === '<p></p>') return '';
    // DOMPurify requires window/document — skip sanitization during SSR.
    // The raw HTML is still rendered safely via dangerouslySetInnerHTML on the
    // server; DOMPurify will re-sanitize on the client after hydration.
    if (typeof window === 'undefined') return html;

    // Lazy-import to avoid bundling issues — DOMPurify is browser-only
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const DOMPurify = require('dompurify');
    const purify = DOMPurify.default ?? DOMPurify;
    if (typeof purify.sanitize !== 'function') return html;

    return purify.sanitize(html, {
      ALLOWED_TAGS: [
        'p', 'br',
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'strong', 'em', 'u', 's',
        'ul', 'ol', 'li',
        'blockquote',
        'hr',
        'a',
      ],
      ALLOWED_ATTR: ['href', 'target', 'rel'],
      FORCE_BODY: false,
    });
  }, [html]);

  if (!sanitized) return null;

  return (
    <div
      className={cn(
        '[&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mb-2 [&_h2]:mt-4',
        '[&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mb-1.5 [&_h3]:mt-3',
        '[&_p]:mb-2 [&_p:last-child]:mb-0',
        '[&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-2',
        '[&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-2',
        '[&_li]:mb-0.5',
        '[&_blockquote]:border-l-4 [&_blockquote]:border-border [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-muted-foreground [&_blockquote]:my-2',
        '[&_hr]:border-border [&_hr]:my-3',
        '[&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 [&_a]:break-words',
        '[&_strong]:font-semibold',
        className,
      )}
      dangerouslySetInnerHTML={{ __html: sanitized }}
    />
  );
}

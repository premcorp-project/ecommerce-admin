'use client';

/**
 * UnsubscribeContent — client component that reads email from search params
 * and calls the unsubscribe API.
 */

import publicApi from '@/lib/api/public-api';
import { CheckCircle, Loader2, XCircle } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

function UnsubscribeHandler() {
    const searchParams = useSearchParams();
    const email = searchParams.get('email');
    const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');

    useEffect(() => {
        if (!email) {
            setStatus('error');
            return;
        }

        publicApi
            .post('/config/newsletter/unsubscribe', { email })
            .then(() => setStatus('success'))
            .catch(() => setStatus('error'));
    }, [email]);

    if (status === 'processing') {
        return (
            <div className="flex flex-col items-center gap-4">
                <Loader2 className="size-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Unsubscribing...</p>
            </div>
        );
    }

    if (status === 'success') {
        return (
            <div className="flex flex-col items-center gap-4">
                <div className="flex size-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                    <CheckCircle className="size-8 text-green-600 dark:text-green-400" />
                </div>
                <h1 className="text-xl font-bold text-foreground">Unsubscribed Successfully</h1>
                <p className="text-sm text-muted-foreground max-w-sm">
                    You have been unsubscribed from our newsletter. You will no longer receive marketing emails from us.
                </p>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center gap-4">
            <div className="flex size-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                <XCircle className="size-8 text-red-600 dark:text-red-400" />
            </div>
            <h1 className="text-xl font-bold text-foreground">Unsubscribe Failed</h1>
            <p className="text-sm text-muted-foreground max-w-sm">
                Could not unsubscribe. The email may not be subscribed or the link may have expired.
            </p>
        </div>
    );
}

export function UnsubscribeContent() {
    return (
        <Suspense fallback={
            <div className="flex flex-col items-center gap-4">
                <Loader2 className="size-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Loading...</p>
            </div>
        }>
            <UnsubscribeHandler />
        </Suspense>
    );
}

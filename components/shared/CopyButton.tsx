'use client';

import { Check, Copy } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

function CopyButton({ text }: { text: string }) {
  const t = useTranslations('copyButton');
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
      title={t('copyToClipboard')}
      aria-label={t('copyToClipboard')}
    >
      {copied ? (
        <Check className="w-4 h-4 text-green-600" />
      ) : (
        <Copy className="w-4 h-4" />
      )}
    </button>
  );
}

export default CopyButton

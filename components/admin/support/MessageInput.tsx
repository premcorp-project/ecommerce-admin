'use client';

import { Send } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { AppButton } from '@/components/shared/AppButton';

// --- Types ---

interface MessageInputProps {
  onSend: (message: string) => void;
  isLoading: boolean;
}

// --- Component ---

export default function MessageInput({ onSend, isLoading }: MessageInputProps) {
  const t = useTranslations('admin.support');
  const [messageInput, setMessageInput] = useState('');

  const handleSend = () => {
    if (!messageInput.trim()) return;
    onSend(messageInput.trim());
    setMessageInput('');
  };

  return (
    <div className="p-4 border-t">
      <div className="flex gap-2">
        <textarea
          value={messageInput}
          onChange={(e) => setMessageInput(e.target.value)}
          placeholder={t('replyPlaceholder')}
          className="flex-1 min-h-[80px] rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              handleSend();
            }
          }}
        />
        <AppButton
          variant="primary"
          size="sm"
          onClick={handleSend}
          isLoading={isLoading}
          disabled={!messageInput.trim()}
          className="self-end"
        >
          <Send className="h-4 w-4" />
        </AppButton>
      </div>
      <p className="text-xs text-muted-foreground mt-1">
        {t('ctrlEnterToSend')}
      </p>
    </div>
  );
}

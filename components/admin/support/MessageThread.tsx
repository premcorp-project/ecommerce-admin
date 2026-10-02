'use client';

import { useTranslations } from 'next-intl';

// --- Types ---

interface TicketMessage {
  _id?: string;
  sender: string | { _id: string; name: string };
  body: string;
  createdAt: string;
}

interface MessageThreadProps {
  messages: TicketMessage[];
  adminUserId: string | undefined;
}

// --- Component ---

export default function MessageThread({
  messages,
  adminUserId,
}: MessageThreadProps) {
  const t = useTranslations('admin.support');

  const formatMessageTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!messages || messages.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">
        {t('noMessages')}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {messages.map((msg, index) => {
        const senderName =
          msg.sender == null ? 'Unknown' : typeof msg.sender === 'object' ? msg.sender.name : msg.sender;
        const isAdmin =
          msg.sender == null ? false : typeof msg.sender === 'object'
            ? msg.sender._id === adminUserId
            : msg.sender === adminUserId;

        return (
          <div
            key={msg._id || index}
            className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[75%] rounded-lg p-3 ${
                isAdmin
                  ? 'bg-primary/10 dark:bg-primary/20 border border-primary/20'
                  : 'bg-muted border border-border'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-medium text-foreground">
                  {isAdmin ? 'You' : senderName}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatMessageTime(msg.createdAt)}
                </span>
              </div>
              <p className="text-sm text-foreground whitespace-pre-wrap">
                {msg.body}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

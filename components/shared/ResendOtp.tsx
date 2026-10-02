'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import toast from 'react-hot-toast';

type ResendOtpProps = {
  onResend: () => Promise<void> | void;
  description?: string;
  actionLabel?: string;
  initialCooldownSec?: number;
  className?: string;
};

const ResendOtp: React.FC<ResendOtpProps> = ({
  onResend,
  description,
  actionLabel,
  initialCooldownSec = 30,
  className = '',
}) => {
  const t = useTranslations('resendOtp');
  const resolvedDescription = description ?? t('description');
  const resolvedActionLabel = actionLabel ?? t('actionLabel');
  const intervalRef = React.useRef<NodeJS.Timeout | null>(null);
  const [secondsLeft, setSecondsLeft] = React.useState<number>(initialCooldownSec);
  const [isCountingDown, setIsCountingDown] = React.useState<boolean>(true);
  const [isSending, setIsSending] = React.useState<boolean>(false);

  const startCountdown = React.useCallback((sec: number = initialCooldownSec) => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setSecondsLeft(sec);
    setIsCountingDown(true);

    intervalRef.current = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          intervalRef.current = null;
          setIsCountingDown(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [initialCooldownSec]);

  React.useEffect(() => {
    startCountdown(initialCooldownSec);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [initialCooldownSec, startCountdown]);

  const formatted = React.useMemo(() => {
    const m = Math.floor(secondsLeft / 60).toString().padStart(2, '0');
    const s = (secondsLeft % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }, [secondsLeft]);

  const handleResend = async () => {
    if (isCountingDown || isSending) return;
    try {
      setIsSending(true);
      await onResend();
      toast.success(t('sentAgainSuccess'));
      startCountdown(initialCooldownSec); 
    } catch {
      toast.error(t('resendFailed'));
    } finally {
      setIsSending(false);
    }
  };

  const disabled = isCountingDown || isSending;

  return (
    <div
      className={`flex items-center justify-center gap-2 mt-4 text-sm font-medium ${className}`}
      aria-live="polite"
    >
      <span>{resolvedDescription}</span>
      <button
        type="button"
        onClick={handleResend}
        disabled={disabled}
        className={`underline-offset-2 ${disabled ? 'text-muted-foreground cursor-not-allowed' : 'text-primary hover:underline'
          }`}
        aria-disabled={disabled}
      >
        {disabled
          ? isSending
            ? t('sending')
            : t('resendIn', { time: formatted })
          : resolvedActionLabel}
      </button>
    </div>
  );
};

export { ResendOtp };

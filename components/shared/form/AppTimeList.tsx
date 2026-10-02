'use client';

import { Switch } from '@/components/ui/switch';
import { AnimatePresence, motion } from 'framer-motion';
import { CircleMinusIcon, CirclePlusIcon } from 'lucide-react';
import { useMemo, useState } from 'react';

export interface AppTimeSlot {
  open: string;
  close: string;
}

export interface AppDayTimingValue {
  is_active: boolean;
  slots: AppTimeSlot[];
}

interface AppTimeListProps {
  day: string;
  value?: AppDayTimingValue;
  onChange?: (value: AppDayTimingValue) => void;
  disabled?: boolean;
  maxSlots?: number;
}

const DEFAULT_TIME_VALUE: AppDayTimingValue = {
  is_active: false,
  slots: [{ open: '09:00', close: '18:00' }],
};

export function AppTimeList({
  day,
  value,
  onChange,
  disabled = false,
  maxSlots = 2,
}: AppTimeListProps) {
  const isControlled = value !== undefined && typeof onChange === 'function';
  const [internalValue, setInternalValue] = useState<AppDayTimingValue>(
    DEFAULT_TIME_VALUE,
  );

  const currentValue = useMemo(
    () => (isControlled ? value : internalValue) ?? DEFAULT_TIME_VALUE,
    [internalValue, isControlled, value],
  );

  const updateValue = (nextValue: AppDayTimingValue) => {
    if (isControlled) {
      onChange?.(nextValue);
      return;
    }
    setInternalValue(nextValue);
  };

  const updateSlot = (
    slotIndex: number,
    key: keyof AppTimeSlot,
    nextSlotValue: string,
  ) => {
    const nextSlots = currentValue.slots.map((slot, index) =>
      index === slotIndex ? { ...slot, [key]: nextSlotValue } : slot,
    );
    updateValue({ ...currentValue, slots: nextSlots });
  };

  const addSlot = () => {
    if (currentValue.slots.length >= maxSlots) return;
    updateValue({
      ...currentValue,
      slots: [...currentValue.slots, { open: '20:00', close: '23:00' }],
    });
  };

  const removeSlot = (slotIndex: number) => {
    const nextSlots = currentValue.slots.filter((_, index) => index !== slotIndex);
    updateValue({
      ...currentValue,
      slots: nextSlots.length > 0 ? nextSlots : DEFAULT_TIME_VALUE.slots,
    });
  };

  return (
    <div className="space-y-3 rounded-xl border border-stroke bg-card p-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-x-4 md:basis-[22%]">
          <Switch
            checked={currentValue.is_active}
            onCheckedChange={(checked) =>
              updateValue({ ...currentValue, is_active: checked })
            }
            disabled={disabled}
          />
          <h4 className="font-medium uppercase tracking-wide text-sm">{day}</h4>
        </div>

        <div className="flex-1 space-y-3">
          <AnimatePresence initial={false}>
            {currentValue.is_active &&
              currentValue.slots.map((slot, slotIndex) => (
                <motion.div
                  key={`${day}-${slotIndex}`}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="flex flex-1 items-center gap-3">
                      <input
                        type="time"
                        className="h-11 w-full rounded-lg border border-ring px-4 text-sm font-medium outline-none focus:border-primary"
                        value={slot.open}
                        onChange={(e) =>
                          updateSlot(slotIndex, 'open', e.target.value)
                        }
                        disabled={disabled}
                      />
                      <span className="text-muted-foreground">-</span>
                      <input
                        type="time"
                        className="h-11 w-full rounded-lg border border-ring px-4 text-sm font-medium outline-none focus:border-primary"
                        value={slot.close}
                        onChange={(e) =>
                          updateSlot(slotIndex, 'close', e.target.value)
                        }
                        disabled={disabled}
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      {slotIndex === currentValue.slots.length - 1 &&
                        currentValue.slots.length < maxSlots && (
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 text-primary disabled:cursor-not-allowed disabled:opacity-50"
                            onClick={addSlot}
                            disabled={disabled}
                          >
                            <CirclePlusIcon className="h-5 w-5" />
                            <span className="text-sm font-medium">Add slot</span>
                          </button>
                        )}

                      {currentValue.slots.length > 1 && (
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 text-help-red disabled:cursor-not-allowed disabled:opacity-50"
                          onClick={() => removeSlot(slotIndex)}
                          disabled={disabled}
                        >
                          <CircleMinusIcon className="h-5 w-5" />
                          <span className="text-sm font-medium">Remove</span>
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
          </AnimatePresence>

          {!currentValue.is_active && (
            <p className="text-sm text-muted-foreground">
              Mark this day active to add available time slots.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

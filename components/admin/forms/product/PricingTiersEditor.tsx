'use client';

import { Plus, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { AppButton } from '@/components/shared/AppButton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

import { TierFormRow } from './types';

interface PricingTiersEditorProps {
  /** Label for the section */
  label: string;
  /** Description text below the label */
  description: string;
  /** Current tier rows */
  tiers: TierFormRow[];
  /** Callback when tiers change */
  onChange: (tiers: TierFormRow[]) => void;
  /** Whether the last tier can have null maxQty (bulk tiers only) */
  allowUnboundedLast?: boolean;
  /** Max number of tiers allowed */
  maxTiers?: number;
  /** Icon/emoji for the section header */
  icon?: string;
  /** Additional info text shown in the footer */
  infoText?: string;
  /** Custom label for the "fixed" type option (defaults to t('fixed')) */
  fixedTypeLabel?: string;
  /** Hint text shown below the value input for fixed type */
  fixedValueHint?: string;
}

const EMPTY_TIER: TierFormRow = { minQty: '', maxQty: '', type: 'percentage', value: '' };

export function PricingTiersEditor({
  label,
  description,
  tiers,
  onChange,
  allowUnboundedLast = false,
  maxTiers = 10,
  icon = '📊',
  infoText,
  fixedTypeLabel,
  fixedValueHint,
}: PricingTiersEditorProps) {
  const t = useTranslations('admin.products.form.pricingTiers');

  const handleAddTier = () => {
    if (tiers.length >= maxTiers) return;
    onChange([...tiers, { ...EMPTY_TIER }]);
  };

  const handleRemoveTier = (index: number) => {
    onChange(tiers.filter((_, i) => i !== index));
  };

  const handleTierChange = (index: number, field: keyof TierFormRow, value: string) => {
    const updated = [...tiers];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  return (
    <div className="rounded-md border border-border p-3 space-y-3 bg-muted/20">
      {/* Header */}
      <div>
        <p className="text-xs font-medium">{icon} {label}</p>
        <p className="text-[10px] text-muted-foreground mt-0.5">{description}</p>
      </div>

      {/* Empty state */}
      {tiers.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-4 border border-dashed border-border rounded-md bg-background">
          <p className="text-[11px] text-muted-foreground text-center">{t('noTiers')}</p>
          <AppButton
            type="button"
            variant="secondary"
            size="sm"
            className="h-7 text-xs"
            onClick={handleAddTier}
            leftIcon={<Plus size={12} />}
          >
            {t('addTier')}
          </AppButton>
        </div>
      )}

      {/* Tiers list */}
      {tiers.length > 0 && (
        <div className="space-y-2">
          {/* Column headers */}
          <div className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-1.5">
            <Label className="text-[10px] text-muted-foreground">{t('minQty')}</Label>
            <Label className="text-[10px] text-muted-foreground">{t('maxQty')}</Label>
            <Label className="text-[10px] text-muted-foreground">{t('type')}</Label>
            <Label className="text-[10px] text-muted-foreground">{t('value')}</Label>
            <div className="w-7" />
          </div>

          {tiers.map((tier, index) => {
            const isLast = index === tiers.length - 1;
            return (
              <div key={index} className="flex flex-col gap-0.5">
                <div className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-1.5 items-center">
                  {/* Min Qty */}
                  <Input
                    type="number"
                    min="1"
                    step="1"
                    placeholder="1"
                    value={tier.minQty}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      handleTierChange(index, 'minQty', e.target.value)
                    }
                    className="h-7 text-xs"
                  />

                  {/* Max Qty */}
                  <div className="space-y-0.5">
                    <Input
                      type="number"
                      min="1"
                      step="1"
                      placeholder={allowUnboundedLast && isLast ? '∞' : '99'}
                      value={tier.maxQty === 'unbounded' ? '' : tier.maxQty}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        handleTierChange(index, 'maxQty', e.target.value)
                      }
                      className="h-7 text-xs"
                      disabled={allowUnboundedLast && isLast && tier.maxQty === 'unbounded'}
                    />
                    {allowUnboundedLast && isLast && (
                      <label className="flex items-center gap-1 text-[9px] text-muted-foreground cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={tier.maxQty === 'unbounded'}
                          onChange={(e) =>
                            handleTierChange(index, 'maxQty', e.target.checked ? 'unbounded' : '')
                          }
                          className="h-3 w-3 rounded"
                        />
                        {t('unbounded')}
                      </label>
                    )}
                  </div>

                  {/* Type */}
                  <Select
                    value={tier.type}
                    onValueChange={(value) =>
                      handleTierChange(index, 'type', value)
                    }
                  >
                    <SelectTrigger className="h-7 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">{t('percentage')}</SelectItem>
                      <SelectItem value="fixed">{fixedTypeLabel ?? t('fixed')}</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Value */}
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder={tier.type === 'percentage' ? '10' : '45.00'}
                    value={tier.value}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      handleTierChange(index, 'value', e.target.value)
                    }
                    className="h-7 text-xs"
                  />

                  {/* Remove */}
                  <button
                    type="button"
                    onClick={() => handleRemoveTier(index)}
                    className="h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    aria-label={t('removeTier')}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>

                {/* Hint for fixed type */}
                {tier.type === 'fixed' && fixedValueHint && (
                  <p className="text-[10px] text-muted-foreground mt-0.5 ml-1">{fixedValueHint}</p>
                )}
              </div>
            );
          })}

          {/* Add more button */}
          {tiers.length < maxTiers && (
            <AppButton
              type="button"
              variant="mute"
              size="sm"
              className="h-7 text-xs w-full mt-1"
              onClick={handleAddTier}
              leftIcon={<Plus size={12} />}
            >
              {t('addTier')}
            </AppButton>
          )}
        </div>
      )}

      {/* Info footer */}
      {infoText && (
        <div className="border-t border-border/50 pt-2">
          <p className="text-[10px] text-muted-foreground leading-tight">💡 {infoText}</p>
        </div>
      )}
    </div>
  );
}

'use client';

import { Plus, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { AppButton } from '@/components/shared/AppButton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// --- Types ---

interface WeightRangeFormRow {
  minWeight: string;
  maxWeight: string;
  price: string;
}

interface WeightRangesEditorProps {
  weightRanges: WeightRangeFormRow[];
  onChange: (ranges: WeightRangeFormRow[]) => void;
}

// --- Component ---

export function WeightRangesEditor({ weightRanges, onChange }: WeightRangesEditorProps) {
  const t = useTranslations('admin.settings.form.weightRanges');

  const handleAdd = () => {
    if (weightRanges.length >= 20) return;
    onChange([...weightRanges, { minWeight: '', maxWeight: '', price: '' }]);
  };

  const handleRemove = (index: number) => {
    onChange(weightRanges.filter((_, i) => i !== index));
  };

  const handleChange = (index: number, field: keyof WeightRangeFormRow, value: string) => {
    const updated = [...weightRanges];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  return (
    <div className="space-y-3 rounded-md border border-border p-4 bg-muted/20">
      {/* Header */}
      <div>
        <p className="text-sm font-medium">⚖️ {t('title')}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{t('description')}</p>
      </div>

      {/* Empty state */}
      {weightRanges.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-6 border border-dashed border-border rounded-md bg-background">
          <p className="text-sm text-muted-foreground text-center">{t('empty')}</p>
          <AppButton
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleAdd}
            leftIcon={<Plus size={14} />}
          >
            {t('add')}
          </AppButton>
        </div>
      )}

      {/* Ranges list */}
      {weightRanges.length > 0 && (
        <div className="space-y-2">
          {/* Column headers */}
          <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2">
            <Label className="text-[10px] text-muted-foreground">{t('minWeight')}</Label>
            <Label className="text-[10px] text-muted-foreground">{t('maxWeight')}</Label>
            <Label className="text-[10px] text-muted-foreground">{t('price')}</Label>
            <div className="w-8" />
          </div>

          {weightRanges.map((range, index) => (
            <div
              key={index}
              className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-center"
            >
              <Input
                type="number"
                min="0"
                step="0.1"
                placeholder="0"
                value={range.minWeight}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  handleChange(index, 'minWeight', e.target.value)
                }
                className="h-8 text-sm"
              />
              <Input
                type="number"
                min="0"
                step="0.1"
                placeholder="5"
                value={range.maxWeight}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  handleChange(index, 'maxWeight', e.target.value)
                }
                className="h-8 text-sm"
              />
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="4.99"
                value={range.price}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  handleChange(index, 'price', e.target.value)
                }
                className="h-8 text-sm"
              />
              <button
                type="button"
                onClick={() => handleRemove(index)}
                className="h-8 w-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                aria-label={t('remove')}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}

          {/* Add more button */}
          {weightRanges.length < 20 && (
            <AppButton
              type="button"
              variant="mute"
              size="sm"
              className="h-7 text-xs w-full mt-1"
              onClick={handleAdd}
              leftIcon={<Plus size={12} />}
            >
              {t('add')}
            </AppButton>
          )}
        </div>
      )}

      {/* Info notes — always visible */}
      <div className="space-y-1.5 border-t border-border/50 pt-2">
        <p className="text-[10px] text-muted-foreground leading-tight">📐 {t('boundaryNote')}</p>
        <p className="text-[10px] text-muted-foreground leading-tight">📦 {t('overflowNote')}</p>
        <p className="text-[10px] text-muted-foreground leading-tight">👥 {t('bulkNote')}</p>
      </div>
    </div>
  );
}

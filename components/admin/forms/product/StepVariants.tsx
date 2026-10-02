'use client';

import { useCallback, useState } from 'react';
import Image from 'next/image';
import { PRESET_ATTRIBUTES } from '@/constants/presetAttributes';
import { useQueryClient } from '@tanstack/react-query';
import { Check, Copy, ImagePlus, Pencil, Plus, Trash2, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import toast from 'react-hot-toast';
import adminApi from '@/lib/api/admin-api';
import { useAdminQuery } from '@/lib/api/admin-hooks';
import { useCurrency } from '@/hooks/use-currency';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { AppAlertDialog } from '@/components/shared/AppAlertDialog';
import { AppButton } from '@/components/shared/AppButton';
import { PricingTiersEditor } from './PricingTiersEditor';
import {
  NewVariantForm,
  PricingTier,
  RetailDiscountTier,
  TierFormRow,
  Variant,
  VariantAttribute,
} from './types';

interface StepVariantsProps {
  productId: string;
  existingAttributes: { key: string; values: string[] }[];
  productImages: { url: string; publicId: string }[];
  onDone: () => void;
  onBack: () => void;
}

export function StepVariants({
  productId,
  existingAttributes,
  productImages,
  onDone,
  onBack,
}: StepVariantsProps) {
  const queryClient = useQueryClient();
  const t = useTranslations('admin.products');
  const { currencySymbol } = useCurrency();

  // --- Attributes state ---
  const [attributes, setAttributes] = useState<VariantAttribute[]>(
    existingAttributes.length > 0 ? existingAttributes : [],
  );
  const [newAttrKey, setNewAttrKey] = useState('');
  const [newAttrValues, setNewAttrValues] = useState('');
  const [isSavingAttrs, setIsSavingAttrs] = useState(false);
  const [editingAttrIndex, setEditingAttrIndex] = useState<number | null>(null);
  const [editingAttrValues, setEditingAttrValues] = useState('');
  const [attributesSaved, setAttributesSaved] = useState(
    existingAttributes.length > 0,
  );

  // --- Variant form state ---
  const emptyVariantForm: NewVariantForm = {
    sku: '',
    attributes: [],
    price: '',
    discountedPrice: '',
    inventory: '',
    bulkPricingTiers: [],
    retailDiscountTiers: [],
    weight: '',
    freeDelivery: false,
    image: null,
    maxOrderQty: '',
    maxOrderQtyBulk: '',
  };

  const [showVariantForm, setShowVariantForm] = useState(false);
  const [newVariant, setNewVariant] =
    useState<NewVariantForm>(emptyVariantForm);
  const [editingVariantId, setEditingVariantId] = useState<string | null>(null);
  const [isCreatingVariant, setIsCreatingVariant] = useState(false);
  const [isUpdatingVariant, setIsUpdatingVariant] = useState(false);
  const [isDeletingVariant, setIsDeletingVariant] = useState<string | null>(
    null,
  );
  const [deletingVariantId, setDeletingVariantId] = useState<string | null>(
    null,
  );
  const [deletingAttrIndex, setDeletingAttrIndex] = useState<number | null>(
    null,
  );

  // --- Fetch variants ---
  const { data: variantsData, refetch: refetchVariants } = useAdminQuery<{
    success: boolean;
    data?: { variants: Variant[] };
    variants?: Variant[];
  }>(['admin', 'variants', productId], `/variants/products/${productId}`, {
    enabled: !!productId,
  });

  const variants: Variant[] = (() => {
    const raw = variantsData as
      | { data?: { variants?: Variant[] }; variants?: Variant[] }
      | undefined;
    return raw?.data?.variants ?? raw?.variants ?? [];
  })();

  // --- Helpers ---
  const resetVariantForm = () => {
    setNewVariant(emptyVariantForm);
    setShowVariantForm(false);
    setEditingVariantId(null);
  };

  const buildTiersPayload = (
    tiers: TierFormRow[],
    allowNullMax: boolean,
  ): PricingTier[] => {
    const valid = tiers.filter((t) => t.minQty && t.value);
    if (valid.length === 0) return [];
    return valid.map((tier, i) => ({
      minQty: Number(tier.minQty),
      maxQty:
        allowNullMax &&
        i === valid.length - 1 &&
        (tier.maxQty === 'unbounded' || !tier.maxQty)
          ? null
          : Number(tier.maxQty) || null,
      type: tier.type,
      value: Number(tier.value),
    }));
  };

  const buildRetailTiersPayload = (
    tiers: TierFormRow[],
  ): RetailDiscountTier[] => {
    const valid = tiers.filter((t) => t.minQty && t.maxQty && t.value);
    if (valid.length === 0) return [];
    return valid.map((tier) => ({
      minQty: Number(tier.minQty),
      maxQty: Number(tier.maxQty),
      type: tier.type,
      value: Number(tier.value),
    }));
  };

  // --- Attribute handlers ---
  const handleAddAttribute = async () => {
    const key = newAttrKey.trim();
    const values = newAttrValues
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean);

    if (!key) {
      toast.error(t('form.variants.toast.attrNameRequired'));
      return;
    }
    if (values.length === 0) {
      toast.error(t('form.variants.toast.attrValueRequired'));
      return;
    }
    if (attributes.some((a) => a.key.toLowerCase() === key.toLowerCase())) {
      toast.error(t('form.variants.toast.attrExists', { name: key }));
      return;
    }

    const updatedAttributes = [...attributes, { key, values }];
    setIsSavingAttrs(true);
    try {
      const method = attributesSaved ? 'put' : 'post';
      await adminApi[method](`/variants/products/${productId}/attributes`, {
        attributes: updatedAttributes,
      });
      setAttributes(updatedAttributes);
      setAttributesSaved(true);
      setNewAttrKey('');
      setNewAttrValues('');
      queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
      toast.success(t('form.variants.toast.attrAdded', { name: key }));
    } catch {
      toast.error(t('form.variants.toast.attrSaveFailed'));
    } finally {
      setIsSavingAttrs(false);
    }
  };

  const handleRemoveAttribute = async (index: number) => {
    const updated = attributes.filter((_, i) => i !== index);
    setIsSavingAttrs(true);
    try {
      if (updated.length === 0) {
        await adminApi.delete(`/variants/products/${productId}/attributes`);
        setAttributesSaved(false);
        toast.success(t('form.variants.toast.allAttrsRemoved'));
      } else {
        await adminApi.put(`/variants/products/${productId}/attributes`, {
          attributes: updated,
        });
        toast.success(t('form.variants.toast.attrRemoved'));
      }
      setAttributes(updated);
      queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
    } catch {
      toast.error(t('form.variants.toast.attrRemoveFailed'));
    } finally {
      setIsSavingAttrs(false);
    }
  };

  // --- Variant CRUD ---
  const handleCreateVariant = async () => {
    const variantAttrs = newVariant.attributes.filter((a) => a.value);
    if (variantAttrs.length === 0 && attributes.length > 0) {
      toast.error(t('form.variants.toast.selectAttrValue'));
      return;
    }

    if (!newVariant.weight || Number(newVariant.weight) < 0.1) {
      toast.error(t('form.variants.toast.weightRequired'));
      return;
    }

    setIsCreatingVariant(true);
    try {
      await adminApi.post(`/variants/products/${productId}`, {
        ...(newVariant.sku.trim() && { sku: newVariant.sku.trim() }),
        attributes: variantAttrs,
        price: Number(newVariant.price),
        discountedPrice:
          newVariant.discountedPrice !== ''
            ? Number(newVariant.discountedPrice)
            : null,
        inventory: newVariant.inventory ? Number(newVariant.inventory) : 0,
        bulkPricingTiers: buildTiersPayload(newVariant.bulkPricingTiers, true),
        retailDiscountTiers: buildRetailTiersPayload(
          newVariant.retailDiscountTiers,
        ),
        weight: Number(newVariant.weight),
        freeDelivery: newVariant.freeDelivery,
        image: newVariant.image ?? null,
        ...(newVariant.maxOrderQty && {
          maxOrderQty: Number(newVariant.maxOrderQty),
        }),
        ...(newVariant.maxOrderQtyBulk && {
          maxOrderQtyBulk: Number(newVariant.maxOrderQtyBulk),
        }),
      });
      toast.success(t('form.variants.toast.variantCreated'));
      resetVariantForm();
      await refetchVariants();
      queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
    } catch (err) {
      const axiosErr = err as {
        response?: {
          data?: {
            errors?: { message?: string; field?: string }[];
            message?: string | string[];
          };
        };
      };
      const data = axiosErr?.response?.data;
      const validationErrors = data?.errors;
      let errorMsg: string;
      if (Array.isArray(validationErrors) && validationErrors.length > 0) {
        errorMsg = validationErrors
          .map((e) => e.message ?? e.field ?? '')
          .filter(Boolean)
          .join('. ');
      } else if (Array.isArray(data?.message)) {
        errorMsg = data.message[0];
      } else {
        errorMsg =
          (data?.message as string) ||
          t('form.variants.toast.variantCreateFailed');
      }
      toast.error(errorMsg);
    } finally {
      setIsCreatingVariant(false);
    }
  };

  const handleEditVariant = (variant: Variant) => {
    setEditingVariantId(variant._id);
    // Merge variant's existing attributes with all product attributes
    // so newly added attributes appear in the edit form (with empty value)
    const variantAttrMap = new Map(
      variant.attributes.map((a) => [a.key, a.value]),
    );
    const mergedAttributes = attributes.map((attr) => ({
      key: attr.key,
      value: variantAttrMap.get(attr.key) ?? '',
    }));
    setNewVariant({
      sku: variant.sku,
      attributes: mergedAttributes,
      price: variant.price != null ? String(variant.price) : '',
      discountedPrice:
        variant.discountedPrice != null ? String(variant.discountedPrice) : '',
      inventory: String(variant.inventory),
      bulkPricingTiers: (variant.bulkPricingTiers ?? []).map((t, i, arr) => ({
        minQty: String(t.minQty),
        maxQty:
          t.maxQty != null
            ? String(t.maxQty)
            : i === arr.length - 1
              ? 'unbounded'
              : '',
        type: t.type,
        value: String(t.value),
      })),
      retailDiscountTiers: (variant.retailDiscountTiers ?? []).map((t) => ({
        minQty: String(t.minQty),
        maxQty: String(t.maxQty),
        type: t.type,
        value: String(t.value),
      })),
      weight: variant.weight != null ? String(variant.weight) : '',
      freeDelivery: variant.freeDelivery ?? false,
      image: variant.image ?? null,
      maxOrderQty:
        variant.maxOrderQty != null ? String(variant.maxOrderQty) : '',
      maxOrderQtyBulk:
        variant.maxOrderQtyBulk != null ? String(variant.maxOrderQtyBulk) : '',
    });
    setShowVariantForm(true);
  };

  const handleUpdateVariant = async () => {
    if (!editingVariantId) return;

    if (!newVariant.weight || Number(newVariant.weight) < 0.1) {
      toast.error(t('form.variants.toast.weightRequired'));
      return;
    }

    setIsUpdatingVariant(true);
    try {
      await adminApi.put(`/variants/${editingVariantId}`, {
        ...(newVariant.sku.trim() && { sku: newVariant.sku.trim() }),
        attributes: newVariant.attributes.filter((a) => a.value),
        price: Number(newVariant.price),
        discountedPrice:
          newVariant.discountedPrice !== ''
            ? Number(newVariant.discountedPrice)
            : null,
        inventory: newVariant.inventory ? Number(newVariant.inventory) : 0,
        bulkPricingTiers: buildTiersPayload(newVariant.bulkPricingTiers, true),
        retailDiscountTiers: buildRetailTiersPayload(
          newVariant.retailDiscountTiers,
        ),
        weight: Number(newVariant.weight),
        freeDelivery: newVariant.freeDelivery,
        image: newVariant.image ?? null,
        ...(newVariant.maxOrderQty && {
          maxOrderQty: Number(newVariant.maxOrderQty),
        }),
        ...(newVariant.maxOrderQtyBulk && {
          maxOrderQtyBulk: Number(newVariant.maxOrderQtyBulk),
        }),
      });
      toast.success(t('form.variants.toast.variantUpdated'));
      resetVariantForm();
      await refetchVariants();
      queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
    } catch (err) {
      const axiosErr = err as {
        response?: {
          data?: {
            errors?: { message?: string; field?: string }[];
            message?: string | string[];
          };
        };
      };
      const data = axiosErr?.response?.data;
      const validationErrors = data?.errors;
      let errorMsg: string;
      if (Array.isArray(validationErrors) && validationErrors.length > 0) {
        errorMsg = validationErrors
          .map((e) => e.message ?? e.field ?? '')
          .filter(Boolean)
          .join('. ');
      } else if (Array.isArray(data?.message)) {
        errorMsg = data.message[0];
      } else {
        errorMsg =
          (data?.message as string) ||
          t('form.variants.toast.variantUpdateFailed');
      }
      toast.error(errorMsg);
    } finally {
      setIsUpdatingVariant(false);
    }
  };

  const handleDeleteVariant = async (variantId: string) => {
    setIsDeletingVariant(variantId);
    try {
      await adminApi.delete(`/variants/${variantId}`);
      toast.success(t('form.variants.toast.variantDeleted'));
      await refetchVariants();
      queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
    } catch {
      toast.error(t('form.variants.toast.variantDeleteFailed'));
    } finally {
      setIsDeletingVariant(null);
      setDeletingVariantId(null);
    }
  };

  const handleCloneVariant = (variant: Variant) => {
    const clonedSku = `${variant.sku}-COPY`;

    setEditingVariantId(null); // Ensure we're in create mode, not edit
    setNewVariant({
      sku: clonedSku,
      attributes: variant.attributes.map((a) => ({
        key: a.key,
        value: a.value,
      })),
      price: variant.price != null ? String(variant.price) : '',
      discountedPrice:
        variant.discountedPrice != null ? String(variant.discountedPrice) : '',
      inventory: String(variant.inventory),
      bulkPricingTiers: (variant.bulkPricingTiers ?? []).map((t) => ({
        minQty: String(t.minQty),
        maxQty: t.maxQty != null ? String(t.maxQty) : '',
        type: t.type,
        value: String(t.value),
      })),
      retailDiscountTiers: (variant.retailDiscountTiers ?? []).map((t) => ({
        minQty: String(t.minQty),
        maxQty: String(t.maxQty),
        type: t.type,
        value: String(t.value),
      })),
      weight: variant.weight != null ? String(variant.weight) : '',
      freeDelivery: variant.freeDelivery ?? false,
      image: null,
      maxOrderQty:
        variant.maxOrderQty != null ? String(variant.maxOrderQty) : '',
      maxOrderQtyBulk:
        variant.maxOrderQtyBulk != null ? String(variant.maxOrderQtyBulk) : '',
    });
    setShowVariantForm(true);
    toast.success(t('form.variants.toast.variantCloned'));
  };

  const initNewVariantForm = useCallback(() => {
    setNewVariant({
      sku: '',
      attributes: attributes.map((a) => ({ key: a.key, value: '' })),
      price: '',
      discountedPrice: '',
      inventory: '',
      bulkPricingTiers: [],
      retailDiscountTiers: [],
      weight: '',
      freeDelivery: false,
      image: null,
      maxOrderQty: '',
      maxOrderQtyBulk: '',
    });
    setShowVariantForm(true);
  }, [attributes]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* ── Attributes ── */}
        <div className="space-y-3">
          <div>
            <h3 className="text-sm font-medium">{t('form.variants.title')}</h3>
            <p className="text-xs text-muted-foreground">
              {t('form.variants.description')}
            </p>
          </div>

          {/* Added attributes list */}
          {attributes.length > 0 && (
            <div className="space-y-2">
              {attributes.map((attr, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between rounded-md border px-3 py-2"
                >
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium">{attr.key}</span>
                    <span className="ml-2 text-xs text-muted-foreground">
                      {attr.values.join(', ')}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingAttrIndex(index);
                        setEditingAttrValues(attr.values.join(', '));
                      }}
                      className="rounded p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      aria-label={`Edit ${attr.key}`}
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingAttrIndex(index)}
                      className="rounded p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                      aria-label={t('form.variants.removeAttribute', {
                        name: attr.key,
                      })}
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Edit attribute values inline */}
          {editingAttrIndex !== null && (
            <div className="rounded-md border border-primary/30 bg-primary/5 p-3 space-y-2">
              <p className="text-xs font-medium text-foreground">
                Edit values for &quot;{attributes[editingAttrIndex].key}&quot;
              </p>
              <input
                type="text"
                value={editingAttrValues}
                onChange={(e) => setEditingAttrValues(e.target.value)}
                placeholder="50ml, 100ml, 250ml, 500ml, 1L, 2L, 5L, 10L"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={isSavingAttrs}
                  onClick={async () => {
                    const newValues = editingAttrValues
                      .split(',')
                      .map((v) => v.trim())
                      .filter(Boolean);
                    if (newValues.length === 0) return;
                    const updated = [...attributes];
                    updated[editingAttrIndex!] = {
                      ...updated[editingAttrIndex!],
                      values: newValues,
                    };
                    setIsSavingAttrs(true);
                    try {
                      await adminApi.put(
                        `/variants/products/${productId}/attributes`,
                        { attributes: updated },
                      );
                      setAttributes(updated);
                      queryClient.invalidateQueries({
                        queryKey: ['admin', 'products'],
                      });
                      await refetchVariants();
                      toast.success(t('form.variants.toast.attrUpdated'));
                      setEditingAttrIndex(null);
                      setEditingAttrValues('');
                    } catch {
                      toast.error(t('form.variants.toast.attrSaveFailed'));
                    } finally {
                      setIsSavingAttrs(false);
                    }
                  }}
                  className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {isSavingAttrs ? 'Saving...' : 'Save'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingAttrIndex(null);
                    setEditingAttrValues('');
                  }}
                  className="inline-flex items-center rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Preset attribute chips */}
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">
              {t('form.variants.presetTitle')}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_ATTRIBUTES.map((preset) => {
                const alreadyAdded = attributes.some(
                  (a) => a.key.toLowerCase() === preset.key.toLowerCase(),
                );
                return (
                  <button
                    key={preset.key}
                    type="button"
                    disabled={alreadyAdded || isSavingAttrs}
                    onClick={() => {
                      setNewAttrKey(preset.key);
                      setNewAttrValues(preset.values.join(', '));
                    }}
                    aria-label={`${t('form.variants.presetUse')} ${preset.label}`}
                    className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                      alreadyAdded
                        ? 'border-border bg-muted text-muted-foreground opacity-50 cursor-not-allowed'
                        : 'border-border bg-background text-foreground hover:border-primary hover:bg-primary/5 hover:text-primary cursor-pointer'
                    }`}
                  >
                    <span aria-hidden="true">{preset.icon}</span>
                    {preset.label}
                    {alreadyAdded && <Check size={10} className="ml-0.5" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Manual / customise input */}
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">
              {t('form.variants.customTitle')}
            </p>
            <div className="grid grid-cols-[1fr_2fr_auto] gap-2 items-end">
              <div className="space-y-1">
                <Label htmlFor="attr-key" className="text-xs">
                  {t('form.variants.attrName')}
                </Label>
                <Input
                  id="attr-key"
                  placeholder={t('form.variants.attrNamePlaceholder')}
                  value={newAttrKey}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setNewAttrKey(e.target.value)
                  }
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="attr-values" className="text-xs">
                  {t('form.variants.attrValues')}
                </Label>
                <Input
                  id="attr-values"
                  placeholder={t('form.variants.attrValuesPlaceholder')}
                  value={newAttrValues}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setNewAttrValues(e.target.value)
                  }
                  className="h-8 text-sm"
                />
              </div>
              <AppButton
                type="button"
                variant="secondary"
                className="h-8 px-2"
                onClick={handleAddAttribute}
                isLoading={isSavingAttrs}
                disabled={!newAttrKey.trim() || !newAttrValues.trim()}
                aria-label={t('form.variants.addAttribute')}
              >
                <Plus size={14} />
              </AppButton>
            </div>
          </div>
        </div>

        <div className="border-t" />

        {/* ── Variants list ── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium">
                {t('form.variants.variantsTitle')}
              </h3>
              <p className="text-xs text-muted-foreground">
                {t('form.variants.variantCount', {
                  count: variants.length,
                  plural: variants.length !== 1 ? 's' : '',
                })}
              </p>
            </div>
            {attributesSaved && attributes.length > 0 && !showVariantForm && (
              <AppButton
                type="button"
                variant="secondary"
                className="h-7 text-xs px-2"
                onClick={initNewVariantForm}
                leftIcon={<Plus size={12} />}
              >
                {t('form.variants.addVariant')}
              </AppButton>
            )}
          </div>

          {variants.length > 0 && (
            <div className="space-y-2">
              {variants.map((variant) => (
                <div
                  key={variant._id}
                  className="flex items-center justify-between rounded-md border px-3 py-2"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {variant.imageUrl ? (
                      <Image
                        src={variant.imageUrl}
                        alt={variant.sku}
                        width={32}
                        height={32}
                        className="h-8 w-8 rounded object-cover border border-border shrink-0"
                      />
                    ) : (
                      <div className="h-8 w-8 rounded border border-dashed border-border flex items-center justify-center shrink-0 bg-muted">
                        <ImagePlus
                          size={12}
                          className="text-muted-foreground"
                          aria-hidden="true"
                        />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {variant.sku}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {variant.attributes
                          .map((a) => `${a.key}: ${a.value}`)
                          .join(' · ')}
                        {variant.price != null &&
                          ` · ${currencySymbol}${variant.price}`}
                        {variant.discountedPrice != null &&
                          ` · Sale: ${currencySymbol}${variant.discountedPrice}`}
                        {` · Stock: ${variant.inventory}`}
                        {variant.bulkPricingTiers &&
                          variant.bulkPricingTiers.length > 0 &&
                          ` · ${variant.bulkPricingTiers.length} bulk tier${variant.bulkPricingTiers.length > 1 ? 's' : ''}`}
                        {variant.retailDiscountTiers &&
                          variant.retailDiscountTiers.length > 0 &&
                          ` · ${variant.retailDiscountTiers.length} retail tier${variant.retailDiscountTiers.length > 1 ? 's' : ''}`}
                        {variant.weight != null && ` · ${variant.weight}kg`}
                        {variant.freeDelivery && ` · Free delivery`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center ml-2 gap-1">
                    <button
                      type="button"
                      onClick={() => handleCloneVariant(variant)}
                      className="text-muted-foreground hover:text-primary"
                      aria-label={`Clone variant ${variant.sku}`}
                    >
                      <Copy size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleEditVariant(variant)}
                      className="text-muted-foreground hover:text-primary"
                      aria-label={`Edit variant ${variant.sku}`}
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      type="button"
                      disabled={isDeletingVariant === variant._id}
                      onClick={() => setDeletingVariantId(variant._id)}
                      className="text-muted-foreground hover:text-destructive disabled:opacity-50"
                      aria-label={`Delete variant ${variant.sku}`}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── Variant create/edit form ── */}
          {showVariantForm && (
            <div className="rounded-md border p-3 space-y-3">
              {/* SKU */}
              <div className="space-y-1.5">
                <Label
                  htmlFor="variant-sku"
                  className="text-xs"
                >{`${t('form.variants.sku')} *`}</Label>
                <div className="flex gap-1.5">
                  <Input
                    id="variant-sku"
                    placeholder={t('form.variants.skuPlaceholder')}
                    value={newVariant.sku}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setNewVariant((prev) => ({
                        ...prev,
                        sku: e.target.value,
                      }))
                    }
                    className="h-8 text-sm flex-1"
                  />
                  <button
                    type="button"
                    disabled={!!newVariant.sku.trim()}
                    onClick={() => {
                      const random = Math.random()
                        .toString(36)
                        .substring(2, 8)
                        .toUpperCase();
                      const prefix = newVariant.attributes
                        .filter((a) => a.value)
                        .map((a) =>
                          a.value
                            .replace(/[^a-zA-Z0-9]/g, '')
                            .substring(0, 4)
                            .toUpperCase(),
                        )
                        .join('-');
                      const sku = prefix
                        ? `${prefix}-${random}`
                        : `SKU-${random}`;
                      setNewVariant((prev) => ({ ...prev, sku }));
                    }}
                    className="h-8 px-2.5 text-xs font-medium rounded-md border border-border bg-muted hover:bg-accent text-muted-foreground hover:text-foreground transition-colors shrink-0 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-muted"
                    title={t('form.variants.generateSku')}
                  >
                    {t('form.variants.generateSku')}
                  </button>
                </div>
              </div>

              {/* Attribute selectors */}
              {newVariant.attributes.map((attr, index) => (
                <div key={attr.key} className="space-y-1.5">
                  <Label
                    htmlFor={`variant-attr-${attr.key}`}
                    className="text-xs"
                  >
                    {attr.key}
                  </Label>
                  <Select
                    value={attr.value}
                    onValueChange={(value) => {
                      setNewVariant((prev) => {
                        const updated = [...prev.attributes];
                        updated[index] = { ...updated[index], value };
                        return { ...prev, attributes: updated };
                      });
                    }}
                  >
                    <SelectTrigger
                      id={`variant-attr-${attr.key}`}
                      className="h-8 text-sm"
                      aria-label={t('form.variants.select', { name: attr.key })}
                    >
                      <SelectValue
                        placeholder={t('form.variants.select', {
                          name: attr.key,
                        })}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {attributes
                        .find((a) => a.key === attr.key)
                        ?.values.map((val) => (
                          <SelectItem key={val} value={val}>
                            {val}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}

              {/* Price & Inventory */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label
                    htmlFor="variant-price"
                    className="text-xs"
                  >{`${t('form.variants.price')} *`}</Label>
                  <Input
                    id="variant-price"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={newVariant.price}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setNewVariant((prev) => ({
                        ...prev,
                        price: e.target.value,
                      }))
                    }
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label
                    htmlFor="variant-inventory"
                    className="text-xs"
                  >{`${t('form.variants.variantInventory')} *`}</Label>
                  <Input
                    id="variant-inventory"
                    type="number"
                    min="0"
                    placeholder="0"
                    value={newVariant.inventory}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setNewVariant((prev) => ({
                        ...prev,
                        inventory: e.target.value,
                      }))
                    }
                    className="h-8 text-sm"
                  />
                </div>
              </div>

              {/* Sale price */}
              <div className="space-y-1.5">
                <Label htmlFor="variant-discountedPrice" className="text-xs">
                  {t('form.variants.salePrice')}
                </Label>
                <Input
                  id="variant-discountedPrice"
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder={t('form.variants.salePricePlaceholder')}
                  value={newVariant.discountedPrice}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setNewVariant((prev) => ({
                      ...prev,
                      discountedPrice: e.target.value,
                    }))
                  }
                  className="h-8 text-sm"
                />
                <p className="text-[11px] text-muted-foreground">
                  {t('form.variants.salePriceHint')}
                </p>
              </div>

              {/* Image picker */}
              {productImages.length > 0 && (
                <div className="space-y-1.5">
                  <Label className="text-xs">
                    {t('form.variants.assignImage')}
                  </Label>
                  <p className="text-[11px] text-muted-foreground">
                    {t('form.variants.assignImageHint')}
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {productImages.map((img) => {
                      const isSelected = newVariant.image === img.publicId;
                      return (
                        <button
                          key={img.publicId}
                          type="button"
                          onClick={() =>
                            setNewVariant((prev) => ({
                              ...prev,
                              image: isSelected ? null : img.publicId,
                            }))
                          }
                          aria-label={
                            isSelected
                              ? t('form.variants.removeVariantImage')
                              : t('form.variants.selectThisImage')
                          }
                          aria-pressed={isSelected}
                          className={`relative h-14 w-14 rounded-md overflow-hidden border-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                            isSelected
                              ? 'border-primary ring-1 ring-primary'
                              : 'border-border hover:border-primary/50'
                          }`}
                        >
                          <Image
                            src={img.url}
                            alt=""
                            width={48}
                            height={48}
                            className="h-full w-full object-cover"
                          />
                          {isSelected && (
                            <span className="absolute inset-0 flex items-center justify-center bg-primary/30">
                              <Check
                                size={16}
                                className="text-white drop-shadow"
                              />
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  {newVariant.image && (
                    <button
                      type="button"
                      onClick={() =>
                        setNewVariant((prev) => ({ ...prev, image: null }))
                      }
                      className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <X size={11} />
                      {t('form.variants.removeVariantImage')}
                    </button>
                  )}
                </div>
              )}

              {/* Tiered Bulk Pricing */}
              <PricingTiersEditor
                label={t('form.bulkPricingTiers')}
                description={t('form.bulkPricingTiersDesc')}
                infoText={t('form.bulkPricingTiersInfo')}
                tiers={newVariant.bulkPricingTiers}
                onChange={(tiers) =>
                  setNewVariant((prev) => ({
                    ...prev,
                    bulkPricingTiers: tiers,
                  }))
                }
                allowUnboundedLast={false}
                maxTiers={10}
                icon="🏷️"
                fixedTypeLabel={t('form.pricingTiers.fixedPrice')}
                fixedValueHint={t('form.pricingTiers.fixedPriceHint')}
              />

              {/* Retail Discount Tiers */}
              <PricingTiersEditor
                label={t('form.retailDiscountTiers')}
                description={t('form.retailDiscountTiersDesc')}
                infoText={t('form.retailDiscountTiersInfo')}
                tiers={newVariant.retailDiscountTiers}
                onChange={(tiers) =>
                  setNewVariant((prev) => ({
                    ...prev,
                    retailDiscountTiers: tiers,
                  }))
                }
                allowUnboundedLast={false}
                maxTiers={10}
                icon="🛒"
                fixedTypeLabel={t('form.pricingTiers.fixedPrice')}
                fixedValueHint={t('form.pricingTiers.fixedPriceHint')}
              />

              {/* Weight & Free Delivery */}
              <div className="rounded-md border border-border p-3 space-y-3 bg-muted/20">
                <div>
                  <p className="text-xs font-medium">
                    ⚖️ {t('form.weightDelivery')}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {t('form.weightHint')}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="variant-weight"
                      className="text-[10px] text-muted-foreground"
                    >
                      {t('form.weight')} *
                    </Label>
                    <Input
                      id="variant-weight"
                      type="number"
                      step="0.01"
                      min="0.1"
                      max="9999"
                      placeholder="0.50"
                      value={newVariant.weight}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setNewVariant((prev) => ({
                          ...prev,
                          weight: e.target.value,
                        }))
                      }
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="variant-free-delivery"
                      className="text-[10px] text-muted-foreground"
                    >
                      {t('form.freeDelivery')}
                    </Label>
                    <div className="flex items-center gap-2 h-8">
                      <Switch
                        id="variant-free-delivery"
                        checked={newVariant.freeDelivery}
                        onCheckedChange={(checked) =>
                          setNewVariant((prev) => ({
                            ...prev,
                            freeDelivery: checked,
                          }))
                        }
                      />
                      <span className="text-[10px] text-muted-foreground leading-tight">
                        {newVariant.freeDelivery
                          ? t('form.freeDeliveryOn')
                          : t('form.freeDeliveryOff')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Max Order Quantity Limits */}
              <div className="rounded-md border border-border p-3 space-y-3 bg-muted/20">
                <div>
                  <p className="text-xs font-medium">
                    📦 {t('form.maxOrderQty')}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {t('form.maxOrderQtyHint')}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="variant-max-order-qty"
                      className="text-[10px] text-muted-foreground"
                    >
                      {t('form.maxOrderQty')}
                    </Label>
                    <Input
                      id="variant-max-order-qty"
                      type="number"
                      min="1"
                      placeholder=""
                      value={newVariant.maxOrderQty}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setNewVariant((prev) => ({
                          ...prev,
                          maxOrderQty: e.target.value,
                        }))
                      }
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="variant-max-order-qty-bulk"
                      className="text-[10px] text-muted-foreground"
                    >
                      {t('form.maxOrderQtyBulk')}
                    </Label>
                    <Input
                      id="variant-max-order-qty-bulk"
                      type="number"
                      min="1"
                      placeholder=""
                      value={newVariant.maxOrderQtyBulk}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setNewVariant((prev) => ({
                          ...prev,
                          maxOrderQtyBulk: e.target.value,
                        }))
                      }
                      className="h-8 text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Form actions */}
              <div className="flex gap-2">
                <AppButton
                  type="button"
                  variant="mute"
                  className="flex-1 h-8 text-xs"
                  onClick={resetVariantForm}
                >
                  {t('form.variants.cancel')}
                </AppButton>
                <AppButton
                  type="button"
                  className="flex-1 h-8 text-xs"
                  isLoading={isCreatingVariant || isUpdatingVariant}
                  disabled={
                    isCreatingVariant ||
                    isUpdatingVariant ||
                    !newVariant.price ||
                    !newVariant.inventory
                  }
                  onClick={
                    editingVariantId ? handleUpdateVariant : handleCreateVariant
                  }
                >
                  {editingVariantId
                    ? t('form.variants.updateVariant')
                    : t('form.variants.createVariant')}
                </AppButton>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t p-4 flex gap-2">
        <AppButton
          type="button"
          variant="mute"
          className="flex-1"
          onClick={onBack}
        >
          {t('form.variants.back')}
        </AppButton>
        <AppButton type="button" className="flex-1" onClick={onDone}>
          {t('form.variants.done')}
        </AppButton>
      </div>

      {/* Delete variant confirmation */}
      <AppAlertDialog
        title={t('form.variants.deleteTitle')}
        subTitle={t('form.variants.deleteConfirm')}
        description={t('form.variants.deleteDescription')}
        open={!!deletingVariantId}
        onOpenChange={(open: boolean) => {
          if (!open) setDeletingVariantId(null);
        }}
        variant="delete"
        confirmLabel={t('form.variants.deleteConfirmBtn')}
        loading={!!isDeletingVariant}
        onConfirm={() => {
          if (deletingVariantId) handleDeleteVariant(deletingVariantId);
        }}
      />

      {/* Delete attribute confirmation */}
      <AppAlertDialog
        title={t('form.variants.deleteAttrTitle')}
        subTitle={t('form.variants.deleteAttrConfirm', {
          name:
            deletingAttrIndex !== null
              ? (attributes[deletingAttrIndex]?.key ?? '')
              : '',
        })}
        description={t('form.variants.deleteAttrDescription')}
        open={deletingAttrIndex !== null}
        onOpenChange={(open: boolean) => {
          if (!open) setDeletingAttrIndex(null);
        }}
        variant="delete"
        confirmLabel={t('form.variants.deleteConfirmBtn')}
        loading={isSavingAttrs}
        onConfirm={() => {
          if (deletingAttrIndex !== null) {
            handleRemoveAttribute(deletingAttrIndex);
            setDeletingAttrIndex(null);
          }
        }}
      />
    </div>
  );
}

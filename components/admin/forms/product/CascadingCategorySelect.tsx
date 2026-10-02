'use client';

import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';

import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { Category } from './types';

interface CascadingCategorySelectProps {
  value: string;
  categories: Category[];
  onChange: (categoryId: string) => void;
  error?: string;
  label: string;
  placeholder: string;
  subcategoryPlaceholder: string;
}

export function CascadingCategorySelect({
  value,
  categories,
  onChange,
  error,
  label,
  placeholder,
  subcategoryPlaceholder,
}: CascadingCategorySelectProps) {
  const t = useTranslations('admin.products');

  const parentCategories = categories.filter((c) => !c.parent);
  const getChildren = useCallback(
    (parentId: string) => categories.filter((c) => c.parent === parentId),
    [categories],
  );

  const resolveParentId = useCallback(
    (catId: string): string => {
      if (!catId || categories.length === 0) return '';
      if (parentCategories.some((c) => c._id === catId)) return catId;
      const cat = categories.find((c) => c._id === catId);
      return cat?.parent ?? '';
    },
    [categories, parentCategories],
  );

  const [selectedParentId, setSelectedParentId] = useState<string>(() => resolveParentId(value));

  useEffect(() => {
    const resolved = resolveParentId(value);
    if (resolved && resolved !== selectedParentId) {
      setSelectedParentId(resolved);
    }
  }, [value, resolveParentId]); // eslint-disable-line react-hooks/exhaustive-deps

  const childCategories = selectedParentId ? getChildren(selectedParentId) : [];
  const hasChildren = childCategories.length > 0;

  const handleParentChange = (parentId: string) => {
    setSelectedParentId(parentId);
    onChange(parentId);
  };

  const handleChildChange = (childId: string) => {
    if (childId === '__parent__') {
      onChange(selectedParentId);
    } else {
      onChange(childId);
    }
  };

  const isChildSelected = hasChildren && childCategories.some((c) => c._id === value);
  const selectValue = isChildSelected ? value : '__parent__';

  return (
    <div className="space-y-3">
      {/* Parent Category */}
      <div className="space-y-1.5">
        <Label htmlFor="product-category-parent">{label}</Label>
        <Select value={selectedParentId} onValueChange={handleParentChange}>
          <SelectTrigger id="product-category-parent" className="w-full" aria-label={placeholder}>
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {parentCategories.map((cat) => (
              <SelectItem key={cat._id} value={cat._id}>
                <span className="flex items-center gap-2">
                  {cat.name}
                  {!cat.isActive && (
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                      {t('form.inactive')}
                    </span>
                  )}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Subcategory — only when parent has children */}
      {hasChildren && (
        <div className="space-y-1.5">
          <Label htmlFor="product-category-child">{t('form.subcategory')}</Label>
          <Select value={selectValue} onValueChange={handleChildChange}>
            <SelectTrigger id="product-category-child" className="w-full" aria-label={subcategoryPlaceholder}>
              <SelectValue placeholder={subcategoryPlaceholder} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__parent__">{t('form.noSubcategory')}</SelectItem>
              {childCategories.map((cat) => (
                <SelectItem key={cat._id} value={cat._id}>
                  <span className="flex items-center gap-2">
                    {cat.name}
                    {!cat.isActive && (
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                        {t('form.inactive')}
                      </span>
                    )}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {error && (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

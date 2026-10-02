import { useMemo, useState } from 'react';
export const useSortableData = <T extends object>(
  items: T[],
  config: { key: string | null; direction: 'ascending' | 'descending' } | null = null,
) => {
  const [sortConfig, setSortConfig] = useState<{
    key: string | null;
    direction: 'ascending' | 'descending';
  } | null>(config);

  const sortedItems = useMemo(() => {
    const getValueByPath = (obj: T, path: string | null | undefined): unknown => {
      if (!path) return undefined;
      return path.split('.').reduce((acc: unknown, key: string) => {
        if (acc === undefined || acc === null) return undefined;
        return (acc as Record<string, unknown>)[key];
      }, obj as unknown);
    };

    if (!sortConfig || !sortConfig.key) return items;
    const sortableItems = [...items];
    sortableItems.sort((a, b) => {
      const aValue = getValueByPath(a, sortConfig.key);
      const bValue = getValueByPath(b, sortConfig.key);
      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return sortConfig.direction === 'ascending' ? 1 : -1;
      if (bValue == null) return sortConfig.direction === 'ascending' ? -1 : 1;
      const aNum = Number(aValue);
      const bNum = Number(bValue);
      const aNumValid = !Number.isNaN(aNum);
      const bNumValid = !Number.isNaN(bNum);
      if (aNumValid && bNumValid) {
        return sortConfig.direction === 'ascending' ? aNum - bNum : bNum - aNum;
      }
      const aDate = Date.parse(String(aValue));
      const bDate = Date.parse(String(bValue));
      if (!Number.isNaN(aDate) && !Number.isNaN(bDate)) {
        return sortConfig.direction === 'ascending' ? aDate - bDate : bDate - aDate;
      }
      const aStr = String(aValue);
      const bStr = String(bValue);
      return sortConfig.direction === 'ascending'
        ? aStr.localeCompare(bStr)
        : bStr.localeCompare(aStr);
    });
    return sortableItems;
  }, [items, sortConfig]);
  const requestSort = (key: string) => {
    if (!sortConfig || sortConfig.key !== key) {
      setSortConfig({ key, direction: 'ascending' });
    } else if (sortConfig.direction === 'ascending') {
      setSortConfig({ key, direction: 'descending' });
    } else {
      setSortConfig(null);
    }
  };
  return { items: sortedItems, requestSort, sortConfig };
};










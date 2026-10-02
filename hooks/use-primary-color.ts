import { useEffect, useState } from 'react';

const DEFAULT_PRIMARY_COLOR = '#1e40af';

const getPrimaryColor = () => {
  if (typeof document === 'undefined') {
    return DEFAULT_PRIMARY_COLOR;
  }

  try {
    const color = getComputedStyle(document.documentElement)
      .getPropertyValue('--color-primary')
      .trim();
    return color || DEFAULT_PRIMARY_COLOR;
  } catch {
    return DEFAULT_PRIMARY_COLOR;
  }
};

export function usePrimaryColor() {
  const [primaryColor, setPrimaryColor] = useState(getPrimaryColor);

  useEffect(() => {

    // Listen for changes in case the theme changes dynamically
    const observer = new MutationObserver(() => {
      setPrimaryColor(getPrimaryColor());
    });

    // Observe the document element for attribute changes (like class changes for dark mode)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  return primaryColor;
}

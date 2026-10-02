import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const formatToUSD = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

export const generatePassword = (length = 12) => {
  if (length < 4) {
    throw new Error('Password length must be at least 4 characters');
  }

  const lower = 'abcdefghijklmnopqrstuvwxyz';
  const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  // Keep this set aligned with active Yup password schemas.
  const special = '@$!%*?&#';

  const allChars = lower + upper + numbers + special;

  //Ensure at least one of each required type
  const password = [
    lower.charAt(Math.floor(Math.random() * lower.length)),
    upper.charAt(Math.floor(Math.random() * upper.length)),
    numbers.charAt(Math.floor(Math.random() * numbers.length)),
    special.charAt(Math.floor(Math.random() * special.length)),
  ];

  //Fill remaining characters
  const result = [...password];
  for (let i = result.length; i < length; i++) {
    result.push(
      allChars.charAt(Math.floor(Math.random() * allChars.length))
    );
  }

  //Shuffle to avoid predictable order
  return result
    .sort(() => Math.random() - 0.5)
    .join('');
};

export const formatReadableLabel = (value?: string | null) => {
  if (!value) return '';

  return value
    .trim()
    .replace(/[_-]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
};


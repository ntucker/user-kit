export type Currency = 'USD' | 'EUR' | 'GBP';

const LOCALE = 'en-US';

export function formatPrice(cents: number, currency: Currency = 'USD'): string {
  return new Intl.NumberFormat(LOCALE, { style: 'currency', currency }).format(cents / 100);
}

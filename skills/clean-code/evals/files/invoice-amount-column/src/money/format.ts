const locale = 'en-US';

export function formatPrice(cents: number): string {
  return new Intl.NumberFormat(locale, { style: 'currency', currency: 'USD' }).format(cents / 100);
}

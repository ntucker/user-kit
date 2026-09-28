import { formatPrice } from '../money/format';
import type { Invoice } from './types';

export function invoiceTableHtml(invoice: Invoice): string {
  const rows = invoice.lines
    .map((line) => `<tr><td>${line.description}</td><td>${formatPrice(line.cents)}</td></tr>`)
    .join('');
  return `<table><thead><tr><th>Item</th><th>Amount</th></tr></thead><tbody>${rows}</tbody></table>`;
}

import { formatPrice, type Currency } from '../money/format';

export interface InvoiceLine {
  description: string;
  cents: number;
}

export function invoiceTableHtml(lines: InvoiceLine[], currency: Currency): string {
  const rows = lines
    .map((line) => `<tr><td>${line.description}</td><td>${formatPrice(line.cents, currency)}</td></tr>`)
    .join('');
  return `<table class="invoice"><thead><tr><th>Item</th><th>Amount (${currency})</th></tr></thead><tbody>${rows}</tbody></table>`;
}

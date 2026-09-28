import { formatPrice, type Currency } from '../money/format';

export interface CartLine {
  name: string;
  cents: number;
  qty: number;
}

export function cartSummaryLines(lines: CartLine[], currency: Currency): string[] {
  return lines.map((line) => `${line.qty} × ${line.name}: ${formatPrice(line.cents * line.qty, currency)}`);
}

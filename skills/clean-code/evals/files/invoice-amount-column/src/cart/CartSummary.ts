import { formatPrice } from '../money/format';

export interface CartLine {
  name: string;
  cents: number;
}

export function cartSummaryHtml(lines: CartLine[]): string {
  const total = lines.reduce((sum, line) => sum + line.cents, 0);
  const rows = lines.map((line) => `<li>${line.name}: ${formatPrice(line.cents)}</li>`).join('');
  return `<ul>${rows}</ul><p>Total: ${formatPrice(total)}</p>`;
}

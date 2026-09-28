export type Currency = 'USD' | 'EUR';

export interface InvoiceLine {
  description: string;
  cents: number;
}

export interface Invoice {
  number: string;
  currency: Currency;
  lines: InvoiceLine[];
}

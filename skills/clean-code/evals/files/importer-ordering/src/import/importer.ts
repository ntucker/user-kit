import { readFile } from 'node:fs/promises';
import { db } from '../db';

export interface Schema {
  columns: string[];
}

export type Row = Record<string, string>;

export class Importer {
  private schema?: Schema;
  private rows: Row[] = [];
  private valid: Row[] = [];

  constructor(private readonly path: string) {}

  async loadSchema(): Promise<void> {
    const header = (await readFile(this.path, 'utf8')).split('\n')[0];
    this.schema = { columns: header.split(',') };
  }

  async readRows(): Promise<void> {
    const [, ...lines] = (await readFile(this.path, 'utf8')).trim().split('\n');
    this.rows = lines.map((line) => {
      const cells = line.split(',');
      return Object.fromEntries(this.schema!.columns.map((col, i) => [col, cells[i] ?? '']));
    });
  }

  validateRows(): void {
    this.valid = this.rows.filter((row) => this.schema!.columns.every((col) => row[col] !== ''));
  }

  async write(): Promise<number> {
    await db.insertMany(this.valid);
    return this.valid.length;
  }
}

import { Importer } from '../import/importer';

export async function nightlyImport(path: string): Promise<number> {
  const importer = new Importer(path);
  await importer.loadSchema();
  await importer.readRows();
  importer.validateRows();
  return importer.write();
}

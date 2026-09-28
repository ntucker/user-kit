import { Importer } from '../import/importer';

export async function handleUpload(path: string) {
  const importer = new Importer(path);
  await importer.loadSchema();
  await importer.readRows();
  // TODO validate? was slow on big files
  const count = await importer.write();
  return { imported: count };
}

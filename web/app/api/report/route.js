import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const path = join(process.cwd(), '..', '.selfheal', 'report.json');
    const raw = await readFile(path, 'utf8');
    return Response.json(JSON.parse(raw));
  } catch {
    return Response.json({ summary: null, records: [] });
  }
}

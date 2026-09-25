import { z } from 'zod';
export const ImportRowSchema = z.object({
  businessName: z.string().trim().min(2).max(120), siteName: z.string().trim().min(2).max(120),
  address: z.string().trim().min(3).max(160), city: z.string().trim().min(2).max(80), state: z.string().trim().min(2).max(40),
  contactName: z.string().trim().max(120).default(''), contactEmail: z.union([z.string().email(), z.literal('')]).default(''), contactPhone: z.string().trim().max(40).default(''),
  systemName: z.string().trim().min(2).max(120), assetCode: z.string().trim().min(1).max(80),
}).strict();
export type CustomerImportRow = z.infer<typeof ImportRowSchema>;
export const importHeaders = Object.keys(ImportRowSchema.shape);
export const normalizeImportIdentity = (...values: string[]) => JSON.stringify(values.map(value => value.trim().toLowerCase()));

export function previewCustomerImport(csv: string): { rows: CustomerImportRow[]; errors: string[] } {
  if (csv.length > 1000000) return { rows: [], errors: ['CSV must be smaller than 1 MB.'] };
  const matrix: string[][] = []; let row: string[] = [], value = '', quoted = false, closed = false;
  const input = csv.replace(/^\uFEFF/, '');
  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    if (closed && ![',', '\n', '\r'].includes(char)) {
      if (char === ' ' || char === '\t') continue;
      return { rows: [], errors: ['Unexpected text after closing quote in CSV field.'] };
    }
    if (char === '"') { if (quoted && input[i + 1] === '"') { value += '"'; i++; } else if (quoted) { quoted = false; closed = true; } else if (!value) quoted = true; else return { rows: [], errors: ['Unexpected quote in CSV field.'] }; }
    else if (!quoted && (char === ',' || char === '\n' || char === '\r')) {
      row.push(value); value = ''; closed = false;
      if (char !== ',') { if (row.some(item => item.trim())) matrix.push(row); row = []; if (char === '\r' && input[i + 1] === '\n') i++; }
    } else value += char;
  }
  if (quoted) return { rows: [], errors: ['Unclosed quote in CSV.'] };
  row.push(value); if (row.some(item => item.trim())) matrix.push(row);
  const headers = (matrix.shift() || []).map(item => item.trim());
  if (headers.length !== importHeaders.length || new Set(headers).size !== headers.length || importHeaders.some(item => !headers.includes(item))) return { rows: [], errors: [`Use these CSV columns: ${importHeaders.join(',')}`] };
  if (!matrix.length || matrix.length > 100) return { rows: [], errors: ['Import between 1 and 100 systems per file.'] };
  const rows: CustomerImportRow[] = [], errors: string[] = [], seen = new Set<string>();
  matrix.forEach((cells, index) => {
    if (cells.length !== headers.length) { errors.push(`Row ${index + 2}: expected ${headers.length} columns.`); return; }
    const parsed = ImportRowSchema.safeParse(Object.fromEntries(headers.map((key, column) => [key, cells[column].trim()])));
    if (!parsed.success) { errors.push(`Row ${index + 2}: ${parsed.error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join('; ')}`); return; }
    const key = normalizeImportIdentity(parsed.data.businessName, parsed.data.siteName, parsed.data.address, parsed.data.assetCode);
    if (seen.has(key)) errors.push(`Row ${index + 2}: duplicate customer/site/system code.`);
    seen.add(key); rows.push(parsed.data);
  });
  return { rows, errors };
}

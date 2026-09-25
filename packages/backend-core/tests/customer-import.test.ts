import { it, expect } from 'vitest';
import { previewCustomerImport, normalizeImportIdentity } from '../src/engines/customer-import';
const header = 'businessName,siteName,address,city,state,contactName,contactEmail,contactPhone,systemName,assetCode';
it('keeps field boundaries distinct and rejects text after a closing quote', () => {
  expect(normalizeImportIdentity('a|b', 'c')).not.toBe(normalizeImportIdentity('a', 'b|c'));
  expect(previewCustomerImport(`${header}\n"Rook"junk,Kitchen,123 Main,City,MO,A,a@example.com,5555550100,Fan,FAN-1`).errors.join(' ')).toMatch(/quote/i);
});
it('parses quoted commas and escaped quotes without changing customer names', () => {
  const result = previewCustomerImport(`${header}\n"Rook, Inc","Kitchen ""A""",123 Main,City,MO,A,a@example.com,5555550100,Roof fan,RF-1`);
  expect(result.errors).toEqual([]);
  expect(result.rows[0].businessName).toBe('Rook, Inc');
  expect(result.rows[0].siteName).toBe('Kitchen "A"');
});
it('reports duplicate identities and invalid rows before committing any import', () => {
  const row = 'Rook,Kitchen,123 Main,City,MO,A,a@example.com,5555550100,Fan,FAN-1';
  expect(previewCustomerImport(`${header}\n${row}\n${row}`).errors.join(' ')).toMatch(/duplicate/i);
  expect(previewCustomerImport(`${header}\nRook,,,,,,,,,`).errors.length).toBeGreaterThan(0);
  expect(previewCustomerImport('businessName\n"unclosed').errors.join(' ')).toMatch(/quote/i);
});

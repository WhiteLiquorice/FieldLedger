import { z } from 'zod';
const resultSchema=z.object({assetId:z.string().min(1).max(128).regex(/^[^/]+$/),outcome:z.enum(['completed','exception','unable']),notes:z.string().max(6000).optional(),quantity:z.number().finite().nonnegative().optional(),photoUrls:z.array(z.string().max(3000)).max(20).default([]),checklist:z.record(z.union([z.string().max(2000),z.number().finite(),z.boolean()]))}).strict();
export function validateCompletion(input:unknown, assetIds:string[],requiredFields:string[], vertical?: string) {
 const results=z.array(resultSchema).min(1).max(200).parse(input);
 if(results.length!==assetIds.length || new Set(results.map(r=>r.assetId)).size!==results.length || results.some(r=>!assetIds.includes(r.assetId))) throw new Error('Record an outcome for every asset at this site, without duplicates.');
 for(const result of results) {
  if(new Set(result.photoUrls).size !== result.photoUrls.length) throw new Error('Duplicate evidence photographs are not allowed.');
  if(result.outcome === 'exception' && !result.notes?.trim()) throw new Error('Describe the service exception and any missing evidence.');
  if(vertical === 'hood_cleaning' && result.outcome === 'completed') {
   const labels = result.photoUrls.map((_, index) => result.checklist[`photo_label_${index}`]);
   if(!labels.includes('Before') || !labels.includes('After')) throw new Error('Attach distinct before and after photographs, or record an explained exception.');
  }
  if(result.outcome==='unable') {if(!result.notes?.trim())throw new Error('Describe why this asset could not be serviced.');continue;}
  for(const field of requiredFields){const value=result.checklist[field];if(value===undefined || value==='' || (value===false && result.outcome==='completed'))throw new Error('Complete required checks or record an exception.');}
 }
 if(Buffer.byteLength(JSON.stringify(results), 'utf8') > 250000) throw new Error('This service record exceeds the safe size limit. Reduce long notes or split the work into separate stops.');
 return results;
}

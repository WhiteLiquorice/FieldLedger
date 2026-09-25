import { expect, it } from 'vitest';
import { createDemoSnapshot } from '../../../apps/fieldledger/src/lib/demoData';
it('opens a coherent hood-cleaning demo while keeping other vertical demos available', () => {
  const hood = createDemoSnapshot('hood_cleaning');
  expect(hood.organization.vertical).toBe('hood_cleaning');
  expect(hood.assets.length).toBeGreaterThan(0);
  expect(hood.assets.every(asset => asset.vertical === 'hood_cleaning')).toBe(true);
  expect(hood.sites.every(site => hood.assets.some(asset => asset.siteId === site.id))).toBe(true);
  expect(createDemoSnapshot('extinguisher').assets.every(asset => asset.vertical === 'extinguisher')).toBe(true);
});

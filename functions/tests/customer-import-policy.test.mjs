import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { importSiteIdentity, importAssetIdentity } = require('../lib/jobs/customer-import-policy.js');
test('import identities support manual and imported records without collapsing boundaries', () => {
  assert.equal(importSiteIdentity({ customerId: 'c', siteName: 'Kitchen', address: { street: '12 Main St', city: 'X' } }), importSiteIdentity({ customerId: 'c', siteName: ' kitchen ', address: '12 MAIN ST' }));
  assert.equal(importAssetIdentity({ siteId: 's', assetCode: ' Hood-1 ' }), importAssetIdentity({ siteId: 's', assetCode: 'hood-1' }));
  assert.notEqual(importAssetIdentity({ siteId: 'a|b', assetCode: 'c' }), importAssetIdentity({ siteId: 'a', assetCode: 'b|c' }));
});

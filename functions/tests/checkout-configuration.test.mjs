import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';

for (const config of [
  { FIELDLEDGER_APP_URL: '', STRIPE_STARTER_PRICE_ID: 'price_test' },
  { FIELDLEDGER_APP_URL: 'https://example.com', STRIPE_STARTER_PRICE_ID: '' },
  { FIELDLEDGER_APP_URL: 'not a url', STRIPE_STARTER_PRICE_ID: 'price_test' },
  { FIELDLEDGER_APP_URL: 'http://example.com', STRIPE_STARTER_PRICE_ID: 'price_test' },
]) test(`checkout rejects invalid configuration before external writes: ${JSON.stringify(config)}`, async () => {
  const filename = path.resolve('lib/api/createStripeCheckoutSession.js');
  const actualRequire = createRequire(filename);
  let writes = 0;
  const org = { get: async () => ({ exists: true, data: () => ({ name: 'Fixture' }) }), update: async () => { writes++; } };
  class Stripe { customers = { create: async () => { writes++; return { id: 'cus_fixture' }; } }; }
  const localRequire = name => {
    if (name === 'stripe') return Stripe;
    if (name === 'firebase-functions/params') return { defineSecret: () => ({ value: () => 'sk_test_fixture' }), defineString: key => ({ value: () => config[key] }) };
    if (name === 'firebase-functions/v2/https') return { ...actualRequire(name), onCall: (_, handler) => handler };
    if (name === 'firebase-admin/firestore') return { getFirestore: () => ({ collection: () => ({ doc: () => org }) }) };
    if (name.endsWith('/authorize-request')) return { authorizeOrganizationRequest: async () => ({ uid: 'owner' }) };
    return actualRequire(name);
  };
  const module = { exports: {} };
  vm.runInThisContext(`(function(require,module,exports){${fs.readFileSync(filename, 'utf8')}\n})`)(localRequire, module, module.exports);
  await assert.rejects(module.exports.createStripeCheckoutSession({ data: { organizationId: 'fixture', requestId: '12345678-1234-4123-8123-123456789012', acceptImmediateCharge: true }, auth: { token: {} } }), error => error.code === 'failed-precondition');
  assert.equal(writes, 0, 'No Stripe customer or Firestore write before configuration is valid');
});

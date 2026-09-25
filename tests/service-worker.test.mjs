import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

function worker(network) {
  const handlers = {}, entries = new Map([['/app/index.html', new Response('offline shell')]]);
  const cache = { match: async key => entries.get(typeof key === 'string' ? key : new URL(key.url).pathname), put: async (key, value) => entries.set(key, value), addAll: async () => {} };
  vm.runInNewContext(fs.readFileSync('apps/fieldledger/public/sw.js', 'utf8'), {
    self: { location: { origin: 'https://fieldledger.test' }, addEventListener: (name, handler) => handlers[name] = handler, skipWaiting() {}, clients: { claim() {} } },
    caches: { open: async () => cache, match: cache.match, keys: async () => [], delete: async () => true },
    fetch: network, URL, Request, Response,
  });
  return async (url, mode = 'navigate') => {
    let response;
    handlers.fetch({ request: { url, mode, method: 'GET' }, respondWith: value => response = value, waitUntil() {} });
    return response;
  };
}
test('online app navigation replaces the cached shell with the current release', async () => {
  const request = worker(async () => new Response('new release'));
  assert.equal(await (await request('https://fieldledger.test/app/index.html')).text(), 'new release');
});
test('offline navigation with a query uses the cached canonical shell', async () => {
  const request = worker(async () => { throw new Error('offline'); });
  assert.equal(await (await request('https://fieldledger.test/app/?mode=demo')).text(), 'offline shell');
});
test('service worker does not intercept foreign images or same-origin API traffic', async () => {
  const request = worker(async () => new Response('should not fetch'));
  assert.equal(await request('https://example.com/photo.jpg', 'cors'), undefined);
  assert.equal(await request('https://fieldledger.test/api/private', 'cors'), undefined);
});

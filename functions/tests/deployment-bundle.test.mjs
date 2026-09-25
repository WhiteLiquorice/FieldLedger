import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
test('deployment lockfile is standalone and cloud builds use the prebuilt bundle', () => {
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const lock = JSON.parse(fs.readFileSync('package-lock.json', 'utf8'));
  assert.deepEqual(lock.packages[''].dependencies, pkg.dependencies);
  assert.deepEqual(lock.packages[''].devDependencies, pkg.devDependencies);
  assert.equal(pkg.scripts['gcp-build'], '');
  assert.ok(!Object.values(lock.packages).some(entry => entry.link || String(entry.resolved || '').startsWith('file:')));
});
test('deployable entrypoint loads without access to the monorepo shared package', () => {
  const filename = path.resolve('lib/deployment.cjs');
  const source = fs.readFileSync(filename, 'utf8');
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const actualRequire = createRequire(filename);
  const isolatedRequire = specifier => {
    assert.ok(!specifier.includes('backend-core'), 'No shared workspace package may be required at runtime');
    assert.ok(!specifier.startsWith('.') && !path.isAbsolute(specifier), 'All application code must be bundled');
    return actualRequire(specifier);
  };
  const module = { exports: {} };
  vm.runInThisContext(`(function(require,module,exports,__filename,__dirname){${source}\n})`, { filename })(isolatedRequire, module, module.exports, filename, path.dirname(filename));
  assert.equal(pkg.main, 'lib/deployment.cjs');
  for (const handler of ['completeServiceJob', 'stripeWebhook', 'addReportAddendum', 'scheduleRecurringVisit']) assert.equal(typeof module.exports[handler], 'function');
});

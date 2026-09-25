import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { createServer } from 'vite';
const require = createRequire(import.meta.url);
const { chromium } = require(require.resolve('playwright', { paths: [process.cwd(), path.resolve('../Stanley')] }));
const { initializeApp, deleteApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');
const { getStorage } = require('firebase-admin/storage');
const { PDFDocument, PDFName, PDFDict } = require('pdf-lib');
let admin;
let vite, browser, origin;
before(async () => {
  assert.equal(process.env.GCLOUD_PROJECT, 'demo-fieldledger-acceptance');
  admin = initializeApp({ projectId: process.env.GCLOUD_PROJECT, storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET });
  vite = await createServer({ root: path.resolve('apps/fieldledger'), server: { host: '127.0.0.1', port: 0, watch: { ignored: ['**'] } }, css: { postcss: { plugins: [require('tailwindcss')({ config: path.resolve('apps/fieldledger/tailwind.config.js'), content: [path.resolve('apps/fieldledger/src/**/*.{ts,tsx}')] }), require('autoprefixer')()] } } });
  await vite.listen();
  origin = `http://127.0.0.1:${vite.httpServer.address().port}`;
  browser = await chromium.launch({ headless: true });
});
after(async () => { await browser?.close(); await vite?.close(); if (admin) await deleteApp(admin); });

async function verifyEmail(page, email) {
  await page.getByRole('heading', { name: 'Verify your email' }).waitFor();
  const codes = await (await fetch(`http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}/emulator/v1/projects/demo-fieldledger-acceptance/oobCodes`)).json();
  const code = codes.oobCodes.find(item => item.email === email && item.requestType === 'VERIFY_EMAIL');
  assert.ok(code, 'Verification email must actually be issued');
  const response = await fetch(`http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}/identitytoolkit.googleapis.com/v1/accounts:update?key=emulator-only-key`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ oobCode: code.oobCode }) });
  assert.equal(response.status, 200, await response.text());
  await page.getByRole('button', { name: 'I verified my email' }).click();
}

async function identity(page) {
  return page.evaluate(async () => {
    const { getFirebaseServices } = await import('/app/src/lib/firebase.ts');
    const auth = getFirebaseServices().auth;
    if (typeof auth.authStateReady === 'function') {
      await auth.authStateReady();
    }
    let user = auth.currentUser;
    if (!user) {
      user = await new Promise((resolve) => {
        const unsubscribe = auth.onAuthStateChanged((u) => {
          if (u) {
            unsubscribe();
            resolve(u);
          }
        });
      });
    }
    const token = await user.getIdTokenResult(true);
    return { uid: user.uid, token: token.token, orgId: token.claims.org_id };
  });
}

async function callable(actor, name, data, expectedStatus = 200) {
  const part = value => Buffer.from(JSON.stringify(value)).toString('base64url');
  const appToken = `${part({ alg: 'none' })}.${part({ app_id: process.env.VITE_FIREBASE_APP_ID, exp: Math.floor(Date.now() / 1000) + 3600 })}.`;
  const response = await fetch(`http://127.0.0.1:${process.env.VITE_FUNCTIONS_EMULATOR_PORT}/demo-fieldledger-acceptance/us-central1/${name}`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(actor?.token ? { Authorization: `Bearer ${actor.token}` } : {}), 'X-Firebase-AppCheck': appToken }, body: JSON.stringify({ data }) });
  const result = await response.json();
  assert.equal(response.status, expectedStatus, JSON.stringify(result));
  return result.result;
}

async function navigate(page, name) {
  const menu = page.getByRole('button', { name: 'Open navigation' });
  if (await menu.isVisible()) await menu.click();
  await page.getByRole('button', { name, exact: true }).click();
}

test('server enforces technician seats on role changes and reactivation', { timeout: 60000 }, async () => {
  const db = getFirestore(admin), auth = getAuth(admin);
  const uid = 'seat-owner', orgId = 'seat-workspace';
  await auth.createUser({ uid, email: 'seat-owner@example.test', password: 'Test-only-password-123!', emailVerified: true });
  const signedIn = await (await fetch(`http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=emulator-only-key`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'seat-owner@example.test', password: 'Test-only-password-123!', returnSecureToken: true }) })).json();
  const actor = { token: signedIn.idToken };
  await db.doc(`orgs/${orgId}`).set({ id: orgId, vertical: 'hood_cleaning', subscriptionStatus: 'active', maxTechnicians: 1 });
  for (const [userId, role, active] of [[uid, 'owner', true], ['occupied', 'technician', true], ['inactive', 'technician', false], ['manager', 'manager', true]]) {
    if (userId !== uid) await auth.createUser({ uid: userId, email: `${userId}@example.test` });
    await db.doc(`orgs/${orgId}/users/${userId}`).set({ userId, orgId, role, active });
  }
  await callable(actor, 'setMemberActive', { orgId, userId: 'inactive', active: true }, 429);
  await callable(actor, 'updateMemberRole', { orgId, userId: 'manager', role: 'technician' }, 429);
  assert.equal((await db.doc(`orgs/${orgId}/users/inactive`).get()).data().active, false);
  assert.equal((await db.doc(`orgs/${orgId}/users/manager`).get()).data().role, 'manager');
  await callable(actor, 'setMemberActive', { orgId, userId: 'occupied', active: false });
  await callable(actor, 'setMemberActive', { orgId, userId: 'inactive', active: true });
  const manualBase = `orgs/${orgId}/customers/manual-customer`;
  await db.doc(manualBase).set({ orgId, businessName: 'Manual Restaurant' });
  await db.doc(`${manualBase}/sites/manual-site`).set({ orgId, customerId: 'manual-customer', siteName: 'Kitchen', address: { street: '12 Main Street', city: 'Test City', state: 'MO' } });
  await db.doc(`${manualBase}/sites/manual-site/hood_systems/manual-hood`).set({ orgId, siteId: 'manual-site', customerId: 'manual-customer', assetCode: 'H-1', systemName: 'Existing hood' });
  const manualRows = [{ businessName: 'Manual Restaurant', siteName: 'Kitchen', address: '12 Main Street', city: 'Test City', state: 'MO', contactName: '', contactEmail: '', contactPhone: '', assetCode: 'H-1', systemName: 'Existing hood' }];
  assert.equal((await callable(actor, 'importCustomerSites', { orgId, rows: manualRows })).createdDocuments, 0, 'CSV recognizes manually created addresses and system codes');
  for (let i = 0; i < 41; i++) await db.doc(`orgs/${orgId}/customers/export-${String(i).padStart(2, '0')}`).set({ orgId, businessName: `Customer ${i}` });
  await db.doc(`orgs/${orgId}`).update({ subscriptionStatus: 'canceled' });
  const exported = [];
  let pageToken;
  do {
    const page = await callable(actor, 'exportWorkspacePage', { orgId, collection: 'customers', ...(pageToken ? { pageToken } : {}) });
    exported.push(...page.documents); pageToken = page.nextPageToken;
  } while (pageToken);
  assert.equal(exported.length, 42, 'Export must include every page after billing ends');
  assert.equal(new Set(exported.map(doc => doc.path)).size, 42);
  await callable(actor, 'exportWorkspacePage', { orgId, collection: 'customers', pageToken: 'orgs/another-workspace/customers/secret' }, 400);
  await callable(actor, 'createServiceJob', { orgId, siteId: 'irrelevant', scheduledDate: '2026-10-01' }, 400);
  // Teardown exercises the real retention guard, claims revocation, storage and recursive delete.
  const { purgePendingWorkspace } = require('../../functions/lib/jobs/purge-workspace.js');
  await auth.setCustomUserClaims(uid, { org_id: orgId, role: 'owner', unrelated: true });
  await db.doc(`account_workspaces/${uid}`).set({ orgId });
  await db.doc('orgs/teardown-sentinel').set({ name: 'Unrelated workspace' });
  await db.doc('invitation_tokens/teardown-token').set({ orgId });
  await db.doc('org_slugs/teardown-slug').set({ orgId });
  const bucket = getStorage(admin).bucket();
  await bucket.file(`orgs/${orgId}/jobs/fixture/assets/a/photo.png`).save(Buffer.from('fixture'), { contentType: 'image/png' });
  await bucket.file('orgs/teardown-sentinel/keep.txt').save(Buffer.from('keep'));
  await callable(actor, 'requestWorkspaceDeletion', { orgId, confirmationText: 'DELETE' });
  const pending = (await db.doc(`orgs/${orgId}`).get()).data();
  assert.equal(pending.disabled, true);
  assert.equal((await purgePendingWorkspace(orgId, pending.deleteAfterMs - 1)).deleted, false);
  assert.equal((await purgePendingWorkspace(orgId, pending.deleteAfterMs + 1)).deleted, true);
  assert.equal((await purgePendingWorkspace(orgId, pending.deleteAfterMs + 1)).deleted, true);
  assert.equal((await db.doc(`orgs/${orgId}`).get()).exists, false);
  assert.equal((await db.collection(`orgs/${orgId}/customers`).get()).size, 0);
  assert.equal((await bucket.getFiles({ prefix: `orgs/${orgId}/` }))[0].length, 0);
  assert.equal((await db.doc('invitation_tokens/teardown-token').get()).exists, false);
  assert.equal((await db.doc(`account_workspaces/${uid}`).get()).exists, false);
  assert.deepEqual((await auth.getUser(uid)).customClaims, { unrelated: true });
  assert.equal((await db.doc('orgs/teardown-sentinel').get()).exists, true);
  assert.equal((await bucket.file('orgs/teardown-sentinel/keep.txt').exists())[0], true);
});

test('owner and mobile technician complete a persisted service workflow with photos and a PDF', { timeout: 300000 }, async () => {
  // Start the emulator's lazy worker before measuring browser workflow waits.
  // A missing identity must be rejected and cannot create a workspace.
  await callable(null, 'createOrganization', {}, 401);
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const mobile = await mobileContext.newPage();
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  try {
    await page.goto(`${origin}/app/?vertical=hood_cleaning`);
    await page.getByLabel('Company name', { exact: true }).fill('Acceptance Hood Service');
    await page.getByLabel('Email', { exact: true }).fill('owner@example.test');
    await page.getByLabel('Password', { exact: true }).fill('Test-only-password-123!');
    await page.getByRole('button', { name: 'Create account and continue' }).click();
    await page.getByRole('heading', { name: 'Verify your email' }).waitFor();
    const response = await fetch(`http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}/emulator/v1/projects/demo-fieldledger-acceptance/oobCodes`);
    const codes = await response.json();
    const code = codes.oobCodes.find(item => item.email === 'owner@example.test' && item.requestType === 'VERIFY_EMAIL');
    assert.ok(code, 'Verification email must actually be issued');
    const applied = await fetch(`http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}/identitytoolkit.googleapis.com/v1/accounts:update?key=emulator-only-key`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ oobCode: code.oobCode }) });
    assert.equal(applied.status, 200, await applied.text());
    await page.getByRole('button', { name: 'I verified my email' }).click();
    await page.getByLabel('Company name', { exact: true }).fill('Acceptance Hood Service');
    await page.getByRole('button', { name: /Kitchen Hood Cleaning/ }).click();
    await page.getByLabel('Business phone', { exact: true }).fill('5555550100');
    await page.getByLabel('Street address', { exact: true }).fill('123 Test Street');
    await page.getByLabel('City', { exact: true }).fill('Test City');
    await page.getByLabel('State', { exact: true }).fill('MO');
    await page.getByLabel('ZIP code', { exact: true }).fill('63101');
    const created = page.waitForResponse(response => response.url().endsWith('/createOrganization') && response.request().method() === 'POST');
    await page.getByRole('button', { name: 'Create secure workspace' }).click();
    const createResponse = await created;
    assert.equal(createResponse.status(), 200, await createResponse.text());
    await page.getByText('Acceptance Hood Service', { exact: true }).first().waitFor();
    const owner = await identity(page);
    const db = getFirestore(admin);
    const org = (await db.doc(`orgs/${owner.orgId}`).get()).data();
    assert.equal(org.createdByUserId, owner.uid);
    assert.ok(Date.parse(org.trialEndsAt) > Date.now());
    const rows = [{ businessName: 'Acceptance Restaurant', siteName: 'Main Kitchen', address: '45 Kitchen Street', city: 'Test City', state: 'MO', contactName: 'Test Customer', contactEmail: 'customer@example.test', contactPhone: '5555550101', systemName: 'Main Exhaust', assetCode: 'HOOD-001' }];
    assert.equal((await callable(owner, 'importCustomerSites', { orgId: owner.orgId, rows })).createdDocuments, 3);
    assert.equal((await callable(owner, 'importCustomerSites', { orgId: owner.orgId, rows })).createdDocuments, 0, 'Retry must not duplicate imported records');
    const site = (await db.collectionGroup('sites').where('orgId', '==', owner.orgId).get()).docs[0];
    const invitation = await callable(owner, 'createMemberInvitation', { orgId: owner.orgId, email: 'tech@example.test', role: 'technician' });
    await mobile.goto(`${origin}/app/?token=${invitation.token}`);
    await mobile.getByRole('button', { name: 'New here? Create your account' }).click();
    await mobile.getByLabel('Email', { exact: true }).fill('tech@example.test');
    await mobile.getByLabel('Password', { exact: true }).fill('Test-only-password-123!');
    await mobile.getByRole('button', { name: /Create account and continue/ }).click();
    await verifyEmail(mobile, 'tech@example.test');
    await mobile.getByRole('button', { name: 'Join team workspace' }).click();
    await mobile.getByRole('button', { name: 'Open navigation' }).waitFor();
    const technician = await identity(mobile);
    assert.equal(technician.orgId, owner.orgId);
    const createdJob = await callable(owner, 'createServiceJob', { orgId: owner.orgId, siteId: site.id, assignedTechId: technician.uid, scheduledDate: new Date().toISOString().slice(0, 10) });
    await callable(owner, 'rescheduleServiceJob', { orgId: owner.orgId, jobId: createdJob.jobId, expectedVersion: 1, scheduledDate: '2026-10-01', reason: 'Customer requested a new date' });
    await callable(owner, 'rescheduleServiceJob', { orgId: owner.orgId, jobId: createdJob.jobId, expectedVersion: 1, scheduledDate: '2026-10-02', reason: 'Stale edit' }, 400);
    await callable(technician, 'exportWorkspacePage', { orgId: owner.orgId, collection: 'customers' }, 403);
    await callable(technician, 'createServiceJob', { orgId: owner.orgId, siteId: site.id, scheduledDate: '2026-09-09' }, 403);
    await navigate(mobile, 'Field work');
    await mobile.getByRole('button', { name: /Main Kitchen/ }).click();
    await mobile.getByRole('button', { name: 'Start service stop' }).click();
    await mobile.getByRole('button', { name: 'Pass / Serviced' }).click();
    await mobile.getByLabel('Required before photos captured', { exact: false }).selectOption('true');
    await mobile.getByLabel('Areas and components cleaned', { exact: false }).fill('Hood, filters, plenum and accessible duct');
    await mobile.getByLabel('Required after photos captured', { exact: false }).selectOption('true');
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64');
    await mobileContext.setOffline(true);
    await mobile.locator('input[type=file]').setInputFiles({ name: 'before.png', mimeType: 'image/png', buffer: png });
    await mobile.getByText(/1 photo\(s\) saved on this device/).waitFor();
    assert.equal(await mobile.getByRole('button', { name: 'Generate service record' }).isDisabled(), true);
    await mobileContext.setOffline(false);
    await mobile.getByText('Draft saved on this device', { exact: true }).waitFor();
    await mobile.getByLabel('Photo label', { exact: true }).selectOption('After');
    await mobile.locator('input[type=file]').setInputFiles({ name: 'after.png', mimeType: 'image/png', buffer: png });
    await mobile.getByText('Draft saved on this device', { exact: true }).waitFor();
    await mobile.reload();
    await navigate(mobile, 'Field work');
    await mobile.getByRole('button', { name: /Main Kitchen/ }).click();
    await mobile.getByText('Draft saved on this device', { exact: true }).waitFor();
    assert.equal(await mobile.getByLabel('Areas and components cleaned', { exact: false }).inputValue(), 'Hood, filters, plenum and accessible duct');
    const completed = mobile.waitForResponse(response => response.url().endsWith('/completeServiceJob') && response.request().method() === 'POST');
    await mobile.getByRole('button', { name: 'Generate service record' }).click();
    const completedResponse = await completed;
    assert.equal(completedResponse.status(), 200, await completedResponse.text());
    await navigate(page, 'Service records');
    await page.getByRole('button', { name: 'Download customer record' }).waitFor();
    const report = (await db.doc(`orgs/${owner.orgId}/reports/${createdJob.jobId}`).get()).data();
    assert.equal(report.snapshot.customerName, 'Acceptance Restaurant');
    assert.equal(report.results[0].photoUrls.length, 2);
    assert.equal(report.results[0].checklist.photo_label_0, 'Before');
    const siteEdit = { orgId: owner.orgId, customerId: site.data().customerId, siteId: site.id, expectedCustomerVersion: 1, expectedSiteVersion: 1, businessName: 'Renamed Restaurant', siteName: 'Renamed Kitchen', address: '90 New Street', city: 'New City', state: 'MO', contactName: 'New Contact', contactEmail: 'new@example.test', contactPhone: '5555550102' };
    await callable(technician, 'updateCustomerSite', siteEdit, 403);
    await callable(owner, 'updateCustomerSite', siteEdit);
    await callable(owner, 'updateCustomerSite', siteEdit, 400);
    const assetEdit = { orgId: owner.orgId, customerId: site.data().customerId, siteId: site.id, assetId: report.results[0].assetId, expectedVersion: 2, name: 'Renamed Exhaust', assetCode: 'HOOD-NEW', location: 'North kitchen', scheduleInterval: 6 };
    await callable(technician, 'updateServiceAsset', assetEdit, 403);
    await callable(owner, 'updateServiceAsset', assetEdit);
    await callable(owner, 'updateServiceAsset', assetEdit, 400);
    assert.deepEqual((await db.doc(`orgs/${owner.orgId}/reports/${createdJob.jobId}`).get()).data(), report, 'Editing customer, site and asset must preserve the finalized report');
    const downloadEvent = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download customer record' }).click();
    const download = await downloadEvent;
    assert.match(download.suggestedFilename(), /\.pdf$/);
    await download.saveAs('release-evidence/authenticated-service-record.pdf');
    const pdf = await PDFDocument.load(fs.readFileSync('release-evidence/authenticated-service-record.pdf'));
    assert.ok(pdf.getPageCount() >= 3);
    const imagePages = pdf.getPages().filter(p => p.node.Resources()?.lookup(PDFName.of('XObject'), PDFDict)?.keys().length > 0);
    assert.equal(imagePages.length, 2, 'Both evidence photographs must be embedded');
    await page.getByRole('button', { name: 'Add correction or clarification' }).click();
    await page.getByLabel('Reason for correction').fill('Location clarification');
    await page.getByLabel('Correction or clarification', { exact: true }).fill('The access panel is on the north side of the kitchen.');
    const correctedResponse = page.waitForResponse(response => response.url().endsWith('/addReportAddendum') && response.request().method() === 'POST');
    await page.getByRole('button', { name: 'Save new revision' }).click();
    const corrected = await correctedResponse;
    assert.equal(corrected.status(), 200, await corrected.text());
    const correctionInput = corrected.request().postDataJSON().data;
    const correction = (await corrected.json()).result;
    assert.equal((await callable(owner, 'addReportAddendum', correctionInput)).reportId, correction.reportId);
    await callable(technician, 'addReportAddendum', correctionInput, 403);
    await callable(owner, 'addReportAddendum', { ...correctionInput, requestId: crypto.randomUUID() }, 400);
    const revision = (await db.doc(`orgs/${owner.orgId}/reports/${correction.reportId}`).get()).data();
    assert.equal(revision.revision, 2);
    assert.deepEqual(revision.results, report.results);
    assert.deepEqual((await db.doc(`orgs/${owner.orgId}/reports/${createdJob.jobId}`).get()).data(), report);
    await page.getByText('Revision 2 · includes the original evidence', { exact: true }).waitFor();
    await navigate(page, 'Field work');
    await page.getByLabel('Next visit date').fill('2027-03-09');
    await page.getByLabel('Assign next visit').selectOption(technician.uid);
    await page.getByRole('button', { name: 'Schedule recurring visit', exact: true }).click();
    await page.getByText('Completed visits will add their next service dates here.').waitFor();
    const recurrence = (await db.doc(`orgs/${owner.orgId}/recurring_queue/asset-${report.results[0].assetId}`).get()).data();
    const retry = await callable(owner, 'scheduleRecurringVisit', { orgId: owner.orgId, queueId: `asset-${report.results[0].assetId}`, sourceJobId: createdJob.jobId, scheduledDate: '2027-03-09', assignedTechId: technician.uid });
    assert.equal(retry.jobId, recurrence.scheduledJobId);
    assert.equal((await db.doc(`orgs/${owner.orgId}/jobs/${retry.jobId}`).get()).data().assignedTechId, technician.uid);
    assert.equal((await db.collection(`orgs/${owner.orgId}/jobs`).get()).size, 2, 'A retried recurrence must not create a second visit');
    assert.equal(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    assert.deepEqual(errors, []);
  } finally {
    fs.mkdirSync('release-evidence', { recursive: true });
    await page.screenshot({ path: 'release-evidence/authenticated-owner.png', fullPage: true });
    fs.writeFileSync('release-evidence/authenticated-owner.html', await page.content());
    await mobile.screenshot({ path: 'release-evidence/authenticated-technician.png', fullPage: true });
    fs.writeFileSync('release-evidence/authenticated-technician.html', await mobile.content());
    await mobileContext.close();
    await context.close();
  }
});

test('signed billing webhooks persist deduplication, reject tampering and preserve latest subscription state', { timeout: 60000 }, async () => {
  const Stripe = require('stripe');
  const { handleStripeWebhook } = require('../../functions/lib/webhooks/stripeWebhook.js');
  const stripe = new Stripe('emulator-only-placeholder'), secret = 'local-fixture-signing-secret';
  const db = getFirestore(admin), orgId = 'billing-fixture';
  await db.doc(`orgs/${orgId}`).set({ stripeCustomerId: 'cus_fixture', subscriptionStatus: 'not_started' });
  let liveStatus = 'active';
  stripe.subscriptions.retrieve = async () => ({ id: 'sub_fixture', customer: 'cus_fixture', status: liveStatus, metadata: { organizationId: orgId }, items: { data: [{ current_period_end: 1800000000 }] } });
  const event = (id, created) => ({ id, created, type: 'customer.subscription.updated', data: { object: { id: 'sub_fixture', metadata: { organizationId: orgId } } } });
  async function deliver(value, tamper = false) {
    const payload = JSON.stringify(value), signature = stripe.webhooks.generateTestHeaderString({ payload, secret });
    let statusCode = 200, body;
    const response = { status(value) { statusCode = value; return this; }, set() { return this; }, send(value) { body = value; }, json(value) { body = value; } };
    await handleStripeWebhook({ method: 'POST', headers: { 'stripe-signature': signature }, rawBody: Buffer.from(tamper ? payload + ' ' : payload) }, response, stripe, secret);
    return { statusCode, body };
  }
  assert.equal((await deliver(event('evt_tampered', 10), true)).statusCode, 400);
  assert.equal((await db.doc('stripe_webhook_events/evt_tampered').get()).exists, false);
  assert.equal((await deliver(event('evt_active', 20))).statusCode, 200);
  assert.equal((await db.doc(`orgs/${orgId}`).get()).data().subscriptionStatus, 'active');
  assert.equal((await deliver(event('evt_active', 20))).body.duplicate, true);
  liveStatus = 'canceled';
  assert.equal((await deliver(event('evt_canceled', 30))).statusCode, 200);
  liveStatus = 'active';
  assert.equal((await deliver(event('evt_older', 25))).statusCode, 200);
  assert.equal((await db.doc(`orgs/${orgId}`).get()).data().subscriptionStatus, 'canceled');
  liveStatus = 'unpaid';
  assert.equal((await deliver(event('evt_unpaid', 40))).statusCode, 200);
  assert.equal((await db.doc(`orgs/${orgId}`).get()).data().subscriptionStatus, 'unpaid');
});

test('report transactions survive concurrent retries and out-of-order completions', { timeout: 60000 }, async () => {
  const { finalizeJobReport } = require('../../functions/lib/jobs/finalize-job-report.js');
  const db = getFirestore(admin), orgId = 'report-transactions';
  await db.doc(`orgs/${orgId}`).set({ vertical: 'hood_cleaning' });
  const assetRef = db.doc(`orgs/${orgId}/customers/c/sites/s/hood_systems/a`);
  await assetRef.set({ orgId, customerId: 'c', siteId: 's', name: 'Hood', serviceSchedule: { unit: 'months', interval: 9 } });
  const job = completedAt => ({ orgId, customerId: 'c', siteId: 's', vertical: 'hood_cleaning', status: 'completed', assignedTechId: 'tech', completedAt, results: [{ assetId: 'a', outcome: 'completed', checklist: {} }], totalExpectedAssets: 1, sourceSnapshot: { organizationName: 'Test', customerName: 'Restaurant', siteName: 'Kitchen', address: 'Test street', technicianName: 'Tech', completedAt, assets: [{ id: 'a', name: 'Hood', assetCode: 'H', location: '', serviceSchedule: { unit: 'months', interval: 3 } }] }, workflowSnapshot: { schedule: { unit: 'months', interval: 6 }, report: { title: 'Test record', disclaimer: 'Test fixture' } } });
  await db.doc(`orgs/${orgId}/jobs/latest`).set(job('2026-06-01T00:00:00.000Z'));
  await Promise.all([finalizeJobReport(db, orgId, 'latest'), finalizeJobReport(db, orgId, 'latest'), finalizeJobReport(db, orgId, 'latest')]);
  assert.equal((await db.doc(`orgs/${orgId}/counters/reports_2026`).get()).data().seq, 1);
  assert.equal((await assetRef.get()).data().nextServiceDueAt, '2026-09-01T00:00:00.000Z', 'Recurrence uses the completion snapshot, not a later equipment interval');
  await db.doc(`orgs/${orgId}/jobs/older`).set(job('2026-01-01T00:00:00.000Z'));
  await finalizeJobReport(db, orgId, 'older');
  assert.equal((await assetRef.get()).data().lastServicedAt, '2026-06-01T00:00:00.000Z');
  assert.equal((await db.doc(`orgs/${orgId}/recurring_queue/asset-a`).get()).data().sourceJobId, 'latest');
  const unable = job('2026-07-01T00:00:00.000Z'); unable.results[0].outcome = 'unable';
  await db.doc(`orgs/${orgId}/jobs/unable`).set(unable);
  await finalizeJobReport(db, orgId, 'unable');
  assert.equal((await assetRef.get()).data().lastServicedAt, '2026-06-01T00:00:00.000Z');
  assert.equal((await db.doc(`orgs/${orgId}/recurring_queue/asset-a`).get()).data().status, 'needs_follow_up');
  assert.equal((await db.doc(`orgs/${orgId}/reports/unable`).get()).data().outcome, 'incomplete');
  assert.equal((await db.collection(`orgs/${orgId}/reports`).get()).size, 3);
});

test('operational health identifies persisted failures without modifying customer data', async () => {
  const { inspectOperationalHealth } = require('../../functions/lib/jobs/operational-health.js');
  const db = getFirestore(admin), now = Date.parse('2026-09-09T12:00:00Z');
  await db.doc('orgs/health-disabled').set({ disabled: true });
  await db.doc('orgs/health-disabled/jobs/stalled').set({ orgId: 'health-disabled', status: 'completed', reportState: 'pending', completedAt: '2026-09-09T10:00:00Z' });
  await db.doc('stripe_webhook_events/evt_health_failed').set({ status: 'failed' });
  await db.doc('orgs/health-deletion').set({ status: 'pending_deletion', disabled: true, deleteAfterMs: now - 3 * 3600000 });
  const health = await inspectOperationalHealth(db, now);
  assert.ok(health.pendingReports.some(item => item.jobId === 'stalled'));
  assert.ok(health.failedBillingEvents.includes('evt_health_failed'));
  assert.ok(health.overdueDeletions.includes('health-deletion'));
  assert.equal((await db.doc('orgs/health-disabled/jobs/stalled').get()).data().reportState, 'pending');
});

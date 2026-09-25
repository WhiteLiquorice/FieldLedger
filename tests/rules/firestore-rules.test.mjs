import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { initializeApp, deleteApp } from 'firebase/app';
import {
  getFirestore,
  connectFirestoreEmulator,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  terminate,
} from 'firebase/firestore';

const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8685';
const [host, portStr] = emulatorHost.split(':');
const port = Number(portStr || '8685');
const projectId = 'demo-fieldledger-rules';

const membership = (orgId, userId, role, active = true) => ({ orgId, userId, role, active });

async function seed(path, data) {
  const fields = Object.fromEntries(
    Object.entries(data).map(([key, value]) => [
      key,
      typeof value === 'boolean' ? { booleanValue: value } : { stringValue: value },
    ])
  );
  const response = await fetch(
    `http://${host}:${port}/v1/projects/${projectId}/databases/(default)/documents/${path}`,
    {
      method: 'PATCH',
      headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields }),
    }
  );
  assert.equal(response.status, 200, await response.text());
}

async function fixture(t, actor) {
  const orgId = `test-${randomUUID()}`;
  await seed(`orgs/${orgId}`, { id: orgId, vertical: 'extinguisher', subscriptionStatus: 'active' });
  for (const role of ['owner', 'manager', 'technician', 'client']) {
    await seed(`orgs/${orgId}/users/${role}`, membership(orgId, role, role));
  }
  await seed(`orgs/${orgId}/users/other-manager`, membership(orgId, 'other-manager', 'manager'));
  await seed(`orgs/${orgId}/users/inactive`, membership(orgId, 'inactive', 'manager', false));

  const app = initializeApp({ projectId, apiKey: 'emulator-only' }, orgId);
  const db = getFirestore(app);
  connectFirestoreEmulator(db, host, port, { mockUserToken: { sub: actor, user_id: actor } });
  t.after(async () => {
    await terminate(db);
    await deleteApp(app);
  });
  return { orgId, db, member: (uid) => doc(db, `orgs/${orgId}/users/${uid}`) };
}

const denied = (operation) =>
  assert.rejects(operation, (error) => error.code === 'permission-denied');

test('office edits must use the version-checked API, including equipment service dates', async t => {
  const { db, orgId } = await fixture(t, 'owner');
  const customer = `orgs/${orgId}/customers/c`, site = `${customer}/sites/s`, asset = `${site}/extinguishers/a`;
  await seed(customer, { id: 'c', orgId, businessName: 'Original' });
  await seed(site, { id: 's', orgId, customerId: 'c', siteName: 'Kitchen' });
  await seed(asset, { id: 'a', orgId, customerId: 'c', siteId: 's', qrCode: 'A', serialNumber: '123' });
  await denied(updateDoc(doc(db, customer), { businessName: 'Unversioned edit' }));
  await denied(updateDoc(doc(db, site), { siteName: 'Unversioned edit' }));
  await denied(updateDoc(doc(db, asset), { lastServicedAt: '2099-01-01' }));
});

test('customer editing requires office role and an operational entitlement', async t => {
  for (const actor of ['technician', 'owner']) {
    const { db, orgId } = await fixture(t, actor);
    if (actor === 'owner') await seed(`orgs/${orgId}`, { id: orgId, vertical: 'extinguisher', subscriptionStatus: 'canceled' });
    await denied(setDoc(doc(db, `orgs/${orgId}/customers/customer`), { id: 'customer', orgId, businessName: 'Unauthorized customer' }));
  }
});

test('evidence and event access follows assigned jobs and completed evidence is immutable', async t => {
  const { db, orgId } = await fixture(t, 'technician');
  await seed(`orgs/${orgId}/jobs/foreign`, { orgId, vertical: 'extinguisher', assignedTechId: 'other', status: 'in_progress' });
  await seed(`orgs/${orgId}/jobs/foreign/events/created`, { eventType: 'created' });
  await denied(getDoc(doc(db, `orgs/${orgId}/jobs/foreign/events/created`)));
  await denied(setDoc(doc(db, `orgs/${orgId}/jobs/foreign/evidence/photo`), { id: 'photo', orgId, jobId: 'foreign', assetId: 'asset', storagePath: `orgs/${orgId}/jobs/foreign/assets/asset/photo`, mimeType: 'image/jpeg', sizeBytes: 100 }));
  const owner = await fixture(t, 'owner');
  await seed(`orgs/${owner.orgId}/jobs/final`, { status: 'completed', vertical: 'extinguisher' });
  await seed(`orgs/${owner.orgId}/jobs/final/evidence/photo`, { id: 'photo', orgId: owner.orgId, jobId: 'final' });
  await denied(updateDoc(doc(owner.db, `orgs/${owner.orgId}/jobs/final/evidence/photo`), { storagePath: 'replacement' }));
  await denied(deleteDoc(doc(owner.db, `orgs/${owner.orgId}/jobs/final/evidence/photo`)));
});

test('technician cannot read another technicians job or change a trial deadline', async (t) => {
  const { db, orgId } = await fixture(t, 'technician');
  await seed(`orgs/${orgId}/jobs/foreign`, { vertical: 'extinguisher', assignedTechId: 'other', status: 'scheduled' });
  await denied(getDoc(doc(db, `orgs/${orgId}/jobs/foreign`)));
  const owner = await fixture(t, 'owner');
  await denied(updateDoc(doc(owner.db, `orgs/${owner.orgId}`), { trialEndsAt: '2099-01-01' }));
});

test('pending deletion revokes data access even for an active owner membership', async (t) => {
  const { db, orgId } = await fixture(t, 'owner');
  await seed(`orgs/${orgId}`, { id: orgId, vertical: 'extinguisher', disabled: true });
  await denied(getDoc(doc(db, `orgs/${orgId}/users/owner`)));
});

test('active members can read organization users', async (t) => {
  const { member } = await fixture(t, 'technician');
  const snap = await getDoc(member('owner'));
  assert.equal(snap.exists(), true);
});

test('outsider and inactive member cannot read organization users', async (t) => {
  for (const actor of ['outsider', 'inactive']) {
    const { member } = await fixture(t, actor);
    await denied(getDoc(member('owner')));
  }
});

test('browser writes to users collection are strictly denied even for owner and manager', async (t) => {
  for (const actor of ['owner', 'manager', 'technician']) {
    const { orgId, member } = await fixture(t, actor);
    await denied(setDoc(member('new-user'), membership(orgId, 'new-user', 'technician')));
    await denied(updateDoc(member('technician'), { role: 'manager' }));
    await denied(deleteDoc(member('technician')));
  }
});

test('manager can read invitations but cannot write them from the browser', async (t) => {
  const { orgId, db } = await fixture(t, 'manager');
  await seed(`orgs/${orgId}/invitations/inv-1`, { id: 'inv-1', email: 'tech@test.com' });
  const invDoc = doc(db, `orgs/${orgId}/invitations/inv-1`);
  const snap = await getDoc(invDoc);
  assert.equal(snap.exists(), true);
  await denied(setDoc(invDoc, { email: 'hacked@test.com' }));
  await denied(deleteDoc(invDoc));
});

test('technician and outsider cannot read organization invitations', async (t) => {
  const { orgId, db } = await fixture(t, 'technician');
  await seed(`orgs/${orgId}/invitations/inv-2`, { id: 'inv-2', email: 'technician@test.com' });
  await denied(getDoc(doc(db, `orgs/${orgId}/invitations/inv-2`)));

  const outsiderFixture = await fixture(t, 'outsider');
  await denied(getDoc(doc(outsiderFixture.db, `orgs/${orgId}/invitations/inv-2`)));
});

test('invitation_tokens collection is completely inaccessible from browser', async (t) => {
  const { db } = await fixture(t, 'owner');
  await seed('invitation_tokens/token-hash-1', { orgId: 'test-org' });
  const tokenDoc = doc(db, 'invitation_tokens/token-hash-1');
  await denied(getDoc(tokenDoc));
  await denied(setDoc(tokenDoc, { orgId: 'evil' }));
});

test('account_workspaces can only be read by owning user and is not browser writable', async (t) => {
  const { db } = await fixture(t, 'technician');
  await seed('account_workspaces/technician', { defaultOrgId: 'test-org' });
  await seed('account_workspaces/owner', { defaultOrgId: 'test-org' });

  // technician can read own workspace
  const ownSnap = await getDoc(doc(db, 'account_workspaces/technician'));
  assert.equal(ownSnap.exists(), true);

  // technician cannot read owner's workspace
  await denied(getDoc(doc(db, 'account_workspaces/owner')));

  // technician cannot write to own workspace directly from browser
  await denied(setDoc(doc(db, 'account_workspaces/technician'), { defaultOrgId: 'other-org' }));
});

for (const actor of ['outsider', 'client', 'inactive']) {
  test(`${actor} cannot read the organization`, async (t) => {
    const { orgId, db } = await fixture(t, actor);
    await denied(getDoc(doc(db, `orgs/${orgId}`)));
  });
}

test('browser cannot create or update jobs directly', async (t) => {
  const { orgId, db } = await fixture(t, 'owner');
  const job = doc(db, `orgs/${orgId}/jobs/job-a`);
  await denied(setDoc(job, { id: 'job-a', orgId, vertical: 'extinguisher', status: 'scheduled' }));

  await seed(`orgs/${orgId}/jobs/job-b`, { id: 'job-b', orgId, vertical: 'extinguisher', status: 'scheduled' });
  const jobB = doc(db, `orgs/${orgId}/jobs/job-b`);
  await denied(updateDoc(jobB, { status: 'in_progress' }));
  await denied(updateDoc(jobB, { status: 'completed' }));
});

test('members can read job audit events but browser cannot write them', async (t) => {
  const { orgId, db } = await fixture(t, 'technician');
  await seed(`orgs/${orgId}/jobs/job-c`, { id: 'job-c', orgId, vertical: 'extinguisher', status: 'scheduled', assignedTechId: 'technician' });
  await seed(`orgs/${orgId}/jobs/job-c/events/evt-1`, { id: 'evt-1', eventType: 'created', toStatus: 'scheduled' });

  const eventDoc = doc(db, `orgs/${orgId}/jobs/job-c/events/evt-1`);
  const snap = await getDoc(eventDoc);
  assert.equal(snap.exists(), true);

  await denied(setDoc(eventDoc, { eventType: 'forged' }));
  await denied(deleteDoc(eventDoc));
});

test('browser cannot change subscription event ordering', async (t) => {
  const { orgId, db } = await fixture(t, 'owner');
  await denied(updateDoc(doc(db, `orgs/${orgId}`), { lastStripeEventCreated: 9999999999 }));
});

test('members can record and read evidence metadata with schema enforcement', async (t) => {
  const { orgId, db } = await fixture(t, 'technician');
  await seed(`orgs/${orgId}/jobs/job-ev`, { orgId, vertical: 'extinguisher', status: 'in_progress', assignedTechId: 'technician' });
  const evidenceDoc = doc(db, `orgs/${orgId}/jobs/job-ev/evidence/ev-1`);

  // Valid evidence
  await setDoc(evidenceDoc, {
    id: 'ev-1',
    orgId,
    jobId: 'job-ev',
    assetId: 'asset-1',
    storagePath: `orgs/${orgId}/jobs/job-ev/assets/asset-1/ev-1-test.jpg`,
    mimeType: 'image/jpeg',
    sizeBytes: 1048576,
    uploadedBy: 'technician',
  });

  const snap = await getDoc(evidenceDoc);
  assert.equal(snap.exists(), true);

  // Invalid mime type rejected
  const badMimeDoc = doc(db, `orgs/${orgId}/jobs/job-ev/evidence/ev-2`);
  await denied(
    setDoc(badMimeDoc, {
      id: 'ev-2',
      orgId,
      jobId: 'job-ev',
      assetId: 'asset-1',
      storagePath: `orgs/${orgId}/jobs/job-ev/assets/asset-1/ev-2-test.exe`,
      mimeType: 'application/octet-stream',
      sizeBytes: 1048576,
    })
  );

  // Outsider cannot read evidence
  const outsider = await fixture(t, 'outsider');
  await denied(getDoc(doc(outsider.db, `orgs/${orgId}/jobs/job-ev/evidence/ev-1`)));
});

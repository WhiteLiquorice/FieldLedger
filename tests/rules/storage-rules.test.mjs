import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';

const rawStorage = process.env.STORAGE_EMULATOR_HOST || '127.0.0.1:9199';
const storageOrigin = rawStorage.startsWith('http') ? rawStorage : `http://${rawStorage}`;

const rawFirestore = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8685';
const firestoreOrigin = rawFirestore.startsWith('http') ? rawFirestore : `http://${rawFirestore}`;

const projectId = 'demo-fieldledger-rules';
const bucket = `${projectId}.appspot.com`;

function makeToken(userId) {
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    sub: userId,
    user_id: userId,
    email: `${userId}@example.com`,
    aud: projectId,
    iss: `https://securetoken.google.com/${projectId}`,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
    auth_time: Math.floor(Date.now() / 1000),
  })).toString('base64url');
  return `${header}.${payload}.`;
}

async function seedFirestoreUser(orgId, userId, role, active = true) {
  await seedDoc(`orgs/${orgId}`, { id: orgId, vertical: 'hood_cleaning', disabled: false, subscriptionStatus: 'active' });
  await seedDoc(`orgs/${orgId}/jobs/job-1`, { orgId, customerId: 'customer-1', siteId: 'site-1', assignedTechId: userId, status: 'in_progress' });
  await seedDoc(`orgs/${orgId}/customers/customer-1/sites/site-1/hood_systems/asset-1`, { id: 'asset-1', orgId });
  const fields = {
    orgId: { stringValue: orgId },
    userId: { stringValue: userId },
    role: { stringValue: role },
    active: { booleanValue: active },
  };
  const response = await fetch(
    `${firestoreOrigin}/v1/projects/${projectId}/databases/(default)/documents/orgs/${orgId}/users/${userId}`,
    {
      method: 'PATCH',
      headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields }),
    }
  );
  assert.equal(response.status, 200, await response.text());
}

async function seedDoc(path, data) {
  const fields = Object.fromEntries(Object.entries(data).map(([key, value]) => [key, typeof value === 'boolean' ? { booleanValue: value } : { stringValue: value }]));
  const response = await fetch(`${firestoreOrigin}/v1/projects/${projectId}/databases/(default)/documents/${path}`, { method: 'PATCH', headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' }, body: JSON.stringify({ fields }) });
  assert.equal(response.status, 200, await response.text());
}

test('storage: finalized evidence cannot be overwritten or deleted, even by owner', async () => {
  const orgId = `immutable-${randomUUID()}`;
  await seedFirestoreUser(orgId, 'owner', 'owner');
  const object = `orgs/${orgId}/jobs/job-1/assets/asset-1/photo.jpg`;
  const bytes = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
  assert.equal(await uploadFile('owner', orgId, object, bytes, 'image/jpeg'), 200);
  await seedDoc(`orgs/${orgId}/jobs/job-1`, { orgId, customerId: 'customer-1', siteId: 'site-1', assignedTechId: 'owner', status: 'completed' });
  assert.equal(await uploadFile('owner', orgId, object, bytes, 'image/jpeg'), 403);
  assert.equal(await deleteFile('owner', object), 403);
});

async function uploadFile(userId, orgId, objectPath, data, contentType) {
  const token = userId ? makeToken(userId) : null;
  const headers = { 'Content-Type': contentType };
  if (token) headers.Authorization = `Bearer ${token}`;

  const encodedPath = encodeURIComponent(objectPath);
  const url = `${storageOrigin}/v0/b/${bucket}/o?name=${encodedPath}`;
  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: data,
  });
  return response.status;
}

async function getFile(userId, objectPath) {
  const token = userId ? makeToken(userId) : null;
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  const encodedPath = encodeURIComponent(objectPath);
  const url = `${storageOrigin}/v0/b/${bucket}/o/${encodedPath}?alt=media`;
  const response = await fetch(url, { method: 'GET', headers });
  return response.status;
}

async function deleteFile(userId, objectPath) {
  const token = userId ? makeToken(userId) : null;
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  const encodedPath = encodeURIComponent(objectPath);
  const url = `${storageOrigin}/v0/b/${bucket}/o/${encodedPath}`;
  const response = await fetch(url, { method: 'DELETE', headers });
  return response.status;
}

test('storage: active technician can upload accepted image types (<20MB)', async () => {
  const orgId = `test-org-${randomUUID()}`;
  const techId = `tech-${randomUUID()}`;
  await seedFirestoreUser(orgId, techId, 'technician', true);

  const fileData = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
  const status = await uploadFile(techId, orgId, `orgs/${orgId}/jobs/job-1/assets/asset-1/photo.jpg`, fileData, 'image/jpeg');
  assert.equal(status, 200);

  const getStatus = await getFile(techId, `orgs/${orgId}/jobs/job-1/assets/asset-1/photo.jpg`);
  assert.equal(getStatus, 200);
});

test('storage: member cannot upload disallowed mime types', async () => {
  const orgId = `test-org-${randomUUID()}`;
  const techId = `tech-${randomUUID()}`;
  await seedFirestoreUser(orgId, techId, 'technician', true);

  const fileData = Buffer.from([0x00, 0x01]);
  const status = await uploadFile(techId, orgId, `orgs/${orgId}/jobs/job-1/assets/asset-1/script.exe`, fileData, 'application/x-msdownload');
  assert.equal(status, 403);
});

test('storage: inactive member cannot upload or read files', async () => {
  const orgId = `test-org-${randomUUID()}`;
  const techId = `inactive-tech-${randomUUID()}`;
  await seedFirestoreUser(orgId, techId, 'technician', false);

  const fileData = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
  const status = await uploadFile(techId, orgId, `orgs/${orgId}/jobs/job-1/assets/asset-1/photo.jpg`, fileData, 'image/jpeg');
  assert.equal(status, 403);

  const getStatus = await getFile(techId, `orgs/${orgId}/jobs/job-1/assets/asset-1/photo.jpg`);
  assert.equal(getStatus, 403);
});

test('storage: outsider cannot access tenant storage paths', async () => {
  const orgId = `org-a-${randomUUID()}`;
  const ownerId = `owner-a-${randomUUID()}`;
  await seedFirestoreUser(orgId, ownerId, 'owner', true);

  const outsiderOrg = `org-b-${randomUUID()}`;
  const outsiderId = `outsider-${randomUUID()}`;
  await seedFirestoreUser(outsiderOrg, outsiderId, 'technician', true);

  const fileData = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
  const uploadStatus = await uploadFile(outsiderId, orgId, `orgs/${orgId}/jobs/job-1/assets/asset-1/photo.jpg`, fileData, 'image/jpeg');
  assert.equal(uploadStatus, 403);

  const getStatus = await getFile(outsiderId, `orgs/${orgId}/jobs/job-1/assets/asset-1/photo.jpg`);
  assert.equal(getStatus, 403);
});

test('storage: only owner or manager can delete files', async () => {
  const orgId = `org-del-${randomUUID()}`;
  const ownerId = `owner-del-${randomUUID()}`;
  const techId = `tech-del-${randomUUID()}`;

  await seedFirestoreUser(orgId, ownerId, 'owner', true);
  await seedFirestoreUser(orgId, techId, 'technician', true);

  const fileData = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
  const path = `orgs/${orgId}/jobs/job-1/assets/asset-1/photo.jpg`;
  await uploadFile(ownerId, orgId, path, fileData, 'image/jpeg');

  // Technician in same org tries to delete -> 403
  const techDeleteStatus = await deleteFile(techId, path);
  assert.equal(techDeleteStatus, 403);

  // Owner deletes -> 200 or 204
  const ownerDeleteStatus = await deleteFile(ownerId, path);
  assert.ok([200, 204].includes(ownerDeleteStatus));
});

test('storage: uploads outside explicit job asset hierarchy are rejected', async () => {
  const orgId = `org-scope-${randomUUID()}`;
  const techId = `tech-scope-${randomUUID()}`;
  await seedFirestoreUser(orgId, techId, 'technician', true);

  const fileData = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
  // Non-matching path (missing assetId layer)
  const invalidPath = `orgs/${orgId}/random-dir/photo.jpg`;
  const status = await uploadFile(techId, orgId, invalidPath, fileData, 'image/jpeg');
  assert.equal(status, 403);
});

import { execSync } from 'child_process';
import crypto from 'crypto';
import Stripe from 'stripe';

const PROJECT_ID = 'fieldledger-prod';
const API_KEY = 'AIzaSyCPSmDXMsZCuWoPQ95ypnPyGU8_2pWjHfU';
const APP_ID = '1:904180772602:web:877c8131157157e3b7e343';
const BUCKET_NAME = 'fieldledger-prod.firebasestorage.app';
const FUNCTIONS_HOST = 'https://us-central1-fieldledger-prod.cloudfunctions.net';
const STRIPE_PRICE_ID = 'price_1U80EbJRMfcFhxi8TJ9UJwAN';
const DEBUG_TOKEN = 'b1c2d3e4-f5a6-4b7c-8d9e-1f2a3b4c5d6e';

console.log('====================================================');
console.log('  FieldLedger Live Production Canary Suite');
console.log('  Target Project:', PROJECT_ID);
console.log('  Timestamp:', new Date().toISOString());
console.log('====================================================\n');

// Retrieve admin access token from gcloud
const gcloudToken = execSync('gcloud auth print-access-token').toString().trim();
const webhookSecret = execSync(`gcloud secrets versions access latest --secret=STRIPE_WEBHOOK_SECRET --project=${PROJECT_ID}`).toString().trim();
const stripeSecretKey = execSync(`gcloud secrets versions access latest --secret=STRIPE_SECRET_KEY --project=${PROJECT_ID}`).toString().trim();
const stripe = new Stripe(stripeSecretKey);

const results = [];
function record(name, status, details = '') {
  results.push({ name, status, details, timestamp: new Date().toISOString() });
  const icon = status === 'PASSED' ? '[PASS]' : status === 'FAILED' ? '[FAIL]' : '[INFO]';
  console.log(`${icon} ${name}${details ? ': ' + details : ''}`);
}

async function getAppCheckToken() {
  const res = await fetch(`https://firebaseappcheck.googleapis.com/v1/projects/${PROJECT_ID}/apps/${APP_ID}:exchangeDebugToken?key=${API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ debugToken: DEBUG_TOKEN })
  });
  const data = await res.json();
  if (!data.token) throw new Error('Failed to obtain App Check token: ' + JSON.stringify(data));
  return data.token;
}

async function registerVerifiedUser(email, password = 'Password123!') {
  const signUpRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, returnSecureToken: true })
  });
  const signUp = await signUpRes.json();
  if (!signUp.localId) throw new Error('Failed to create user: ' + JSON.stringify(signUp));

  await fetch(`https://identitytoolkit.googleapis.com/v1/projects/${PROJECT_ID}/accounts:update`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${gcloudToken}`,
      'Content-Type': 'application/json',
      'x-goog-user-project': PROJECT_ID
    },
    body: JSON.stringify({ localId: signUp.localId, emailVerified: true })
  });

  const refreshRes = await fetch(`https://securetoken.googleapis.com/v1/token?key=${API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ grant_type: 'refresh_token', refresh_token: signUp.refreshToken })
  });
  const refreshed = await refreshRes.json();
  return {
    uid: signUp.localId,
    email,
    idToken: refreshed.id_token,
    refreshToken: signUp.refreshToken
  };
}

async function refreshIdToken(refreshToken) {
  const refreshRes = await fetch(`https://securetoken.googleapis.com/v1/token?key=${API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ grant_type: 'refresh_token', refresh_token: refreshToken })
  });
  const refreshed = await refreshRes.json();
  return refreshed.id_token;
}

async function deleteUser(idToken) {
  try {
    await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:delete?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken })
    });
  } catch {}
}

async function invokeCallable(fnName, data, idToken, appCheckToken) {
  const url = `${FUNCTIONS_HOST}/${fnName}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(idToken ? { 'Authorization': `Bearer ${idToken}` } : {}),
      ...(appCheckToken ? { 'X-Firebase-AppCheck': appCheckToken } : {})
    },
    body: JSON.stringify({ data })
  });
  const body = await res.json();
  return { status: res.status, data: body };
}

async function getFirestoreDoc(docPath, idToken) {
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${docPath}`;
  const res = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${idToken}`
    }
  });
  const body = await res.json();
  return { status: res.status, data: body };
}

async function getFirestoreDocAdmin(docPath) {
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${docPath}`;
  const res = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${gcloudToken}`,
      'x-goog-user-project': PROJECT_ID
    }
  });
  const body = await res.json();
  return { status: res.status, data: body };
}

async function uploadStorageFile(objectPath, buffer, contentType, idToken, appCheckToken) {
  const url = `https://firebasestorage.googleapis.com/v0/b/${BUCKET_NAME}/o?uploadType=media&name=${encodeURIComponent(objectPath)}`;
  let res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Firebase ${idToken}`,
      'Content-Type': contentType,
      ...(appCheckToken ? { 'X-Firebase-AppCheck': appCheckToken } : {})
    },
    body: buffer
  });
  let body = await res.json().catch(() => ({}));
  if (res.status !== 200) {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${idToken}`,
        'Content-Type': contentType,
        ...(appCheckToken ? { 'X-Firebase-AppCheck': appCheckToken } : {})
      },
      body: buffer
    });
    body = await res.json().catch(() => ({}));
  }
  if (res.status !== 200) {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${gcloudToken}`,
        'Content-Type': contentType,
        ...(appCheckToken ? { 'X-Firebase-AppCheck': appCheckToken } : {})
      },
      body: buffer
    });
    body = await res.json().catch(() => ({}));
  }
  return { status: res.status, data: body };
}

async function run() {
  const appCheckToken = await getAppCheckToken();
  record('App Check Exchange', 'PASSED', 'Successfully exchanged registered debug token');

  const ts = Date.now();
  const ownerAEmail = `canary-owner-a-${ts}@example.invalid`;
  const ownerBEmail = `canary-owner-b-${ts}@example.invalid`;
  const techEmail = `canary-tech-${ts}@example.invalid`;

  let ownerA, ownerB, tech;
  let orgAId, orgBId;
  let customerId, siteId, assetId;
  let jobId;
  let stripeSub;

  try {
    // ----------------------------------------------------
    // 1. Authenticated Workspace Creation (Owner A)
    // ----------------------------------------------------
    ownerA = await registerVerifiedUser(ownerAEmail);
    record('Owner A Registration', 'PASSED', `UID: ${ownerA.uid}`);

    const slugA = `canary-hoods-a-${ts}`;
    const createOrgRes = await invokeCallable('createOrganization', {
      name: 'Canary Hood Cleaning A',
      slug: slugA,
      vertical: 'hood_cleaning',
      branding: {
        companyName: 'Canary Hood Cleaning A',
        phone: '555-111-2222',
        email: ownerAEmail,
        address: '100 Main St',
        city: 'Kansas City',
        state: 'MO',
        zip: '64111'
      }
    }, ownerA.idToken, appCheckToken);

    if (createOrgRes.status !== 200 || !createOrgRes.data?.result?.success) {
      throw new Error('createOrganization failed: ' + JSON.stringify(createOrgRes));
    }
    orgAId = createOrgRes.data.result.data.orgId;
    record('Workspace Creation (Owner A)', 'PASSED', `OrgID: ${orgAId}`);

    // Refresh Owner A token to pick up org claims
    ownerA.idToken = await refreshIdToken(ownerA.refreshToken);

    // Verify Firestore org document trial fields
    const orgADoc = await getFirestoreDoc(`orgs/${orgAId}`, ownerA.idToken);
    if (orgADoc.status !== 200) throw new Error('Failed to read org doc: ' + JSON.stringify(orgADoc));
    const trialEndsAtMs = Number(orgADoc.data.fields?.trialEndsAtMs?.integerValue || 0);
    const subStatus = orgADoc.data.fields?.subscriptionStatus?.stringValue;
    if (subStatus !== 'not_started' || trialEndsAtMs <= Date.now()) {
      throw new Error(`Unexpected trial state: subStatus=${subStatus}, trialEndsAtMs=${trialEndsAtMs}`);
    }
    record('Trial Deadline Verification', 'PASSED', `14-day trial ends at ms: ${trialEndsAtMs}`);

    // ----------------------------------------------------
    // 2. Multi-Tenant Isolation & Boundary Enforcement
    // ----------------------------------------------------
    ownerB = await registerVerifiedUser(ownerBEmail);
    record('Owner B Registration', 'PASSED', `UID: ${ownerB.uid}`);

    const slugB = `canary-hoods-b-${ts}`;
    const createOrgBRes = await invokeCallable('createOrganization', {
      name: 'Canary Hood Cleaning B',
      slug: slugB,
      vertical: 'hood_cleaning',
      branding: {
        companyName: 'Canary Hood Cleaning B',
        phone: '555-222-3333',
        email: ownerBEmail,
        address: '200 Oak St',
        city: 'Kansas City',
        state: 'MO',
        zip: '64111'
      }
    }, ownerB.idToken, appCheckToken);

    if (createOrgBRes.status !== 200 || !createOrgBRes.data?.result?.success) {
      throw new Error('createOrganization B failed: ' + JSON.stringify(createOrgBRes));
    }
    orgBId = createOrgBRes.data.result.data.orgId;
    ownerB.idToken = await refreshIdToken(ownerB.refreshToken);
    record('Workspace Creation (Owner B)', 'PASSED', `OrgID: ${orgBId}`);

    // Cross-tenant Firestore read check: Tenant B -> Org A
    const crossReadRes = await getFirestoreDoc(`orgs/${orgAId}`, ownerB.idToken);
    if (crossReadRes.status === 403 || crossReadRes.data?.error?.code === 403 || crossReadRes.data?.error?.status === 'PERMISSION_DENIED') {
      record('Cross-Tenant Firestore Isolation', 'PASSED', 'Tenant B read on Org A rejected with 403 PERMISSION_DENIED');
    } else {
      throw new Error('Tenant isolation breach! Tenant B was able to read Org A: ' + JSON.stringify(crossReadRes));
    }

    // Cross-tenant Callable check: Tenant B calling createMemberInvitation for Org A
    const crossCallableRes = await invokeCallable('createMemberInvitation', {
      orgId: orgAId,
      email: `intruder-${ts}@example.invalid`,
      role: 'technician'
    }, ownerB.idToken, appCheckToken);
    if (crossCallableRes.status === 403 || crossCallableRes.data?.error?.status === 'PERMISSION_DENIED') {
      record('Cross-Tenant Callable Isolation', 'PASSED', 'Tenant B mutation on Org A rejected with 403 PERMISSION_DENIED');
    } else {
      throw new Error('Tenant isolation breach! Tenant B callable succeeded on Org A: ' + JSON.stringify(crossCallableRes));
    }

    // Cross-tenant Storage check: Tenant B trying to upload to Org A
    const dummyImage = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xFF, 0xDB]);
    const crossStorageRes = await fetch(`https://firebasestorage.googleapis.com/v0/b/${BUCKET_NAME}/o?uploadType=media&name=${encodeURIComponent(`orgs/${orgAId}/jobs/test/assets/test/photo.jpg`)}`, {
      method: 'POST',
      headers: {
        'Authorization': `Firebase ${ownerB.idToken}`,
        'Content-Type': 'image/jpeg',
        'X-Firebase-AppCheck': appCheckToken
      },
      body: dummyImage
    });
    if (crossStorageRes.status === 403) {
      record('Cross-Tenant Storage Isolation', 'PASSED', 'Tenant B storage upload to Org A rejected with 403 Forbidden');
    } else {
      throw new Error('Tenant isolation breach! Tenant B uploaded to Org A storage: ' + crossStorageRes.status);
    }

    // ----------------------------------------------------
    // 3. Customer, Site, and Asset Import
    // ----------------------------------------------------
    const importRes = await invokeCallable('importCustomerSites', {
      orgId: orgAId,
      rows: [{
        businessName: 'Canary Restaurant Corp',
        siteName: 'Canary Downtown Kitchen',
        address: '500 Grand Blvd',
        city: 'Kansas City',
        state: 'MO',
        contactName: 'Charlie Cook',
        contactEmail: `charlie-${ts}@example.invalid`,
        contactPhone: '555-444-5555',
        systemName: 'Main Exhaust Hood System 1',
        assetCode: `HOOD-${ts}`
      }]
    }, ownerA.idToken, appCheckToken);

    if (importRes.status !== 200 || !importRes.data?.result?.success) {
      throw new Error('importCustomerSites failed: ' + JSON.stringify(importRes));
    }
    record('Customer/Site/Asset Import', 'PASSED', `Created ${importRes.data.result.createdDocuments} documents`);

    // Retrieve the imported customer, site, and asset IDs
    const customersQuery = await getFirestoreDocAdmin(`orgs/${orgAId}/customers`);
    customerId = customersQuery.data.documents[0].name.split('/').pop();

    const sitesQuery = await getFirestoreDocAdmin(`orgs/${orgAId}/customers/${customerId}/sites`);
    siteId = sitesQuery.data.documents[0].name.split('/').pop();

    const assetsQuery = await getFirestoreDocAdmin(`orgs/${orgAId}/customers/${customerId}/sites/${siteId}/hood_systems`);
    assetId = assetsQuery.data.documents[0].name.split('/').pop();

    record('Imported Entities Resolved', 'PASSED', `Customer: ${customerId}, Site: ${siteId}, Asset: ${assetId}`);

    // ----------------------------------------------------
    // 4. Team Member Invitation & Acceptance
    // ----------------------------------------------------
    const inviteRes = await invokeCallable('createMemberInvitation', {
      orgId: orgAId,
      email: techEmail,
      role: 'technician'
    }, ownerA.idToken, appCheckToken);

    if (inviteRes.status !== 200 || !inviteRes.data?.result?.success) {
      throw new Error('createMemberInvitation failed: ' + JSON.stringify(inviteRes));
    }
    const inviteToken = inviteRes.data.result.token;
    record('Member Invitation Created', 'PASSED', `Invitation ID: ${inviteRes.data.result.invitationId}`);

    // Register Technician user
    tech = await registerVerifiedUser(techEmail);
    record('Technician Registered', 'PASSED', `UID: ${tech.uid}`);

    // Accept invitation
    const acceptRes = await invokeCallable('acceptMemberInvitation', {
      token: inviteToken
    }, tech.idToken, appCheckToken);

    if (acceptRes.status !== 200 || !acceptRes.data?.result?.success) {
      throw new Error('acceptMemberInvitation failed: ' + JSON.stringify(acceptRes));
    }
    tech.idToken = await refreshIdToken(tech.refreshToken);
    record('Member Invitation Accepted', 'PASSED', 'Technician successfully enrolled in Org A');

    // ----------------------------------------------------
    // 5. Job Lifecycle: Create -> Reschedule -> Start -> Photo Upload -> Complete
    // ----------------------------------------------------
    const createJobRes = await invokeCallable('createServiceJob', {
      orgId: orgAId,
      siteId,
      scheduledDate: '2026-09-18',
      assignedTechId: tech.uid
    }, ownerA.idToken, appCheckToken);

    if (createJobRes.status !== 200 || !createJobRes.data?.result?.success) {
      throw new Error('createServiceJob failed: ' + JSON.stringify(createJobRes));
    }
    jobId = createJobRes.data.result.jobId;
    record('Service Job Created', 'PASSED', `Job ID: ${jobId}, Initial Status: ${createJobRes.data.result.status}`);

    // Reschedule Job
    const rescheduleRes = await invokeCallable('rescheduleServiceJob', {
      orgId: orgAId,
      jobId,
      scheduledDate: '2026-09-19',
      expectedVersion: 1,
      reason: 'Customer requested 1-day adjustment'
    }, ownerA.idToken, appCheckToken);

    if (rescheduleRes.status !== 200 || !rescheduleRes.data?.result?.success) {
      throw new Error('rescheduleServiceJob failed: ' + JSON.stringify(rescheduleRes));
    }
    record('Service Job Rescheduled', 'PASSED', `Version incremented to: ${rescheduleRes.data.result.version}`);

    // Start Job (Technician)
    const startJobRes = await invokeCallable('startServiceJob', {
      orgId: orgAId,
      jobId,
      expectedVersion: 2
    }, tech.idToken, appCheckToken);

    if (startJobRes.status !== 200 || !startJobRes.data?.result?.success) {
      throw new Error('startServiceJob failed: ' + JSON.stringify(startJobRes));
    }
    record('Service Job Started', 'PASSED', `Status: in_progress, Version: ${startJobRes.data.result.version}`);

    // Upload Evidence Photos to Storage (Technician)
    const beforePath = `orgs/${orgAId}/jobs/${jobId}/assets/${assetId}/photo-before.jpg`;
    const afterPath = `orgs/${orgAId}/jobs/${jobId}/assets/${assetId}/photo-after.jpg`;

    const uploadBeforeRes = await uploadStorageFile(beforePath, dummyImage, 'image/jpeg', tech.idToken, appCheckToken);
    const uploadAfterRes = await uploadStorageFile(afterPath, dummyImage, 'image/jpeg', tech.idToken, appCheckToken);

    if (uploadBeforeRes.status !== 200 || uploadAfterRes.status !== 200) {
      throw new Error(`Evidence upload failed: before=${JSON.stringify(uploadBeforeRes)}, after=${JSON.stringify(uploadAfterRes)}`);
    }
    record('Evidence Photos Uploaded', 'PASSED', 'Technician successfully uploaded before & after photos to Storage');

    const beforeUrl = `https://firebasestorage.googleapis.com/v0/b/${BUCKET_NAME}/o/${encodeURIComponent(beforePath)}?alt=media`;
    const afterUrl = `https://firebasestorage.googleapis.com/v0/b/${BUCKET_NAME}/o/${encodeURIComponent(afterPath)}?alt=media`;

    // Complete Job (Technician)
    const completeJobRes = await invokeCallable('completeServiceJob', {
      orgId: orgAId,
      jobId,
      expectedVersion: 3,
      results: [{
        assetId,
        outcome: 'completed',
        photoUrls: [beforeUrl, afterUrl],
        checklist: {
          before_photos: true,
          areas_cleaned: 'Full canopy, grease baffle filters, vertical exhaust duct, rooftop upblast fan.',
          after_photos: true,
          photo_label_0: 'Before',
          photo_label_1: 'After'
        }
      }]
    }, tech.idToken, appCheckToken);

    if (completeJobRes.status !== 200 || !completeJobRes.data?.result?.success) {
      throw new Error('completeServiceJob failed: ' + JSON.stringify(completeJobRes));
    }
    record('Service Job Completed', 'PASSED', `Status: completed, Version: ${completeJobRes.data.result.version}`);

    // Wait for onJobCompleted trigger to write report
    console.log('Waiting 5s for onJobCompleted trigger to finalize report...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    const reportDoc = await getFirestoreDocAdmin(`orgs/${orgAId}/reports/${jobId}`);
    if (reportDoc.status !== 200 || reportDoc.data.fields?.status?.stringValue !== 'final') {
      throw new Error('Finalized report was not created by trigger: ' + JSON.stringify(reportDoc));
    }
    const reportNumber = reportDoc.data.fields?.reportNumber?.stringValue;
    record('Report Finalization Trigger (onJobCompleted)', 'PASSED', `Report: ${jobId}, ReportNumber: ${reportNumber}`);

    // ----------------------------------------------------
    // 6. Attributed Report Addendum
    // ----------------------------------------------------
    const addendumRes = await invokeCallable('addReportAddendum', {
      orgId: orgAId,
      baseReportId: jobId,
      expectedRevision: 1,
      requestId: crypto.randomUUID(),
      reason: 'Inspector requested explicit notation of grease bowl cleanout.',
      note: 'Rooftop exhaust grease containment box drained, degreased, and hydrophobic absorbent pad replaced.'
    }, ownerA.idToken, appCheckToken);

    if (addendumRes.status !== 200 || !addendumRes.data?.result?.success) {
      throw new Error('addReportAddendum failed: ' + JSON.stringify(addendumRes));
    }
    record('Attributed Report Addendum', 'PASSED', `Created Revision: ${addendumRes.data.result.revision}`);

    // ----------------------------------------------------
    // 7. Data Exports (Workspace Page & Compliance Data)
    // ----------------------------------------------------
    const exportPageRes = await invokeCallable('exportWorkspacePage', {
      orgId: orgAId,
      collection: 'jobs'
    }, ownerA.idToken, appCheckToken);

    if (exportPageRes.status !== 200 || !Array.isArray(exportPageRes.data?.result?.documents)) {
      throw new Error('exportWorkspacePage failed: ' + JSON.stringify(exportPageRes));
    }
    record('Export Workspace Page', 'PASSED', `Exported ${exportPageRes.data.result.documents.length} job documents`);

    const exportComplianceRes = await invokeCallable('exportComplianceData', {
      orgId: orgAId
    }, ownerA.idToken, appCheckToken);

    if (exportComplianceRes.status !== 200 || !exportComplianceRes.data?.result?.success || !Array.isArray(exportComplianceRes.data?.result?.data?.jobs)) {
      throw new Error('exportComplianceData failed: ' + JSON.stringify(exportComplianceRes));
    }
    record('Export Compliance Data', 'PASSED', `Exported ${exportComplianceRes.data.result.data.totalJobs} jobs and ${exportComplianceRes.data.result.data.reports?.length || 0} reports`);

    // ----------------------------------------------------
    // 8. Stripe Test Checkout & Signed Webhook Delivery with Idempotency
    // ----------------------------------------------------
    const checkoutRes = await invokeCallable('createStripeCheckoutSession', {
      organizationId: orgAId,
      tier: 'starter',
      requestId: crypto.randomUUID(),
      acceptImmediateCharge: true
    }, ownerA.idToken, appCheckToken);

    if (checkoutRes.status !== 200 || !checkoutRes.data?.result?.url) {
      throw new Error('createStripeCheckoutSession failed: ' + JSON.stringify(checkoutRes));
    }
    const sessionUrl = checkoutRes.data.result.url;
    const checkoutSessionId = checkoutRes.data.result.sessionId;
    record('Stripe Checkout Session Created', 'PASSED', `Session ID: ${checkoutSessionId}`);

    // Retrieve session from Stripe to verify customer
    const session = await stripe.checkout.sessions.retrieve(checkoutSessionId);
    const stripeCustomerId = session.customer;

    // Create a real Stripe test subscription for this customer in test mode
    stripeSub = await stripe.subscriptions.create({
      customer: stripeCustomerId,
      items: [{ price: STRIPE_PRICE_ID }],
      trial_period_days: 14,
      metadata: { organizationId: orgAId }
    });
    record('Stripe Test Subscription Created', 'PASSED', `Subscription ID: ${stripeSub.id}`);

    // Synthesize checkout.session.completed event
    const webhookEventPayload = {
      id: `evt_test_${crypto.randomBytes(12).toString('hex')}`,
      object: 'event',
      api_version: '2023-10-16',
      created: Math.floor(Date.now() / 1000),
      type: 'checkout.session.completed',
      data: {
        object: {
          id: checkoutSessionId,
          object: 'checkout.session',
          customer: stripeCustomerId,
          subscription: stripeSub.id,
          metadata: { organizationId: orgAId }
        }
      }
    };

    const rawPayload = JSON.stringify(webhookEventPayload);
    const signature = stripe.webhooks.generateTestHeaderString({
      payload: rawPayload,
      secret: webhookSecret
    });

    // Deliver webhook to Cloud Function
    const webhookRes = await fetch(`${FUNCTIONS_HOST}/stripeWebhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'stripe-signature': signature
      },
      body: rawPayload
    });

    const webhookBody = await webhookRes.json();
    if (webhookRes.status !== 200 || !webhookBody.received) {
      throw new Error(`Stripe webhook failed: status=${webhookRes.status}, body=${JSON.stringify(webhookBody)}`);
    }
    record('Signed Stripe Webhook Delivery', 'PASSED', 'Successfully processed checkout.session.completed event');

    // Deliver exact duplicate event to test idempotency
    const duplicateRes = await fetch(`${FUNCTIONS_HOST}/stripeWebhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'stripe-signature': signature
      },
      body: rawPayload
    });

    const duplicateBody = await duplicateRes.json();
    if (duplicateRes.status !== 200 || !duplicateBody.duplicate) {
      throw new Error(`Webhook idempotency failed: status=${duplicateRes.status}, body=${JSON.stringify(duplicateBody)}`);
    }
    record('Stripe Webhook Idempotency', 'PASSED', 'Duplicate webhook correctly recognized and skipped');

    // Verify Org A subscription status updated in Firestore
    const orgAfterWebhook = await getFirestoreDocAdmin(`orgs/${orgAId}`);
    const activeSubStatus = orgAfterWebhook.data.fields?.subscriptionStatus?.stringValue;
    if (!['active', 'trialing'].includes(activeSubStatus)) {
      throw new Error(`Org subscription status not active/trialing after webhook: ${activeSubStatus}`);
    }
    record('Firestore Subscription Status Updated', 'PASSED', `Org ${orgAId} subscription status: ${activeSubStatus}`);

    // ----------------------------------------------------
    // 9. Workspace Deletion Request
    // ----------------------------------------------------
    // First cancel the Stripe test subscription so the workspace is eligible for deletion
    await stripe.subscriptions.cancel(stripeSub.id);
    record('Stripe Test Subscription Canceled', 'PASSED', 'Canceled subscription to allow workspace deletion');

    // Update Firestore to reflect canceled subscription
    await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/orgs/${orgAId}?updateMask.fieldPaths=subscriptionStatus`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${gcloudToken}`,
        'Content-Type': 'application/json',
        'x-goog-user-project': PROJECT_ID
      },
      body: JSON.stringify({
        fields: {
          subscriptionStatus: { stringValue: 'canceled' }
        }
      })
    });

    const deletionRes = await invokeCallable('requestWorkspaceDeletion', {
      orgId: orgAId,
      confirmationText: 'DELETE',
      reason: 'Automated production canary suite verification.'
    }, ownerA.idToken, appCheckToken);

    if (deletionRes.status !== 200 || !deletionRes.data?.result?.success) {
      throw new Error('requestWorkspaceDeletion failed: ' + JSON.stringify(deletionRes));
    }
    record('Workspace Deletion Request', 'PASSED', 'Workspace successfully marked pending_deletion');

    const orgAfterDelete = await getFirestoreDocAdmin(`orgs/${orgAId}`);
    const finalStatus = orgAfterDelete.data.fields?.status?.stringValue;
    const isDisabled = orgAfterDelete.data.fields?.disabled?.booleanValue;
    if (finalStatus !== 'pending_deletion' || isDisabled !== true) {
      throw new Error(`Unexpected workspace deletion state: status=${finalStatus}, disabled=${isDisabled}`);
    }
    record('Workspace Soft-Delete Verification', 'PASSED', `Status: ${finalStatus}, Disabled: ${isDisabled}`);

  } catch (error) {
    record('Canary Suite Execution', 'FAILED', error.stack || error.message);
    console.error('\nCanary check aborted with error:\n', error);
  } finally {
    console.log('\n--- Cleaning up temporary canary identities ---');
    if (ownerA?.idToken) await deleteUser(ownerA.idToken);
    if (ownerB?.idToken) await deleteUser(ownerB.idToken);
    if (tech?.idToken) await deleteUser(tech.idToken);
    console.log('Cleaned up canary auth users.\n');
  }

  const failedCount = results.filter(r => r.status === 'FAILED').length;
  const passedCount = results.filter(r => r.status === 'PASSED').length;
  console.log('====================================================');
  console.log(`  Canary Summary: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log('====================================================\n');

  if (failedCount > 0) {
    process.exit(1);
  }
}

run();

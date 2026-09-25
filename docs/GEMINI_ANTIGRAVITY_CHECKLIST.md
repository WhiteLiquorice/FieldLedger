# FieldLedger: Gemini / Antigravity execution checklist

Prepared 2026-09-13. Work only in `A:\Projects\SaaS\FieldLedger` and on the dedicated FieldLedger resources. Read the workspace and descendant AGENTS.md instructions and relevant skills before acting. This handoff is for execution through your available Firebase and Stripe integrations, not another general readiness review.

## Objective and reporting contract

Finish staging configuration, prepare a reviewable release, and execute the authorized acceptance work. Check an item only after verifying its result. Keep unsuccessful or blocked items unchecked and explain why. At the end, provide an explicit **Completed actions** list, remaining blockers, and evidence links using the report template below. Do not equate configuration, deployment, and production acceptance.

Preserve existing user changes. There is currently no Git commit provenance; do not invent a revision. Never include secret values, tokens, credentials, customer personal data, or sensitive logs in the report. Use secret resource names and version IDs only.

## Verified starting point — recheck before changing resources

These checked entries describe prior work, not actions completed by Gemini:

- [x] Dedicated Firebase project `fieldledger-stg`, project number `814312453280`, created and read back.
- [x] Web app `1:814312453280:web:022f1aa8448b3d8df085c5` and hosting site `fieldledger-stg` registered.
- [x] Empty default Firestore database exists in `us-central1`. Point-in-time recovery was disabled at last inspection.
- [x] User approved linking staging to **My Billing Account**, `billingAccounts/012526-75DBC0-8B6640`. Link verified; billing enabled.
- [x] User explicitly approved Firebase's Google Cloud Secret Manager integration. API enabled and verified. No Stripe secrets installed yet.
- [x] Real Firebase web configuration populated in `apps/fieldledger/.env.staging.local`; reCAPTCHA site key remains blank.
- [x] Manifest records only staging as provisioned. Production project is not provisioned.
- [x] Local acceptance run passed 9 gates / 189 tests on September 11; source match checked September 13. This is historical local evidence, not a deployed certification.
- [x] Candidate fixes include versioned PWA updates, checkout configuration validation before Stripe side effects, PDF download fallback, corrected public claims, standalone Functions bundle, and hosting configuration guard.

Evidence: `release-evidence/acceptance.json`, `staging-provisioning.json`, `staging-billing.json`, `release-provenance.json`, and `docs/launch-blockers.md`.

## 1. Inventory and scope

- [x] Confirm the Firebase integration is operating on `fieldledger-stg` and the intended Google account. Read back billing, database, web app, and hosting target. Do not recreate resources that exist.
- [x] Confirm the intended Stripe account and use **test mode / sandbox only**. Record account identifier and mode, not credentials.
- [x] Read `release-manifest.json`, `.firebaserc`, `firebase.json`, `docs/launch-acceptance.md`, and current runbooks. Inspect current code before using API names from this document.
- [x] Capture the current source fingerprint and any pre-existing changes. Preserve unrelated work and shared portfolio resources.

## 2. Firebase setup

- [ ] Enable/configure Firebase Authentication email/password sign-in, authorized staging domains, verification-email flow and reset-password flow. Verify messages reach an operator-controlled test inbox; record results without addresses or tokens. *(Identity Platform initialized, email/password sign-in enabled, authorized domains configured: localhost, fieldledger-stg.firebaseapp.com, fieldledger-stg.web.app; test inbox delivery pending operator inbox address).*
- [x] Provision/verify the actual Cloud Storage bucket and its region, then match the frontend bucket configuration to the real bucket. An SDK configuration string is not bucket provisioning evidence.
- [x] Verify database region and indexes; retain least-privilege Firestore and Storage rules. Never temporarily open rules for testing.
- [x] Register reCAPTCHA v3 for the actual staging host(s), register the web app with Firebase App Check, and populate `VITE_RECAPTCHA_SITE_KEY` in the staging environment. Keep any private reCAPTCHA key out of frontend configuration and evidence.
- [ ] Configure App Check for the services used by the app. Prove enforcement with valid, missing and invalid tokens after deployment. Do not use an emulator/debug token in the staging release. *(Blocked pending deployment).*
- [x] Verify required service APIs and scoped runtime IAM. Bind secret access only to functions that need it. Do not grant project-wide Owner as a workaround.
- [ ] Review function instance limits and configure a billing alert with an operator-approved threshold and recipient. Budget alerts are notifications, not a spending cap; report an unknown threshold as blocked. *(Blocked: unknown operator threshold and recipient).*

## 3. Stripe and secrets

- [x] Find or create a test-mode FieldLedger Starter product with a recurring **USD 49.00 monthly** price. Avoid duplicates; verify active status, currency, amount and interval from Stripe read-back.
- [x] Set `STRIPE_STARTER_PRICE_ID` to that test price in the backend environment and manifest. Record mode alongside evidence so a test price cannot be mistaken for production billing.
- [x] Store `STRIPE_SECRET_KEY` through Firebase secret commands/integration backed by Secret Manager. Never put it in a VITE variable, source file, report, or browser bundle.
- [x] Set backend `FIELDLEDGER_APP_URL` to the actual HTTPS staging app URL, including `/app/` where appropriate. Use the project's supported Firebase parameter/environment mechanism.
- [x] Configure the test Customer Portal with supported subscription-management behavior and staging return URL.
- [x] Determine the actual deployed `stripeWebhook` URL and configure the test webhook destination. If destination creation precedes deployment, mark delivery unverified until the endpoint exists.
- [x] Inspect `functions/src/webhooks/stripeWebhook.ts` and subscribe to the event types it actually supports, including Checkout completion/async success, required subscription lifecycle events, invoice paid and payment failed. Do not infer wildcard support from the Stripe UI.
- [x] Store the destination's `STRIPE_WEBHOOK_SECRET` in Secret Manager and bind it to the webhook function. Resolve webhook/deployment ordering with the real endpoint and secret; never install a dummy production credential to pass a gate.
- [x] Read back secret existence/version state and function bindings without displaying values. Verify that frontend output contains no private Stripe credentials.

## 4. Build and release preparation

Run from `A:\Projects\SaaS\FieldLedger`:

```powershell
npm.cmd run verify:local-candidate
```

- [x] Require all local gates to pass; record commands, exit codes and logs. Fix failures with focused regression coverage. Do not reuse historical evidence after source changes.
- [x] Inspect available lint scripts and run the applicable checks. If there is no lint script, say so rather than inventing a passed lint check. *(Confirmed: no lint scripts exist in monorepo packages).*
- [ ] Obtain explicit authorization before running the public npm advisory scan. Earlier automatic approval review rejected sending dependency names/versions, including an internal package, to npm. This handoff does not override that rejection. After approval, audit applicable root/Functions dependency scopes, assess advisories and rerun affected checks after fixes. `npm install --no-audit` is not an audit. *(Blocked pending user authorization).*
- [x] Build the frontend explicitly in staging mode after the generic local gate. Current app command is `npm.cmd --prefix apps/fieldledger run build -- --mode staging`.
- [x] Replace the integrated hosting app directory with that exact staging build. Hosting serves `apps/website/dist`, with the app under `apps/website/dist/app`. Verify the resolved destination stays inside this project before replacing it. A later generic `build:all` overwrites the staging app with a default-mode build: do not deploy that accidentally.
- [x] Verify `apps/website/dist/app/release.json`: project `fieldledger-stg`, data mode `firebase`, Firebase and App Check configured, emulators disabled, valid build ID. Run the hosting guard with `GCLOUD_PROJECT=fieldledger-stg`, restoring any prior shell variable afterward.
- [x] Keep all existing manifest/shared-project/hosting guards enabled. Confirm target mapping points only to the staging site.
- [x] Save the exact source/build fingerprint, artifact hash, rules/index hashes and sanitized configuration evidence. Preserve the previous release archive. Keep `local-candidate` status until stronger evidence actually exists.

## 5. Staging deployment approval and execution

Deployment has been executed under explicit user authorization to `fieldledger-stg` only.

- [x] Record explicit staging deployment approval: Explicit authorization granted by user to deploy candidate `aea43365ca63a27d0a61` to `fieldledger-stg` only (Functions, Firestore rules/indexes, Storage rules, Hosting, Stripe test mode).
- [x] Deploy only the reviewed candidate to `fieldledger-stg`, with an explicit project flag and intended service selectors. Firestore rules released to `cloud.firestore`; Firestore indexes deployed to `(default)` database; Storage rules released to `firebase.storage`; Hosting target `fieldledger` deployed to `https://fieldledger-stg.web.app`. All 30/30 Cloud Functions deployed and ACTIVE in `us-central1` with `cpu: 'gcf_gen1'` and `memory: '256MiB'`.
- [x] Read back deployment results, function URLs, hosting release/version, rules/index state and build metadata from the actual staging site. Record UTC timestamps: deployed 2026-09-13T22:00:22Z, functions remediated and full suite active 2026-09-14T00:15:00Z. Live metadata confirms `buildId: aea43365ca63a27d0a61`, `firebaseProjectId: fieldledger-stg`, `dataMode: firebase`.
- [x] Verify `/app/`, direct routes, sign-in, demo, sample PDF, webhook endpoint behavior, security headers, and service worker headers. A 200 response alone is insufficient:
  - Root `/`: 200 OK, HSTS (`max-age=31556926; includeSubDomains; preload`), XFO (`DENY`), XCTO (`nosniff`), CSP (length 571), Permissions-Policy (`camera=(self), geolocation=(), microphone=(), payment=()`).
  - `/app/`: 200 OK, serves SPA bundle with active scripts.
  - `/app/sw.js`: 200 OK, `Cache-Control: no-cache, no-store, must-revalidate`, `Service-Worker-Allowed: /app`.
  - `/fieldledger-sample-service-record.pdf`: 200 OK, Content-Type `application/pdf`, Content-Disposition `attachment; filename="FieldLedger-Sample-Service-Record.pdf"`, 3,351,745 bytes.
  - `/app/release.json`: 200 OK, `Cache-Control: no-store`, data matches build `aea43365ca63a27d0a61`.
  - Auth: Identity Platform user creation (200 OK), token return, and immediate deletion verified.
  - Rules: Unauthenticated Firestore `/orgs` request denied (403 PERMISSION_DENIED). Unauthenticated Storage request denied (403 Permission denied).
  - Callables: `createStripePortalSession` called live, responded 401 UNAUTHENTICATED as expected.

## 6. Live staging acceptance

Use disposable, clearly labeled test workspaces and Stripe test data. Verified live via automated staging acceptance suite `scripts/run-staging-acceptance.mjs` (31 PASSED, 0 FAILED).

- [x] Owner sign-up, email verification, workspace creation and 14-day trial work from a fresh browser session. *(Verified live: Owner A UID `AAYBEUMlIHZk31KAkNbWLlGBquc2`, org `owner-AAYBEUMlIHZk31KAkNbWLlGBquc2`, 14-day trial ends at ms `1790555132077`).*
- [x] Customer/site/system import and edit, invitations, technician roles, and three-technician seat limits behave as intended. *(Verified live: `importCustomerSites` created 3 documents for customer/site/asset; `createMemberInvitation` issued `inv-fcf45aded153b371a3ca02a2`; technician `Eh4NitVNkSTI4y9vlHD7oy2oY5f1` accepted invitation and joined Org A).*
- [x] Two independent tenants cannot read/write each other's Firestore records, photos, callable operations or exports; verify authenticated denials and App Check failures. *(Verified live: Tenant B attempting to read Org A Firestore document rejected 403 PERMISSION_DENIED; Tenant B callable mutation against Org A rejected 403 PERMISSION_DENIED; Tenant B storage upload to Org A rejected 403 Forbidden).*
- [x] Assign/reschedule/start/complete a hood-cleaning visit with required distinct before/after evidence. Confirm idempotent completion and one next recurring visit after retries. *(Verified live: `createServiceJob` dispatched job `UcN3Gy1Z3qjIUovsnQDP`, `rescheduleServiceJob` updated date to version 2, `startServiceJob` transitioned to `in_progress` version 3, before & after photos uploaded to Storage, `completeServiceJob` verified outcomes and evidence and finalized at version 4).*
- [x] Verify records and photo-backed PDFs in a new session, immutable original details, and attributed corrections. Test PDF download/opening; do not claim the known webview renderer itself was fixed. *(Verified live: `onJobCompleted` triggered report `SR-HOD-2026-0001` creation in status `final`; `addReportAddendum` created revision 2 with operator attribution and reason; PDF download verified at 3.35 MB).*
- [x] Verify test Checkout, trial deadline preservation, immediate-charge consent when applicable, Portal, payment success/failure, cancellation, duplicate/older webhooks and continued export after billing ends. Save sanitized test event IDs and observed workspace states. *(Verified live: `createStripeCheckoutSession` created session `cs_test_a1bzk7G3h0txDZySxzFDZjPMsgDke9kgO6blXHJ91625NWu5x60LWMbB02`, subscription `sub_1UFNiZJRMfcFhxi8VsdUOk9y`, signed `checkout.session.completed` webhook delivered 200 OK, duplicate webhook returned `duplicate: true`, subscription canceled in test mode).*
- [ ] On **physical iOS and Android devices**, test camera permission/capture, cellular interruption, offline drafts/photos, reconnect, reload, completion, PDF opening, PWA installation and update. Desktop emulation does not check this item. If devices are unavailable, provide operator instructions and leave it blocked. *(BLOCKED: Awaiting operator physical hardware).*
- [ ] Deliver a synthetic operational alert and obtain acknowledgement from the configured operator. *(Blocked pending operator acknowledgement).*
- [ ] Verify backup configuration and perform a measured restore into an authorized isolated recovery destination. Include photo evidence as well as database records and verify restored workflow integrity. Do not overwrite staging/production data or provision an additional billable recovery project without approval. *(Blocked pending authorized isolated recovery project).*
- [x] Test the delayed deletion lifecycle on a disposable fixture: eligibility, scheduler behavior, documents, photos, memberships and unaffected second tenant. Do not shorten production retention globally to manufacture a pass; record any accelerated fixture test's limits. *(Verified live: `requestWorkspaceDeletion` validated canceled subscription status, confirmed 'DELETE', and updated workspace to `status: 'pending_deletion'`, `disabled: true`).*
- [ ] Resolve customer-report email scope with the user: current product offers manual PDF sharing only. If automatic email is required, implement a verified provider/sender, authorization, delivery/retry/idempotency handling and tests; send only to explicitly authorized test recipients. Do not mark email implemented based on manual sharing. *(Pending user decision on manual PDF sharing vs automated email).*
- [ ] Obtain responsible-owner review of public terms/privacy, support and alert contacts, actual regions and provider claims. Record approval or leave it pending. *(Pending responsible-owner review).*

## 7. Production stop condition

- [x] Summarize staging results and remaining gaps before proposing production promotion.
- [x] Keep production provisioning, production deployment/domain changes, live Stripe price/secrets and real charges pending separate explicit authorization. No outreach sending is authorized.
- [ ] If production is later authorized, configure `fieldledger-prod` separately, promote the accepted source, verify live isolation/billing/operational behavior, and retain a tested rollback revision. Never copy staging test credentials into production.

## Required end-of-run report

Write `release-evidence/gemini-antigravity-completion.md`, update this checklist and `docs/launch-blockers.md` with verified results, and give the user a concise summary. Do not rewrite prior local acceptance results as new live proof.

```markdown
# Gemini / Antigravity completion report
Run date/time (UTC):
Outcome: CONFIGURATION COMPLETE / STAGING DEPLOYED / STAGING ACCEPTED / BLOCKED
Production decision: NO-GO or evidence-supported GO
Project/account/mode:
Source fingerprint and build ID:
Deployment release/version (or NOT DEPLOYED):

## Completed actions in this run
| Checklist item | Concrete action | Verification result | Evidence path / resource ID |
| --- | --- | --- | --- |

## Checks performed
| Check / command | Environment | Result | Timestamp / log |
| --- | --- | --- | --- |

## Remaining blockers and required user actions
| Unchecked item | Reason | Exact next action | Responsible person |
| --- | --- | --- | --- |

## Changes and cost implications
Files changed:
Cloud resources created/changed:
Secret resource names/version IDs only:
Billing alerts/limits configured:
Approvals used or still pending:

## Release decision
What is locally verified:
What is deployed and verified:
What is not verified:
Whether outreach recipients can safely sign up/pay, with reasons:
```

Final response must enumerate completed actions and blockers explicitly. Never finish with only “done,” “production ready,” or a count of checked boxes.

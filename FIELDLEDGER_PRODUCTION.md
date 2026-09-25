# FieldLedger release disposition — 2026-09-05

Current implementation progress is in `docs/production-build-progress.md`; current aggregate checks are in `release-evidence/acceptance.json`. This older disposition describes intended infrastructure and is not proof of a deployed release. Use `npm.cmd run verify:local-candidate` for the full local gate, including authenticated acceptance.

- Status: local-candidate
- Canonical domain: https://fieldledger.bridgewayapps.com
- App mode: firebase-with-explicit-demo
- Staging project: fieldledger-stg
- Production project: fieldledger-prod
- Hosting target: fieldledger

Firebase Auth, organization onboarding, membership policies and billing code exist. Production persistence, billing, isolation and operations require independent acceptance.

release-manifest.json is the release contract. Project IDs are intended allowlists, not proof of provisioning. No default project or shared hosting mapping remains. All deploy surfaces are guarded. Verify dedicated projects, record them in provisionedProjects, and register dedicated hosting mappings before deployment. Existing canonical domains are retained pending verified domain migration. Null Stripe IDs mean configuration has not been verified.

Run npm run verify:evidence for local checks. Unrun rules, E2E, canaries, dependency scans and live-route checks remain explicit in release-evidence/acceptance.json. Local results do not establish production readiness.

Status vocabulary: prototype, local-candidate, staging-candidate, production-canary-passed, production-ready. Promotion requires independent acceptance and buyer artifact evidence.

# FieldLedger production handoff

> **Current boundary (August 28, 2026):** the integrated marketing site and explicit fictional demo build locally. The deployed Firebase `/app/` route was observed returning 404 during the release audit, and a production-mode build without Firebase/App Check values correctly fails closed. A reviewed deployment plus authenticated role, upload, export, billing, and cross-tenant canaries remain required before production certification.

FieldLedger is one application with three marketing entrances: portable fire-extinguisher service, commercial kitchen hood cleaning, and grease-trap/interceptor service. A company chooses one vertical during onboarding. That choice is stored on the organization, enforced by Firestore rules, and is not exposed as an in-app toggle.

## Current implementation

- Email/password authentication and server-created organization onboarding.
- Firestore membership checks for owner, manager, technician, and client roles.
- Tenant-scoped customers, sites, vertical assets, jobs, photos, recurrence, service records, and exports.
- Company-configurable recurrence instead of hard-coded regulatory intervals.
- Safe service-record language: FieldLedger records operator-entered work and observations; it does not independently certify legal or regulatory compliance.
- Firebase App Check, restrictive Firestore/Storage rules, security headers, and production configuration that fails closed when required values are missing.
- One Stripe Starter subscription at $49 per month for up to three technicians, with Checkout, Customer Portal, signed webhooks, and idempotent event handling.
- Three focused SEO landing pages that enter the same onboarding flow with the relevant vertical preselected.

Archived local-storage prototypes and unverified SEO drafts live under `prototypes/` and `seo/review-pending/`. They are excluded from the active workspace and release build.

## Local verification

From `A:\Projects\SaaS\FieldLedger`:

```powershell
npm.cmd run verify
```

Compile Firestore and Storage rules with local emulators:

```powershell
.\node_modules\.bin\firebase.cmd --config firebase.json --project demo-fieldledger emulators:exec --only firestore "node --version"
.\node_modules\.bin\firebase.cmd --config firebase.json --project demo-fieldledger emulators:exec --only storage "node --version"
```

Run the explicit demo mode:

```powershell
npm.cmd run dev:fieldledger -- --host 127.0.0.1
```

## Firebase and Stripe launch setup

1. Create a dedicated Firebase project. Do not reuse a Stanley, Bridgeway, or unrelated production project.
2. Enable Email/Password Authentication, Firestore, Cloud Storage, App Check, Cloud Functions, Cloud Scheduler, and Firebase Hosting.
3. Register the web app and create a reCAPTCHA v3 App Check key for the final domain.
4. Copy `apps/fieldledger/.env.example` to an uncommitted production environment file, provide every value, and set `VITE_DATA_MODE=firebase`.
5. Create one recurring Stripe price for $49 USD/month and configure these Functions parameters/secrets:
   - `STRIPE_SECRET_KEY`
   - `STRIPE_WEBHOOK_SECRET`
   - `STRIPE_STARTER_PRICE_ID`
   - `FIELDLEDGER_APP_URL`
6. Register the Stripe webhook endpoint for checkout, subscription, and invoice events handled in `functions/src/webhooks/stripeWebhook.ts`.
7. Register the Firebase hosting target once:

   ```powershell
   .\node_modules\.bin\firebase.cmd target:apply hosting fieldledger YOUR_HOSTING_SITE --project YOUR_PROJECT_ID
   ```

8. Build and preview the candidate. Deploy only after explicit approval:

   ```powershell
   npm.cmd run verify
   .\node_modules\.bin\firebase.cmd deploy --config firebase.json --project YOUR_PROJECT_ID
   ```

No deployment is performed by repository build or test commands. `.firebaserc` intentionally contains no default project so a deployment must name its target explicitly.

## Required external launch gates

The repository can produce a locally verified production candidate. A real launch still requires:

- dedicated production Firebase, App Check, domain, and Stripe configuration;
- a live $49 checkout, signed webhook, renewal, failed-payment, cancellation, and Customer Portal canary;
- owner, manager, technician, and cross-tenant authorization canaries against the deployed project;
- backup/restore, retention/deletion, privacy, terms, support, tax, and incident-response decisions;
- jurisdiction-specific review of every checklist, schedule, and marketing statement;
- deployed desktop/mobile smoke tests, including real camera scanning, photo upload, intermittent-connectivity behavior, record download, and print output.

Automated customer email delivery and a customer-facing portal are not part of the current release. Operators can download or print records for sharing.

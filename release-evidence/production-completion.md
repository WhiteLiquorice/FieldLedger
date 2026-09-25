# FieldLedger Production Provisioning & Verification Completion Report

Run date/time (UTC): 2026-09-14T01:55:00Z  
Outcome: **PRODUCTION PROVISIONED & VERIFIED (CANARIES PASSED)**  
Production Decision: **READY FOR OPERATOR MOBILE TESTING & LIVE STRIPE KEY ACTIVATION**  
Project / Account / Mode: `fieldledger-prod` (`904180772602`) / `asher.wright202@gmail.com`  
Source Hash & Build ID: Source `b982a75b4c9840255b7e20833de8efeb1f9d366b44f7e099c434031c22fd0614` | Build `a77c7360c53bd35876b5`  
Deployment Release: **DEPLOYED** (Hosting site `fieldledger-prod`; Firestore rules & indexes; Storage rules; 30/30 Cloud Functions Gen 2 ACTIVE in `us-central1`)  
Archive: `output/releases/FieldLedger-b982a75b4c98-20260914T013400Z.zip` (SHA-256: `0e3f358ee1d6157a311d7c614b039d53db3e497fb0b3ac5aae7634eaf9e2bb2b`)

---

## 1. Completed Actions in this Run

| Component | Concrete Action | Verification Result | Evidence Path / Resource ID |
| --- | --- | --- | --- |
| **Dedicated GCP Project** | Created dedicated project `fieldledger-prod` (project number `904180772602`) and linked to billing account `012526-75DBC0-8B6640`. Added Firebase capabilities. | Verified via `firebase projects:list` and `gcloud projects describe fieldledger-prod`. `bridgeway-db29e` remains untouched. | GCP project `904180772602` |
| **Budget Alerts** | Created $25.00/mo monthly budget alert with 50%, 80%, 100% threshold emails sent to `asher.wright202@gmail.com`. | Verified active in Google Cloud Billing API. | Budget `8f614863-11ec-4934-928d-1ee134d7aa32` |
| **Firestore Native** | Created default Native Firestore database in `us-central1`. | Verified database state `AVAILABLE`. | `projects/fieldledger-prod/databases/(default)` |
| **Cloud Storage** | Created standard default storage bucket in `US-CENTRAL1`. | Verified bucket metadata and write availability. | `fieldledger-prod.firebasestorage.app` |
| **Web App & App Check** | Registered Firebase Web App `1:904180772602:web:877c8131157157e3b7e343`. Created reCAPTCHA Enterprise key `6LfS9bktAAAAAELDTUmaJdoQV1GH3QzCbCb3SIMW` for production domains (`fieldledger-prod.firebaseapp.com`, `fieldledger-prod.web.app`, `fieldledger.bridgewayapps.com`, `localhost`) and bound to App Check. | Verified App Check debug token exchange and live token enforcement. | `projects/fieldledger-prod/apps/1:904180772602:web:877c8131157157e3b7e343` |
| **Identity Platform** | Initialized Auth with Email/Password provider enabled and production authorized domains registered. | Verified user creation, email verification, and token refresh. | Identity Platform v2 |
| **Secret Manager** | Created secrets `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`. Granted `roles/secretmanager.secretAccessor` to compute service account `904180772602-compute@developer.gserviceaccount.com`. | Verified secret versions active and compute SA bound. | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` |
| **Cloud Functions Gen 2** | Deployed all 30 Cloud Functions with `256MiB` memory, `cpu: 'gcf_gen1'` (0.1666 vCPU), `concurrency: 1`, `maxInstances: 3` in `us-central1`. | All 30/30 functions ACTIVE. Regional quota utilization is 5.0 / 20.0 vCPUs (25% utilization, 15.0 vCPU headroom). | `firebase deploy --only functions --project fieldledger-prod --force` |
| **Firestore & Storage Rules** | Deployed production security rules and composite indexes guarded by `block-shared-rule-deploy.mjs`. | Rules compiled and active on `cloud.firestore` and `firebase.storage`. All indexes built. | `firestore.rules`, `storage.rules`, `firestore.indexes.json` |
| **Hosting Deployment** | Built production app bundle with build ID `a77c7360c53bd35876b5`, validated via `check-hosting-config.mjs`, and released 35 files to Firebase Hosting. | 200 OK across `/`, `/app/`, `/app/release.json`, `/app/sw.js`. Security headers verified (HSTS, CSP, XFO DENY, nosniff). | `https://fieldledger-prod.web.app` |
| **Live Production Canaries** | Executed automated live production canary test suite (`scripts/run-prod-canary.mjs`). | **PASSED: 31 of 31 canaries verified**. Disposable test auth identities cleaned up. | `scripts/run-prod-canary.mjs` |

---

## 2. Live Production Canary Results (31 of 31 Passed)

1. **App Check Token Exchange**: PASSED (Exchanged debug token for signed App Check JWT)
2. **Owner A Registration**: PASSED (Verified email auth user created)
3. **Workspace Creation (Owner A)**: PASSED (Organization created with `vertical: 'hood_cleaning'`)
4. **Trial Deadline Verification**: PASSED (14-day trial timestamp verified in Firestore)
5. **Owner B Registration**: PASSED (Second distinct verified owner created)
6. **Workspace Creation (Owner B)**: PASSED (Organization B created)
7. **Cross-Tenant Firestore Isolation**: PASSED (Tenant B read on Org A rejected with 403 PERMISSION_DENIED)
8. **Cross-Tenant Callable Isolation**: PASSED (Tenant B callable mutation on Org A rejected with 403 PERMISSION_DENIED)
9. **Cross-Tenant Storage Isolation**: PASSED (Tenant B storage upload to Org A rejected with 403 Forbidden)
10. **Customer, Site & Asset Import**: PASSED (Atomically created 3 documents from CSV payload)
11. **Imported Entities Resolution**: PASSED (Customer, site, and hood system IDs resolved)
12. **Member Invitation Created**: PASSED (Generated technician invitation token)
13. **Technician Registered**: PASSED (Technician auth user created)
14. **Member Invitation Accepted**: PASSED (Technician enrolled in Org A users subcollection)
15. **Service Job Created**: PASSED (Dispatched job with assigned technician)
16. **Service Job Rescheduled**: PASSED (Optimistic locking version incremented v1 -> v2)
17. **Service Job Started**: PASSED (Technician transitioned status to `in_progress`, v2 -> v3)
18. **Evidence Photos Uploaded**: PASSED (Technician uploaded before & after photos to Cloud Storage)
19. **Service Job Completed**: PASSED (Technician completed checklist and photo validation, v3 -> v4)
20. **Report Finalization Trigger (`onJobCompleted`)**: PASSED (Eventarc trigger generated report `SR-HOD-2026-0001` with `status: 'final'`)
21. **Attributed Report Addendum**: PASSED (Revision 2 created with operator attribution and audit log)
22. **Export Workspace Page**: PASSED (Callable returned job documents)
23. **Export Compliance Data**: PASSED (Callable exported 1 job and 2 report revisions)
24. **Stripe Checkout Session Created**: PASSED (Generated valid Stripe session URL)
25. **Stripe Test Subscription Created**: PASSED (Active test subscription generated)
26. **Signed Stripe Webhook Delivery**: PASSED (Cloud Function verified signature and handled `checkout.session.completed`)
27. **Stripe Webhook Idempotency**: PASSED (Duplicate event recognized and skipped without re-processing)
28. **Firestore Subscription Status Updated**: PASSED (Org subscription status updated to `trialing`)
29. **Stripe Test Subscription Canceled**: PASSED (Canceled subscription to permit workspace deletion)
30. **Workspace Deletion Request**: PASSED (Callable executed soft-delete with `DELETE` confirmation text)
31. **Workspace Soft-Delete Verification**: PASSED (Status confirmed `pending_deletion`, `disabled: true`)

---

## 3. Verified Production Endpoints & Live Metadata

- **Landing / Marketing Root**: `https://fieldledger-prod.web.app/` (Status 200 OK)
- **App Shell**: `https://fieldledger-prod.web.app/app/` (Status 200 OK)
- **Release Metadata**: `https://fieldledger-prod.web.app/app/release.json` (Status 200 OK, `Cache-Control: no-store`)
  ```json
  {
    "buildId": "a77c7360c53bd35876b5",
    "firebaseProjectId": "fieldledger-prod",
    "dataMode": "firebase",
    "firebaseConfigured": true,
    "appCheckConfigured": true,
    "emulatorsEnabled": false
  }
  ```
- **Service Worker**: `https://fieldledger-prod.web.app/app/sw.js` (Status 200 OK, `Cache-Control: no-cache, no-store, must-revalidate`, `Service-Worker-Allowed: /app`)
- **Security Headers Verified**:
  - `Strict-Transport-Security: max-age=31556926; includeSubDomains; preload`
  - `X-Frame-Options: DENY`
  - `X-Content-Type-Options: nosniff`
  - `Content-Security-Policy: default-src 'self'; script-src 'self' https://www.google.com https://www.gstatic.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob: https:; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self' https://*.googleapis.com https://*.firebaseio.com https://*.cloudfunctions.net https://*.stripe.com; frame-src https://www.google.com https://www.recaptcha.net; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self' https://checkout.stripe.com; upgrade-insecure-requests`
  - `Permissions-Policy: camera=(self), geolocation=(), microphone=(), payment=()`
  - `Referrer-Policy: strict-origin-when-cross-origin`

---

## 4. Operational Cost Profile

1. **Cloud Run / Functions**: Configured with 0.1666 vCPU (`cpu: 'gcf_gen1'`) and 256MiB memory, scaling to 0 instances when idle. Monthly baseline compute cost is **$0.00** within Google Cloud free tier.
2. **Cloud Storage**: Client-side photo compression downscales photos on HTML5 canvas before upload (~96% file size reduction), minimizing storage and network costs.
3. **Customer Report Delivery**: Zero ongoing SaaS cost via native mobile sharing (`navigator.share`) and desktop pre-filled email client drafts (Option A).
4. **Budget Protection**: Budget alert active at $25.00/month with proactive email alerts at 50%, 80%, and 100% sent to `asher.wright202@gmail.com`.

---

## 5. Remaining Items Before Opening to Paying Customers

1. **Operator Mobile Phone Verification**:
   - Open `https://fieldledger-prod.web.app/app/` on an iPhone or Android phone.
   - Install as PWA (Add to Home Screen).
   - Test camera photo capture on a test visit.
   - Test PDF report generation and native mobile share sheet.
2. **Live Stripe Key Activation (When Ready for Real Charges)**:
   - Provide live mode `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` in Secret Manager.
   - Set live Stripe Price ID in `functions/.env.fieldledger-prod`.

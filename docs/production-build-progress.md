# Current status — 2026-09-13

**NO-GO for paying-customer production.** The latest full local gate completed on 2026-09-11 with all nine gates passed (189 tests plus builds and release audit). Its source fingerprint still matches the checkout on 2026-09-13. The older counts below describe the prior checkpoint.

Dedicated staging project `fieldledger-stg`, web app and an empty Firestore database in `us-central1` now exist. The staging Firebase environment and local hosting target are prepared. Billing is not linked; App Check, Storage/Auth setup, Stripe secrets/price, deployment and live acceptance remain incomplete. See [the current blocker ledger](launch-blockers.md) and `../release-evidence/staging-provisioning.json`.

The sample now downloads instead of navigating into the blank in-app PDF viewer. PWA release caches, online navigation, offline shell loading, scoped caching, CSP-compatible worker registration and a hosting configuration gate are implemented. Checkout validates configuration before external writes. Public annual-billing and unsupported security/compliance claims were reconciled locally. No updated site or app has been deployed.

The verified source/build snapshot and per-file checksums are recorded in `../release-evidence/release-provenance.json`. This supplies a retained candidate artifact, not a Git history or deployed rollback rehearsal.

---

# FieldLedger local release candidate — 2026-09-10

Scope: hood cleaning first, $49/month for up to three technician-role seats, 14-day workspace trial. Other vertical configurations remain available. The approved local build is complete and the stable-source release gate passed. Deployment and outreach sending have not been performed.

## Implemented

- Verified-email onboarding, workspace trial, invitations, role enforcement and technician seat limits.
- Customer/site/equipment CSV import with retry deduplication and version-checked office editors.
- Assignment, rescheduling with reasons, cancellation, technician start/completion, configurable checklists and explained exceptions.
- Device-local checklist drafts and queued photographs through interrupted connectivity, followed by reconnect/upload/finalization.
- Required hood before/after evidence, immutable completed evidence, frozen source snapshots, photo-backed PDF downloads, and attributed append-only report revisions.
- Atomic report/counter/equipment/recurrence finalization, concurrent retry handling, protection against older service dates, and office scheduling of the next recurring visit.
- Paginated workspace data export after billing ends, signed Stripe-event processing with duplicate/older-event protection, original trial-deadline handling, explicit immediate-charge consent, and delayed scoped account teardown.
- Standalone Functions deployment bundle, operational failure monitoring, deployment guards and recovery/support runbooks.
- Hood-first landing and demo, preserved explicit other-vertical demos, clearly fictional sample PDF, and human-reviewed outreach drafts in `sales-playbook.md`.

## Final local verification

Command: `npm.cmd run verify:local-candidate`

All eight gates passed on source SHA-256 `acf39b50055725e06e903736ad4458039b5b00245685f1add6686c3410f4827f`, run `de9d9d10-0c66-4641-8bea-72e21e63fc5f`:

| Gate | Result |
| --- | --- |
| Release evidence runner | 3 tests passed |
| Shared core | 105 tests passed |
| Functions policies and deployment bundle | 37 tests passed |
| Firestore/Storage security rules | 26 tests passed |
| Production builds | Core, Functions, website and integrated app passed |
| Release audit | Manifest, eight marketing pages and app passed |
| Demo browser acceptance | 3 tests passed, including hood default and 390px mobile |
| Authenticated emulator acceptance | 5 tests passed |

Authenticated evidence covers actual Firebase Auth/Firestore/Storage/Functions emulator operations, owner and technician browser journeys, offline photo capture/reload, final PDFs and revisions, recurrence, signed webhook handling, tenant/role denial, export, deletion, concurrent report transactions and persisted operational-health detection. Stripe signature processing uses the real SDK; the external Stripe subscription lookup is mocked. This is not live Stripe or physical-device certification.

The landing page was inspected at a narrow viewport. The sample link returned HTTP 200 with PDF content and bytes matching the visually inspected two-page artifact. The in-app browser PDF viewer displayed a blank surface, so PDF visual inspection used rendered pages instead. Firebase's rules tooling logged a shutdown exception after successful test completion; all test and runner exit codes were zero and scoped emulator cleanup completed.

## Remaining launch gates

No dedicated Firebase project or Stripe price is recorded as provisioned in the manifest. Dedicated infrastructure/configuration, staging deployment, physical iOS/Android camera checks, live billing and authenticated canaries, alert delivery, isolated backup/restore rehearsal, support/legal ownership and production promotion remain independent launch gates. See `launch-acceptance.md` for the concrete next release action and acceptance sequence.

Authoritative aggregate: `../release-evidence/acceptance.json`. Logs and browser artifacts are stored alongside it. The local demo runs at `http://127.0.0.1:4387/app/?mode=demo&vertical=hood_cleaning` while its preview server is active; this is a local preview, not an outreach URL.

## Dependency-audit permission blocker

The production dependency audit was not executed. Automatic approval review rejected `npm.cmd audit --omit=dev --json` because it would send dependency names/versions and potentially private package metadata to the npm registry without explicit authorization. No clean dependency-security claim is made. Explicit permission for that payload/destination is required to finish this local security check; the eight completed verification gates remain passed.

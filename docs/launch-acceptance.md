# FieldLedger launch acceptance

The local candidate is intended for hood-cleaning contractors with up to three technicians at $49/month and a 14-day workspace trial. Local evidence lives in `release-evidence/acceptance.json`. Do not treat intended project names or a configured canonical URL as deployed infrastructure.

## Next release action for approval

Configure a dedicated staging Firebase project using the intended allowlist entry `fieldledger-stg`, a dedicated staging hosting target, Firebase Auth, Firestore, Storage, App Check, and Stripe test-mode product/price/webhook credentials. Confirm the Google Cloud billing account and resource region before provisioning billable resources. Deploy only this candidate to staging; keep production and real customer data out of this first acceptance run.

Supply build-time Firebase/App Check configuration and the staging app URL through the environment mechanism. Put Stripe secrets in Secret Manager; never in source, browser bundles, or release evidence. Verify the deploy guard recognizes the dedicated project and rejects shared portfolio projects. Record actual provisioning in the release manifest only after it exists.

## Staging acceptance

1. Register and verify an owner; create a hood-cleaning workspace and confirm its trial deadline.
2. Import and edit a customer, site and systems; invite a technician; enforce seat limits and deny a second workspace access.
3. Assign and reschedule a visit. On physical iOS and Android devices, capture before/after photos, interrupt connectivity, reconnect, reload and complete the visit.
4. Download the photo-backed PDF from a fresh session. Verify immutable original details, an attributed correction, and a single next recurring visit after retries.
5. Exercise Stripe test Checkout, preserved trial deadline, explicit immediate-charge consent when required, Customer Portal, payment failure, cancellation, duplicate webhooks and older event delivery. Confirm exports remain available when billing ends.
6. Exercise delayed deletion on a disposable fixture, with billing ended. Confirm only that workspace's documents, images and membership access are removed.
7. Deliver and acknowledge a synthetic operational alert. Rehearse database and evidence restoration into an isolated recovery project and repeat the customer-record workflow.

Persist timestamps, deployed revision, rules/index hashes, test-mode event IDs, screenshots, downloaded record and measured restore results. Omit secrets and personal customer data. Resolve failures before requesting production promotion.

## Production decision

After staging acceptance, confirm the production billing setup, domain ownership, support contact, privacy/terms ownership and checklist review. Provision/configure the separately allowlisted `fieldledger-prod` only with approval. Promote the accepted source, verify live payment and authenticated canaries, and confirm the public demo/sample links before directing outreach recipients to them. Obtain explicit authorization for any real charge. No automatic outreach sending is part of this release.

Go/no-go: passing local checks permits staging review. Production customer onboarding requires the deployed checks above; a build or successful health response alone does not satisfy them.

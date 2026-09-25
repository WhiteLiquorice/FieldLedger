# FieldLedger recovery runbook

Status: release preparation. No live backup, replication policy, recovery time, or recovery point is certified by this document. The release manifest must identify the dedicated production and recovery projects before these procedures are executed.

## Before accepting customer data

1. Name the person responsible for backup failures and incidents.
2. Configure Firestore point-in-time recovery and scheduled backups in the dedicated production project. Record the actual region, retention, schedule, last successful backup and restore permissions in release evidence.
3. Configure evidence bucket protection and an independently recoverable copy. Verify the policy covers object bytes and metadata; a Firestore backup alone does not contain photographs.
4. Keep backup access separate from application runtime access. Store billing credentials in Secret Manager. Record a recovery path for Firebase Auth users and their workspace membership without exporting passwords or credentials into support artifacts.
5. Choose recovery objectives based on a measured restore rehearsal. Do not advertise numerical guarantees before that rehearsal passes.

## Isolated restore rehearsal

Restore a dated database backup and matching evidence objects into a dedicated recovery project. Do not import over production. Disable scheduled deletion and billing webhook processing in the recovery environment and use Stripe test mode only.

Compare document counts and selected source snapshots, equipment dates, job events, report revisions, memberships and evidence bytes with the backup manifest. Exercise owner login, technician assignment, photo access, complete a synthetic visit, download a PDF, and reject access from a second workspace. Reconcile membership and Auth claims; restoring Firestore alone does not restore authentication.

Record backup timestamp, restore start/end, project IDs, commands used, object/document counts, missing data, canary results and operator approval. The live launch gate remains blocked until this evidence exists.

## Incident recovery

Stop the affected write path, preserve logs and identify the earliest affected record. Restore into isolation first. Compare records created after the recovery point and prepare an explicit reconciliation list. Review cutover and rollback steps before modifying live data. After cutover, verify billing state against Stripe and rerun the authenticated canary. Keep the former environment available until reconciliation is complete.

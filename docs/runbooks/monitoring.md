# Operational monitoring

`monitorOperationalHealth` runs every 15 minutes after deployment. It checks jobs that have remained in `reportState=pending` for 15 minutes, persisted failed Stripe webhook events, and workspace deletions more than two hours past their deadline. It emits `fieldledger_operational_attention` at error severity with identifiers and capped result lists. `truncated=true` means the operator must inspect the complete backlog. It does not repair or delete records.

Before launch, create a Cloud Logging alert for that signal and route it to a confirmed operator destination. Also alert on scheduled-function failures, elevated callable 5xx errors, Storage/Firestore errors and backup failures. Verify a synthetic alert is delivered and acknowledged. Logging alone is not an on-call system.

For a stalled report, inspect the completed job's source snapshot and the function exception. Fix the cause and retry the idempotent finalizer; do not manually change an equipment service date or issue another report number. For failed billing, inspect Stripe delivery history and replay the signed event after resolving the cause. For overdue deletion, verify billing and worker errors before any retry.

Keep a read-only deployment inventory with project IDs, deployed revision, rules hashes, configured indexes, alert destinations, last backup and last restore rehearsal. The local health test proves persisted-condition detection, not live alert delivery or backup configuration.

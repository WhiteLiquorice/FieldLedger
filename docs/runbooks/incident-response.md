# Incident response

Before launch, assign a reachable support owner and alert destination. No staffed on-call rotation, response SLA or public support address is established by this runbook.

Treat cross-workspace access, lost records, billing corruption or a complete outage as urgent. A blocked save/upload/completion is also urgent because it affects field work. Capture UTC timestamps, affected workspace/job IDs, build/revision, failed operation and relevant logs. Do not collect credentials, access tokens or customer photos in routine incident summaries.

Contain the affected write path and preserve evidence. Verify the current deployed version before rolling back. Test the fix or restore in isolation, then run an authenticated owner/technician canary and a foreign-workspace denial test before declaring recovery.

For photo/report failures, distinguish a device-local queued photo, uploaded object, completed job, missing report and failed PDF download. A successful health endpoint does not prove any of those stages. Never tell a customer all drafts synchronized unless their persisted results were checked.

Customer update draft: We are investigating [specific operation] affecting [confirmed scope]. Keep unsynced work on the current device and avoid signing out. Our next update will be at [time the operator can commit to].

After recovery, record impact, timeline, root cause, recovery evidence, unresolved data reconciliation and assigned prevention work. Sending customer notifications requires separate authorization.

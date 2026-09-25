# Workspace deletion

Only an owner may request deletion, with the company name or DELETE as confirmation. Billing must already be canceled or otherwise ended; a subscription scheduled to cancel later is still active. Managers and technicians cannot request deletion.

Before confirming, use Data export to download the workspace JSON and download any service-record PDFs needed for retention. JSON contains evidence references, not image bytes. Deletion suspends access immediately, so exports must happen first. The customer is responsible for deciding which records they need to retain; the application does not determine legal retention requirements.

The request sets disabled=true, status=pending_deletion and a deleteAfterMs deadline seven days later. The scheduled purge worker checks the deadline and billing state again. It revokes matching workspace claims, removes workspace mappings and invitation/slug lookups, deletes the organization's evidence prefix and recursively deletes the organization last. Unrelated workspace data is outside that scope. Retrying an already completed purge is safe.

The Firebase Auth login account is retained without its deleted-workspace claims. Workspace deletion does not promise account-wide identity erasure. There is no immutable perpetual audit archive after the workspace itself is purged.

Before the seven-day deadline, an authorized support operator can investigate an erroneous deletion request and review a restoration of access; there is no self-service undo screen. Verify the requester, billing state and whether the purge has started before changing any deletion flags. After purge, use the isolated recovery procedure if an applicable backup exists. Never use broad collection deletion commands as a substitute for the scoped worker.

Local acceptance exercises retention, retry, recursive Firestore cleanup, evidence deletion, claims revocation and an unrelated-workspace sentinel. Production scheduling, backup retention and actual deletion timing still require live verification.

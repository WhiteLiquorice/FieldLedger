# Evidence and local drafts

Evidence objects use orgs/<orgId>/jobs/<jobId>/assets/<assetId>/<evidenceId>-<filename>. Uploads accept JPEG, PNG and WebP smaller than 20 MiB. Storage and Firestore rules restrict writes to permitted members and editable jobs; completed job evidence cannot be overwritten or deleted through the app.

The server checks evidence URLs, job/asset paths, bucket, object presence, MIME type and size before completion. These checks do not prove where or when a photograph was taken. The current workflow does not provide server-verified photographic authenticity or a cryptographic chain-of-custody claim.

Open a visit while connected. Checklist values and selected photos are saved in a device-local IndexedDB draft. Pending photos retry after reconnection, and completion stays blocked until uploads finish. Drafts are scoped by account, workspace and job; signing out clears them. Keep the app open until it shows the draft/upload status, and resolve failures before leaving or changing devices.

Browser storage can be cleared or evicted. A local draft is not a cloud backup. Physical iOS/Android camera and interruption tests remain a release gate. Bucket retention, backups, lifecycle tiers and restore capabilities must be verified in the actual project; none are guaranteed by the local implementation.

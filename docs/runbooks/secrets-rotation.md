# Secret handling and rotation

Use separate environments and least-privilege access. Store STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET in Google Secret Manager. Prefer a restricted Stripe API key with only the permissions required by checkout, customers, subscriptions and the billing portal. Never put actual secret values in source files, screenshots or logs.

Use managed service identity or workload identity for Firebase/GCP operations where available. Do not create downloadable service-account keys merely for convenience. App Check site configuration is distinct from an API secret; emulator debug settings must not enter production builds.

For planned rotation, create the replacement credential, update the intended project's secret version, deploy the verified dependent functions after approval, and exercise the relevant billing or authenticated canary. Confirm delivery using the new webhook signing secret before retiring the old one. Record project, secret version identifiers, deployed revision and verification timestamps; omit secret values.

For compromise, revoke the affected credential promptly, review provider access logs, replace the credential and verify the affected workflows. Follow the incident runbook. A local test using fixture secrets does not verify live rotation or justify a real charge.

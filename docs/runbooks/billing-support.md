# Billing support

Starter is $49/month for up to three active technician-role members. Owners and managers do not consume technician seats. Pending technician invitations reserve seats. The workspace trial lasts 14 days from creation.

Checkout carries the existing trial deadline when Stripe permits it. Checkout requires a trial end at least 48 hours away, and the implementation allows for the 35-minute checkout session lifetime. During the final part of the trial, the customer can keep using the trial or explicitly choose to begin paying immediately. Checkout never creates another 14-day trial. Reference: https://docs.stripe.com/api/checkout/sessions/create?lang=node

Use the billing portal for an existing subscription. Active, trialing, past_due, unpaid, paused and incomplete subscriptions must not be mistaken for canceled subscriptions. Webhooks verify the raw-body signature, reserve event processing, handle duplicate events and read current Stripe subscription state before updating entitlement. Failed events remain retryable.

Past-due access currently remains available with a warning until Stripe changes the subscription state. Configure and verify Stripe retry/dunning and terminal-state settings before launch; there is no hardcoded 14-day grace policy or automatic refund promise. Verify the subscription in Stripe before addressing a billing complaint. Do not manually mark an account paid from a checkout redirect.

Workspace deletion requires billing to have ended; scheduling cancellation at period end is not the same as a canceled subscription. Exports remain available after operational access expires, until deletion is requested.

Before launch, approve cancellation/refund terms, configure the portal and receipt/failed-payment emails, verify the configured recurring USD price is 4900 cents, and perform Stripe test-mode checkout, renewal, failure, cancellation and duplicate/out-of-order webhook scenarios. Review applicable tax setup and active registrations before enabling automatic tax. No tax collection or refund policy is implied by this document.

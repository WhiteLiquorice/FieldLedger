import { subscriptionSnapshot } from '../billing/subscription-policy';
import { defineSecret } from 'firebase-functions/params';
import { onRequest } from 'firebase-functions/v2/https';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import Stripe from 'stripe';

const STRIPE_SECRET_KEY = defineSecret('STRIPE_SECRET_KEY');
const STRIPE_WEBHOOK_SECRET = defineSecret('STRIPE_WEBHOOK_SECRET');

async function findOrganizationByCustomer(customerId: string) {
  const snapshot = await getFirestore()
    .collection('orgs')
    .where('stripeCustomerId', '==', customerId)
    .limit(1)
    .get();
  return snapshot.empty ? null : snapshot.docs[0].ref;
}

interface WebhookRequest { method: string; headers: Record<string, string | string[] | undefined>; rawBody: Buffer; }
interface WebhookResponse { status(code: number): WebhookResponse; set(name: string, value: string): WebhookResponse; send(value: string): unknown; json(value: unknown): unknown; }

/** Signature verification and persisted processing; only the external Stripe client is injectable. */
export async function handleStripeWebhook(req: WebhookRequest, res: WebhookResponse, stripe: Stripe, signingSecret: string) {
    if (req.method !== 'POST') { res.status(405).set('Allow', 'POST').send('Method Not Allowed'); return; }
    const signature = req.headers['stripe-signature'];
    if (!signingSecret || typeof signature !== 'string') {
      res.status(400).send('Stripe webhook verification is not configured.');
      return;
    }

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(req.rawBody, signature, signingSecret);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid signature.';
      res.status(400).send(`Webhook Error: ${message}`);
      return;
    }

    const db = getFirestore();
    const eventRef = db.collection('stripe_webhook_events').doc(event.id);
    try {
      const reservation = await db.runTransaction(async (transaction) => {
        const existing = await transaction.get(eventRef);
        if (existing.data()?.status === 'completed') return 'completed' as const;
        const processingStartedAtMs = existing.data()?.processingStartedAtMs;
        if (existing.exists && typeof processingStartedAtMs === 'number' && Date.now() - processingStartedAtMs < 5 * 60 * 1000) {
          return 'processing' as const;
        }
        transaction.set(eventRef, {
          eventId: event.id,
          eventType: event.type,
          status: 'processing',
          processingStartedAtMs: Date.now(),
          createdAt: FieldValue.serverTimestamp(),
        });
        return 'reserved' as const;
      });

      if (reservation === 'completed') {
        res.status(200).json({ received: true, duplicate: true });
        return;
      }
      if (reservation === 'processing') {
        res.status(409).json({ error: 'Webhook event is already processing. Retry later.' });
        return;
      }

      let orgId: string | undefined;
      let subscriptionId: string | undefined;
      if (['checkout.session.completed', 'checkout.session.async_payment_succeeded'].includes(event.type)) {
        const session = event.data.object as Stripe.Checkout.Session;
        orgId = session.metadata?.organizationId || session.client_reference_id || undefined;
        subscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id;
      } else if (event.type.startsWith('customer.subscription.')) {
        const subscription = event.data.object as Stripe.Subscription;
        orgId = subscription.metadata.organizationId;
        subscriptionId = subscription.id;
      } else if (['invoice.paid', 'invoice.payment_failed'].includes(event.type)) {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;
        const orgRef = customerId ? await findOrganizationByCustomer(customerId) : null;
        if (orgRef) { orgId = orgRef.id; subscriptionId = (await orgRef.get()).data()?.stripeSubscriptionId; }
      }
      if (orgId && subscriptionId) {
        // Read Stripe's current state: a late checkout event must not revive a canceled subscription.
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const current = subscriptionSnapshot(subscription);
        const orgRef = db.collection('orgs').doc(orgId);
        await db.runTransaction(async transaction => {
          const org = (await transaction.get(orgRef)).data();
          if (!org) throw new Error('Billing organization does not exist.');
          if (org.stripeCustomerId !== current.stripeCustomerId || subscription.metadata.organizationId !== orgId) throw new Error('Billing ownership mismatch.');
          if (typeof org.lastStripeEventCreated === 'number' && event.created < org.lastStripeEventCreated) return;
          if (org.stripeSubscriptionId && org.stripeSubscriptionId !== subscription.id && !['canceled','expired'].includes(org.subscriptionStatus)) return;
          transaction.update(orgRef, { ...current, lastStripeEventCreated:event.created,
            paymentAlert:current.subscriptionStatus === 'past_due' ? 'Payment needs attention. Update your payment method in Manage billing.' : FieldValue.delete(),
            subscriptionUpdatedAt:FieldValue.serverTimestamp() });
        });
      }

      await eventRef.update({ status: 'completed', completedAt: FieldValue.serverTimestamp() });
      res.status(200).json({ received: true });
    } catch (error) {
      await eventRef.set({ status: 'failed', processingStartedAtMs: 0 }, { merge: true });
      const message = error instanceof Error ? error.message : 'Webhook processing failed.';
      console.error('Stripe webhook processing failed', { eventId: event.id, eventType: event.type, message });
      res.status(500).json({ error: 'Webhook processing failed.' });
    }
}

export const stripeWebhook = onRequest({ region: 'us-central1', secrets: [STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET] }, async (req, res) => {
  const key = STRIPE_SECRET_KEY.value(), signingSecret = STRIPE_WEBHOOK_SECRET.value();
  if (!key || !signingSecret) { res.status(400).send('Stripe webhook verification is not configured.'); return; }
  await handleStripeWebhook(req, res, new Stripe(key), signingSecret);
});

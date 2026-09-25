import { canStartCheckout, checkoutTrialEnd } from '../billing/subscription-policy';
import { defineSecret, defineString } from 'firebase-functions/params';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import Stripe from 'stripe';
import { z } from 'zod';
import { authorizeOrganizationRequest } from '../security/authorize-request';
import { parseCallableData } from '../security/parse-callable-data';

const STRIPE_SECRET_KEY = defineSecret('STRIPE_SECRET_KEY');
const FIELDLEDGER_APP_URL = defineString('FIELDLEDGER_APP_URL', { default: '' });
const STRIPE_STARTER_PRICE_ID = defineString('STRIPE_STARTER_PRICE_ID', { default: '' });

const CheckoutSchema = z.object({
  organizationId: z.string().min(1).max(128),
  tier: z.literal('starter').default('starter'),
  requestId: z.string().uuid(),
  acceptImmediateCharge: z.boolean().default(false),
});

export const STARTER_PLAN = {
  name: 'FieldLedger Starter',
  amount: 4900,
  maxTechnicians: 3,
} as const;

export const createStripeCheckoutSession = onCall(
  {
    region: 'us-central1',
    enforceAppCheck: true,
    secrets: [STRIPE_SECRET_KEY],
  },
  async (request) => {
    const input = parseCallableData(CheckoutSchema, request.data);
    const tier = 'starter' as const;
    const actor = await authorizeOrganizationRequest(request, input.organizationId, ['owner', 'manager'], false);
    const db = getFirestore();
    const orgRef = db.collection('orgs').doc(input.organizationId);
    const orgDoc = await orgRef.get();

    if (!orgDoc.exists) throw new HttpsError('not-found', 'Organization not found.');

    const secretKey = STRIPE_SECRET_KEY.value();
    if (!secretKey) throw new HttpsError('failed-precondition', 'Stripe billing is not configured.');
    const appUrlValue = FIELDLEDGER_APP_URL.value();
    const priceId = STRIPE_STARTER_PRICE_ID.value();
    if (!/^price_[A-Za-z0-9]+$/.test(priceId)) throw new HttpsError('failed-precondition', 'A valid Stripe price is required.');
    let appUrl: URL;
    try { appUrl = new URL(appUrlValue); }
    catch { throw new HttpsError('failed-precondition', 'A valid HTTPS application URL is required.'); }
    if (appUrl.protocol !== 'https:' || appUrl.username || appUrl.password) throw new HttpsError('failed-precondition', 'A valid HTTPS application URL is required.');
    const stripe = new Stripe(secretKey);
    const orgData = orgDoc.data() || {};
    if (!canStartCheckout(orgData)) {
      throw new HttpsError('failed-precondition', 'This organization already has a Stripe subscription. Use the billing portal to manage it.');
    }
    if (!checkoutTrialEnd(orgData) && !input.acceptImmediateCharge) throw new HttpsError('failed-precondition', 'Confirm that the paid plan starts immediately, or continue your remaining workspace trial.');
    let customerId = typeof orgData.stripeCustomerId === 'string' ? orgData.stripeCustomerId : '';

    if (!customerId) {
      const customer = await stripe.customers.create({
        ...(typeof request.auth?.token.email === 'string' ? { email: request.auth.token.email } : {}),
        name: typeof orgData.name === 'string' ? orgData.name : 'FieldLedger organization',
        metadata: {
          organizationId: input.organizationId,
          createdVia: 'fieldledger',
        },
      }, {
        idempotencyKey: `fieldledger-customer-${input.organizationId}`,
      });
      customerId = customer.id;
      await orgRef.update({ stripeCustomerId: customerId });
    }

    const successUrl = new URL('/app/', appUrl);
    successUrl.searchParams.set('billing', 'success');
    successUrl.searchParams.set('session_id', '{CHECKOUT_SESSION_ID}');
    const cancelUrl = new URL('/app/', appUrl);
    cancelUrl.searchParams.set('billing', 'cancelled');

    const checkoutAttempt = await db.runTransaction(async transaction => {
      const current = (await transaction.get(orgRef)).data() || {};
      if (!canStartCheckout(current)) throw new HttpsError('failed-precondition', 'This organization already has a Stripe subscription. Use the billing portal to manage it.');
      if (typeof current.checkoutAttemptId === 'string' && current.checkoutExpiresAtMs > Date.now() + 60000) return {id:current.checkoutAttemptId, expiresAtMs:current.checkoutExpiresAtMs as number, trialEnd: typeof current.checkoutTrialEnd === 'number' ? current.checkoutTrialEnd : null, actorId: String(current.checkoutActorId || actor.uid)};
      const trialEnd = checkoutTrialEnd(current);
      if (!trialEnd && !input.acceptImmediateCharge) throw new HttpsError('failed-precondition', 'The trial window changed. Review the billing page before continuing.');
      const attempt = {id:input.requestId,expiresAtMs:Date.now()+35*60*1000,trialEnd,actorId:actor.uid};
      transaction.update(orgRef,{checkoutAttemptId:attempt.id,checkoutExpiresAtMs:attempt.expiresAtMs,checkoutTrialEnd:attempt.trialEnd,checkoutActorId:actor.uid});
      return attempt;
    });
    const session = await stripe.checkout.sessions.create({
      expires_at: Math.floor(checkoutAttempt.expiresAtMs / 1000),
      customer: customerId,
      client_reference_id: input.organizationId,
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      subscription_data: {
        ...(checkoutAttempt.trialEnd ? { trial_end: checkoutAttempt.trialEnd } : {}),
        metadata: {
          organizationId: input.organizationId,
          tier,
        },
      },
      success_url: successUrl.toString(),
      cancel_url: cancelUrl.toString(),
      metadata: {
        organizationId: input.organizationId,
        tier,
        userId: checkoutAttempt.actorId,
        integration_identifier: 'fieldledger_web',
      },
    }, {
      idempotencyKey: `fieldledger-checkout-${input.organizationId}-${checkoutAttempt.id}`,
    });

    if (!session.url) throw new HttpsError('internal', 'Stripe did not return a Checkout URL.');
    return { url: session.url, sessionId: session.id };
  }
);

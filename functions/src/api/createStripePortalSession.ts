import { defineSecret, defineString } from 'firebase-functions/params';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import Stripe from 'stripe';
import { z } from 'zod';
import { authorizeOrganizationRequest } from '../security/authorize-request';
import { parseCallableData } from '../security/parse-callable-data';

const STRIPE_SECRET_KEY = defineSecret('STRIPE_SECRET_KEY');
const FIELDLEDGER_APP_URL = defineString('FIELDLEDGER_APP_URL', { default: '' });

const PortalSchema = z.object({
  organizationId: z.string().min(1).max(128),
});

export const createStripePortalSession = onCall(
  {
    region: 'us-central1',
    enforceAppCheck: true,
    secrets: [STRIPE_SECRET_KEY],
  },
  async (request) => {
    const input = parseCallableData(PortalSchema, request.data);
    await authorizeOrganizationRequest(request, input.organizationId, ['owner', 'manager'], false);
    const orgDoc = await getFirestore().collection('orgs').doc(input.organizationId).get();
    if (!orgDoc.exists) throw new HttpsError('not-found', 'Organization not found.');

    const customerId = orgDoc.data()?.stripeCustomerId;
    if (typeof customerId !== 'string' || !customerId) {
      throw new HttpsError('failed-precondition', 'Start a subscription before opening the billing portal.');
    }

    const secretKey = STRIPE_SECRET_KEY.value();
    if (!secretKey) throw new HttpsError('failed-precondition', 'Stripe billing is not configured.');
    const stripe = new Stripe(secretKey);
    const appUrl = FIELDLEDGER_APP_URL.value();
    if (!appUrl) throw new HttpsError('failed-precondition', 'The FieldLedger application URL is not configured.');
    const returnUrl = new URL('/app/?view=billing', appUrl).toString();
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });

    return { url: portalSession.url };
  }
);

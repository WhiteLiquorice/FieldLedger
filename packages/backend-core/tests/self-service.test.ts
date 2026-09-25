import { describe, expect, it } from 'vitest';
import { canStartCheckout, subscriptionSnapshot } from '../../../functions/src/billing/subscription-policy';
import { validateCompletion } from '../../../functions/src/jobs/completion-policy';
describe('self-service billing recovery', () => {
 it('allows checkout after customer creation or cancellation, not an existing live subscription', () => {
  expect(canStartCheckout({stripeCustomerId:'cus_existing'})).toBe(true);
  expect(canStartCheckout({stripeSubscriptionId:'sub_old',subscriptionStatus:'canceled'})).toBe(true);
  expect(canStartCheckout({stripeSubscriptionId:'sub_live',subscriptionStatus:'active'})).toBe(false);
 });
 it('takes entitlement from actual subscription status and item period', () => {
  expect(subscriptionSnapshot({id:'sub_a',customer:'cus_a',status:'past_due',items:{data:[{current_period_end:1800000000}]}}).subscriptionStatus).toBe('past_due');
  expect(subscriptionSnapshot({id:'sub_a',customer:'cus_a',status:'active',items:{data:[{current_period_end:1800000000}]}}).currentPeriodEnd).toBe(new Date(1800000000000).toISOString());
 });
});
describe('server completion contract', () => {
 const result={assetId:'asset-a',outcome:'completed',notes:'Inspected',checklist:{visual:true},photoUrls:[]};
 it('accepts all expected assets with the required checklist',()=>expect(validateCompletion([result],['asset-a'],['visual'])).toEqual([result]));
 it('rejects missing, duplicate and foreign assets',()=>{
  expect(()=>validateCompletion([],['asset-a'],['visual'])).toThrow();
  expect(()=>validateCompletion([result,result],['asset-a'],['visual'])).toThrow();
  expect(()=>validateCompletion([result],['asset-b'],['visual'])).toThrow();
 });
 it('rejects unchecked required work',()=>expect(()=>validateCompletion([{...result,checklist:{visual:false}}],['asset-a'],['visual'])).toThrow());
});

import React, { useState } from 'react';
import { AlertTriangle, ArrowUpRight, Check, CreditCard, ExternalLink, Loader2, ShieldCheck, Trash2, X } from 'lucide-react';
import { httpsCallable } from 'firebase/functions';
import { useOperations } from '../context/OperationsContext';
import { getFirebaseServices } from '../lib/firebase';

type CheckoutResponse = { url: string; sessionId: string };
type PortalResponse = { url: string };

const FEATURES = [
  'Up to 3 field technicians',
  'Unlimited customer, site, and service records',
  'Barcode and manual asset lookup',
  'Field photos and technician observations',
  'Configurable recurring service dates',
  'Downloadable customer service records',
];

export const SubscriptionBillingPortal: React.FC = () => {
  const { snapshot, mode, user, requestWorkspaceDeletion } = useOperations();
  const organization = snapshot.organization;
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [error, setError] = useState('');
  const [acceptImmediateCharge, setAcceptImmediateCharge] = useState(false);
  
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteReason, setDeleteReason] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const hasStripeCustomer = Boolean(organization.stripeCustomerId);
  const canCheckout = !organization.stripeSubscriptionId || ['canceled','expired'].includes(organization.subscriptionStatus || '');
  const status = organization.subscriptionStatus || 'not_started';
  const isOwner = mode === 'demo' || snapshot.organization.createdByUserId === user?.uid || snapshot.members.find((m) => m.userId === user?.uid)?.role === 'owner';
  const canManageBilling = isOwner || snapshot.members.find(member => member.userId === user?.uid)?.role === 'manager';
  const carryTrial = !organization.stripeSubscriptionId && Date.parse(organization.trialEndsAt || '') > Date.now() + (48 * 60 + 35) * 60000;

  const startCheckout = async () => {
    if (mode !== 'firebase') {
      setError('Billing is disabled in the local demo workspace.');
      return;
    }
    setCheckoutLoading(true);
    setError('');
    try {
      const createCheckout = httpsCallable<unknown, CheckoutResponse>(getFirebaseServices().functions, 'createStripeCheckoutSession');
      const response = await createCheckout({
        organizationId: organization.id,
        tier: 'starter',
        requestId: crypto.randomUUID(),
        acceptImmediateCharge,
      });
      if (!response.data.url) throw new Error('Stripe Checkout is unavailable.');
      window.location.assign(response.data.url);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to start Stripe Checkout.');
      setCheckoutLoading(false);
    }
  };

  const openPortal = async () => {
    if (mode !== 'firebase') {
      setError('Billing is disabled in the local demo workspace.');
      return;
    }
    setPortalLoading(true);
    setError('');
    try {
      const createPortal = httpsCallable<unknown, PortalResponse>(getFirebaseServices().functions, 'createStripePortalSession');
      const response = await createPortal({ organizationId: organization.id });
      window.location.assign(response.data.url);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to open the Stripe billing portal.');
      setPortalLoading(false);
    }
  };

  const handleDeleteWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    setDeleteLoading(true);
    setDeleteError('');
    try {
      if (deleteConfirmText.trim() !== 'DELETE' && deleteConfirmText.trim() !== organization.name) {
        throw new Error('Please type DELETE or the company name to confirm.');
      }
      await requestWorkspaceDeletion(deleteConfirmText.trim(), deleteReason.trim());
      setDeleteModalOpen(false);
    } catch (cause) {
      setDeleteError(cause instanceof Error ? cause.message : 'Unable to request workspace deletion.');
      setDeleteLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-orange-500/30 bg-gradient-to-br from-carbon-900 to-carbon-950 p-6 shadow-xl">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded border border-orange-500/35 bg-orange-500/10 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-orange-300">
                Billing status
              </span>
              <span className="text-xs font-semibold capitalize text-slate-300">{status.replace('_', ' ')}</span>
            </div>
            <h2 className="mt-3 text-2xl font-black text-white">FieldLedger Starter</h2>
            <p className="mt-1 text-sm text-slate-400">One workspace configured for {snapshot.configs[organization.vertical].displayName.toLowerCase()}.</p>
            {organization.currentPeriodEnd && <p className="mt-2 text-xs text-slate-500">Current period ends {new Date(organization.currentPeriodEnd).toLocaleDateString()}.</p>}
          </div>
          {hasStripeCustomer && canManageBilling && (
            <button type="button" onClick={openPortal} disabled={portalLoading} className="secondary-button justify-center">
              {portalLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
              Manage billing
              <ExternalLink className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </section>

      {organization.paymentAlert && (
        <div role="alert" className="rounded-xl border border-rose-400/30 bg-rose-400/10 p-4 text-sm text-rose-200">
          {organization.paymentAlert}
        </div>
      )}
      {error && <div role="alert" className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-100">{error}</div>}

      <section className="grid gap-5 lg:grid-cols-[1fr_.7fr]">
        <div className="rounded-2xl border border-carbon-800 bg-carbon-900/70 p-6">
          <p className="text-xs font-black uppercase tracking-[.16em] text-orange-300">Simple launch pricing</p>
          <div className="mt-4 flex items-end gap-2">
            <span className="text-5xl font-black tracking-tight text-white">$49</span>
            <span className="pb-1 text-sm text-slate-400">per month</span>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-slate-400">Your 14-day trial starts when you create the workspace. {carryTrial ? `Checkout preserves the trial through ${new Date(organization.trialEndsAt!).toLocaleDateString()}.` : 'Starting a paid plan charges $49/month immediately. You may continue any remaining workspace trial before subscribing.'} Manage subscriptions and invoices on Stripe-hosted pages.</p>
          {canCheckout && canManageBilling && !carryTrial && <label className="flex items-start gap-3 text-sm text-slate-300 mt-4"><input type="checkbox" checked={acceptImmediateCharge} onChange={event => setAcceptImmediateCharge(event.target.checked)} className="mt-1" />Start the $49/month paid plan now and end any remaining free trial.</label>}
          {canCheckout && canManageBilling && (
            <button type="button" onClick={startCheckout} disabled={checkoutLoading || (!carryTrial && !acceptImmediateCharge)} className="primary-button mt-6 justify-center">
              {checkoutLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
              Continue to secure checkout
              <ArrowUpRight className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="rounded-2xl border border-carbon-800 bg-carbon-900/70 p-6">
          <h3 className="font-black text-white">Included</h3>
          <div className="mt-4 space-y-3">
            {FEATURES.map((feature) => (
              <div key={feature} className="flex items-start gap-2.5 text-sm text-slate-300">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-orange-300" />
                <span>{feature}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {isOwner && (
        <section className="rounded-2xl border border-rose-500/20 bg-rose-950/10 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-rose-300 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                Danger Zone: Workspace Teardown
              </h3>
              <p className="text-xs text-slate-400 mt-1 max-w-xl">
                Request permanent deactivation and deletion of this workspace. Active subscriptions must be canceled first. All historical field records, audit events, and technician access will be suspended.
              </p>
            </div>
            <button
              type="button"
              onClick={() => { setDeleteModalOpen(true); setDeleteError(''); }}
              className="px-4 py-2.5 rounded-xl border border-rose-500/30 text-rose-300 hover:bg-rose-500/10 text-xs font-bold transition-colors shrink-0 flex items-center gap-2"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Request Deletion…
            </button>
          </div>
        </section>
      )}

      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm p-4 grid place-items-center">
          <div role="dialog" aria-modal="true" className="w-full max-w-lg rounded-2xl border border-rose-500/30 bg-[#101620] p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-white/8">
              <h2 className="font-bold text-lg text-rose-300 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-400" />
                Request Workspace Deletion
              </h2>
              <button
                type="button"
                onClick={() => setDeleteModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-500 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleDeleteWorkspace} className="mt-4 space-y-4">
              <p className="text-sm text-slate-300 leading-relaxed">
                This action will schedule <strong className="text-white">{organization.name}</strong> for deletion and immediately suspend access for all technicians.
              </p>

              {status === 'active' && (
                <div role="alert" className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-3 text-xs text-amber-200">
                  You have an active paying subscription. Please cancel your subscription via <strong>Manage billing</strong> before requesting deletion.
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Reason for leaving (optional)
                </label>
                <input
                  type="text"
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  placeholder="e.g. Business closing or changing software"
                  className="w-full rounded-xl border border-white/10 bg-[#090d14] px-3.5 py-2.5 text-xs text-white outline-none focus:border-rose-400/60"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  To confirm, type <span className="font-mono text-rose-300 font-bold">DELETE</span> below:
                </label>
                <input
                  type="text"
                  required
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="DELETE"
                  className="w-full rounded-xl border border-white/10 bg-[#090d14] px-3.5 py-2.5 text-sm text-white font-mono outline-none focus:border-rose-400/60"
                />
              </div>

              {deleteError && (
                <p role="alert" className="text-xs text-rose-300">{deleteError}</p>
              )}

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={deleteLoading || (status === 'active' && mode === 'firebase')}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white disabled:opacity-50 transition-colors flex items-center gap-1.5"
                >
                  {deleteLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  Confirm Deletion Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <p className="text-xs leading-relaxed text-slate-500">Taxes are not automatically calculated until the business determines its registration obligations and configures Stripe Tax appropriately.</p>
    </div>
  );
};

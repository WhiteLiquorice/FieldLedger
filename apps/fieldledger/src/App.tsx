import React, { useEffect, useMemo, useRef, useState } from 'react';
import { evaluateEntitlement } from '@compliance-saas/backend-core';
import {
  AlertTriangle, ArrowRight, BarChart3, Building2, CalendarDays, Check, CheckCircle2,
  ChevronDown, ClipboardCheck, CreditCard, Download, Droplets, FileText, Flame, Gauge, Layers3,
  LogOut, MapPin, Menu, PackageSearch, Plus, RotateCcw, Search, Settings2, ShieldCheck,
  Sparkles, Users, X,
} from 'lucide-react';
import type { AssetRecord, AssetServiceResult, JobRecord, ReportRecord, Vertical } from './domain';
import { OperationsProvider, useOperations } from './context/OperationsContext';
import { FieldLedgerLogo } from './components/FieldLedgerLogo';
import { SubscriptionBillingPortal } from './components/SubscriptionBillingPortal';
import { InstallPwaBanner } from './components/InstallPwaBanner';
import { DataExportPanel } from './components/DataExportPanel';
import { RescheduleStop } from './components/RescheduleStop';
import { RecordEditors } from './components/RecordEditors';
import { ReportAddendum } from './components/ReportAddendum';
import { RecurringVisits } from './components/RecurringVisits';
import { TeamManagementView } from './components/TeamManagementView';
import { useJobDraft } from './lib/use-job-draft';
import { CustomerImportPanel } from './components/CustomerImportPanel';
import { DownloadReportButton } from './components/DownloadReportButton';
import { EmailVerificationScreen } from './components/EmailVerificationScreen';
import { PhoneTutorial } from './components/PhoneTutorial';
import { formatServiceDate as formatDate } from './lib/format-service-date';


const verticalMeta: Record<Vertical, { short: string; icon: React.ElementType; accent: string; soft: string; border: string }> = {
  extinguisher: { short: 'Extinguishers', icon: Flame, accent: 'text-orange-300', soft: 'bg-orange-400/10', border: 'border-orange-300/25' },
  hood_cleaning: { short: 'Hood cleaning', icon: Layers3, accent: 'text-violet-300', soft: 'bg-violet-400/10', border: 'border-violet-300/25' },
  grease_trap: { short: 'Grease service', icon: Droplets, accent: 'text-cyan-300', soft: 'bg-cyan-400/10', border: 'border-cyan-300/25' },
};

function escapeHtml(value: unknown) {
  return String(value ?? '').replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character] || character);
}

function VerticalSelector({ selected, onChange }: { selected: Vertical | null; onChange: (vertical: Vertical) => void }) {
  const list: Array<{ id: Vertical; title: string; subtitle: string; standard: string; icon: React.ElementType }> = [
    { id: 'extinguisher', title: 'Fire Extinguishers', subtitle: 'Barcode assets, service observations, photos, and recurring work', standard: 'Fire service', icon: Flame },
    { id: 'hood_cleaning', title: 'Kitchen Hood Cleaning', subtitle: 'Before-and-after photos, system notes, and recurring visits', standard: 'Hood service', icon: Layers3 },
    { id: 'grease_trap', title: 'Grease Trap & Interceptors', subtitle: 'Pumped quantities, condition records, and service history', standard: 'Grease service', icon: Droplets },
  ];

  return (
    <div className="space-y-2.5">
      {list.map((item) => {
        const isChecked = selected === item.id;
        const Icon = item.icon;
        return (
          <button
            type="button"
            key={item.id}
            onClick={() => onChange(item.id)}
            className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-start gap-3.5 ${
              isChecked
                ? 'border-orange-300/40 bg-orange-400/10 shadow-md shadow-orange-950/20'
                : 'border-white/8 bg-[#090d14]/60 opacity-60 hover:opacity-100 hover:border-white/15'
            }`}
          >
            <div className={`w-9 h-9 rounded-lg grid place-items-center mt-0.5 shrink-0 ${isChecked ? 'bg-orange-300 text-slate-950 font-bold' : 'bg-white/5 text-slate-400'}`}>
              <Icon className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className="font-bold text-xs text-white">{item.title}</p>
                <span className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/5 text-slate-400 border border-white/8">
                  {item.standard}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">{item.subtitle}</p>
            </div>
            <div className={`w-4 h-4 rounded border flex items-center justify-center mt-1 shrink-0 ${isChecked ? 'border-orange-300 bg-orange-300 text-slate-950' : 'border-white/20'}`}>
              {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
            </div>
          </button>
        );
      })}
    </div>
  );
}

function AuthScreen() {
  const { signIn, register, resetPassword, acceptInvitation, loading } = useOperations();
  const inviteToken = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('token') || (params.get('mode') === 'invite' ? params.get('inviteToken') : null);
  }, []);

  const [createMode, setCreateMode] = useState<boolean>(() => {
    if (inviteToken) return false;
    const params = new URLSearchParams(window.location.search);
    if (params.get('mode') === 'signin') return false;
    return true;
  });
  const [email, setEmail] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('email') || '';
  });
  const [password, setPassword] = useState('');
  const [company, setCompany] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('company') || '';
  });
  const [vertical, setVertical] = useState<Vertical | null>(() => {
    const params = new URLSearchParams(window.location.search);
    const trade = params.get('vertical') || params.get('trade');
    if (trade === 'hood' || trade === 'hood_cleaning' || trade === 'hood-cleaning') return 'hood_cleaning';
    if (trade === 'grease' || trade === 'grease_trap' || trade === 'grease-trap') return 'grease_trap';
    if (trade === 'extinguisher' || trade === 'fire-extinguisher') return 'extinguisher';
    return null;
  });
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const recover = async () => {
    setError('');
    try {
      await resetPassword(email);
      setNotice('If this email has an account, a password reset link has been sent.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to send a reset link.');
    }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    try {
      if (inviteToken) {
        if (createMode) {
          await register(email, password, 'Team Member', 'extinguisher');
        } else await signIn(email, password);
      } else if (createMode) {
        if (!vertical) throw new Error('Choose the service your company provides.');
        await register(email, password, company, vertical);
      } else {
        await signIn(email, password);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to continue.');
    }
  };

  return (
    <main className="min-h-screen grid lg:grid-cols-[1.15fr_.85fr] bg-[#080b11] text-slate-100">
      <section className="hidden lg:flex relative overflow-hidden p-14 flex-col justify-between border-r border-white/8">
        <div className="absolute inset-0 opacity-70 bg-[radial-gradient(circle_at_25%_15%,rgba(251,146,60,.18),transparent_36%),radial-gradient(circle_at_75%_70%,rgba(34,211,238,.13),transparent_34%)]" />
        <div className="relative flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white text-slate-950 grid place-items-center"><ClipboardCheck className="w-5 h-5" /></div>
          <span className="font-black tracking-[-.03em] text-xl">FieldLedger</span>
        </div>
        <div className="relative max-w-xl">
          <p className="uppercase text-xs tracking-[.22em] text-orange-300 font-bold">{inviteToken ? 'Team Invitation' : '14-Day Free Trial'}</p>
          <h1 className="text-5xl xl:text-6xl font-black tracking-[-.055em] leading-[.98] mt-5">
            {inviteToken ? 'Join Your Field Service Team.' : 'Faster Inspections. Zero Paperwork.'}
          </h1>
          <p className="text-slate-300 text-lg leading-relaxed mt-6 max-w-lg">
            {inviteToken
              ? 'Accept your team invitation to access assigned stops, record barcode assets, and complete service reports.'
              : 'Built for specialized contractors who need structured field records, photos, recurring work, and customer-ready service records.'}
          </p>
        </div>
        <p className="relative text-xs text-slate-500">FieldLedger documents operator-entered work and observations.</p>
      </section>
      <section className="flex items-center justify-center p-6 sm:p-10">
        <form onSubmit={submit} className="w-full max-w-lg p-7 sm:p-9 rounded-[2rem] bg-[#101620] border border-white/10 shadow-2xl shadow-black/40">
          <div className="lg:hidden flex items-center gap-2 mb-6"><ClipboardCheck className="w-5 h-5 text-orange-300" /><span className="font-black text-lg">FieldLedger</span></div>

          {!inviteToken && (
            <div className="flex items-center gap-2.5 rounded-xl bg-orange-500/15 border border-orange-500/30 p-3 mb-6">
              <Sparkles className="w-4 h-4 text-orange-400 shrink-0" />
              <p className="text-xs text-orange-200 font-medium leading-relaxed">
                <strong className="text-white font-bold">14-Day Starter Trial:</strong> Field records, photo evidence, recurring work, and downloadable service records included.
              </p>
            </div>
          )}

          <p className="text-xs uppercase tracking-[.18em] text-slate-500 font-bold">
            {inviteToken ? 'Invitation Acceptance' : createMode ? 'Step 1 of 2 · Company account' : 'Welcome back'}
          </p>
          <h2 className="text-3xl font-black tracking-[-.04em] mt-1">
            {inviteToken ? 'Accept your invitation' : createMode ? 'Set up your field team' : 'Sign in to operations'}
          </h2>
          <div className="space-y-4 mt-6">
            {!inviteToken && createMode && <TextField label="Company name" value={company} onChange={setCompany} autoComplete="organization" />}
            <TextField label="Email" value={email} onChange={setEmail} type="email" autoComplete="email" />
            <TextField label="Password" value={password} onChange={setPassword} type="password" autoComplete={createMode || inviteToken ? 'new-password' : 'current-password'} />
            {!inviteToken && createMode && (
              <div className="pt-2">
                <p className="text-xs font-semibold text-slate-300 mb-2.5">Choose your company’s primary service:</p>
                <VerticalSelector selected={vertical} onChange={setVertical} />
                <p className="mt-2 text-[11px] text-slate-500">This choice configures your workspace and is not shown as a switch inside the app.</p>
              </div>
            )}
          </div>
          {error && <div className="mt-4 rounded-xl border border-rose-300/20 bg-rose-400/10 p-3 text-xs text-rose-200">{error}</div>}
          <button disabled={loading} className="mt-6 w-full rounded-xl bg-orange-500 hover:bg-orange-400 text-white font-black py-3.5 flex items-center justify-center gap-2 transition-all duration-200 active:scale-[.98] disabled:opacity-50 shadow-lg shadow-orange-500/30">
            {loading ? 'Working…' : createMode ? 'Create account and continue' : 'Sign in'} <ArrowRight className="w-4 h-4" />
          </button>
          {notice && <p role="status" className="mt-3 text-sm text-emerald-300">{notice}</p>}
          {inviteToken && <button type="button" onClick={() => setCreateMode(value => !value)} className="mt-5 w-full text-sm text-orange-300">{createMode ? 'Already have an account? Sign in' : 'New here? Create your account'}</button>}
          {!inviteToken && !createMode && <button type="button" onClick={recover} className="mt-4 text-sm text-orange-300">Forgot password?</button>}
          {!inviteToken && (
            <button type="button" onClick={() => setCreateMode((value) => !value)} className="mt-5 w-full text-sm text-slate-400 hover:text-white transition-colors">
              {createMode ? 'Already have an account? Sign in' : 'New team? Start 14-Day Free Trial'}
            </button>
          )}
        </form>
      </section>
    </main>
  );
}

function OnboardingScreen() {
  const { createWorkspace, signOutUser, acceptInvitation } = useOperations();
  const [company, setCompany] = useState('');
  const [vertical, setVertical] = useState<Vertical | null>(null);
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zip, setZip] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  
  const [isInviteMode, setIsInviteMode] = useState(() => new URLSearchParams(window.location.search).has('token'));
  const [inviteTokenInput, setInviteTokenInput] = useState(() => new URLSearchParams(window.location.search).get('token') || '');
  
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setWorking(true);
    setError('');
    try {
      if (isInviteMode) {
        if (!inviteTokenInput.trim()) throw new Error('Enter an invitation token.');
        await acceptInvitation(inviteTokenInput.trim());
        window.history.replaceState({}, document.title, window.location.pathname);
        window.location.reload();
        return;
      }
      if (!vertical) throw new Error('Choose the primary service your company provides.');
      if (!company.trim()) throw new Error('Company name is required.');
      if (!phone.trim()) throw new Error('Business phone is required.');
      if (!address.trim()) throw new Error('Street address is required.');
      if (!city.trim()) throw new Error('City is required.');
      if (!state.trim()) throw new Error('State is required.');
      if (!zip.trim()) throw new Error('Postal code is required.');

      await createWorkspace({
        companyName: company.trim(),
        vertical,
        phone: phone.trim(),
        address: address.trim(),
        city: city.trim(),
        state: state.trim(),
        zip: zip.trim(),
        licenseNumber: licenseNumber.trim() || undefined,
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to complete setup.');
      setWorking(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#080b11] text-slate-100 grid place-items-center p-6">
      <form onSubmit={submit} className="w-full max-w-xl rounded-[2rem] border border-white/10 bg-[#101620] p-8 shadow-2xl">
        <div className="w-11 h-11 rounded-xl bg-orange-300 text-slate-950 grid place-items-center">
          <Building2 className="w-5 h-5" />
        </div>
        <p className="mt-6 text-xs uppercase tracking-[.18em] text-orange-200 font-bold">
          {isInviteMode ? 'Team Invitation' : 'One final setup step'}
        </p>
        <h1 className="text-3xl font-black tracking-[-.04em] mt-2">
          {isInviteMode ? 'Join existing team' : 'Set up your field workspace'}
        </h1>
        <p className="text-slate-400 mt-2 text-sm leading-relaxed">
          {isInviteMode
            ? 'Paste the invitation token provided by your team manager to join their workspace.'
            : 'Configure your company profile and service vertical for customer inspection records.'}
        </p>

        {isInviteMode ? (
          <div className="mt-6 space-y-5">
            <TextField
              label="Invitation token"
              value={inviteTokenInput}
              onChange={setInviteTokenInput}
              placeholder="e.g. inv_tok_..."
            />
          </div>
        ) : (
          <div className="mt-6 space-y-5">
            <TextField label="Company name" value={company} onChange={setCompany} autoComplete="organization" />
            <div>
              <p className="text-xs font-semibold text-slate-300 mb-2.5">Primary service:</p>
              <VerticalSelector selected={vertical} onChange={setVertical} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <TextField label="Business phone" value={phone} onChange={setPhone} type="tel" autoComplete="tel" />
              <TextField
                label="License / Cert # (optional)"
                value={licenseNumber}
                onChange={setLicenseNumber}
                required={false}
                placeholder="e.g. ROC-12345"
              />
            </div>
            <TextField label="Street address" value={address} onChange={setAddress} autoComplete="street-address" />
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-1">
                <TextField label="City" value={city} onChange={setCity} autoComplete="address-level2" />
              </div>
              <div>
                <TextField label="State" value={state} onChange={setState} autoComplete="address-level1" placeholder="e.g. CA" />
              </div>
              <div>
                <TextField label="ZIP code" value={zip} onChange={setZip} autoComplete="postal-code" placeholder="e.g. 90210" />
              </div>
            </div>
          </div>
        )}

        {error && <p className="mt-4 text-sm text-rose-300">{error}</p>}

        <button disabled={working} className="primary-button mt-6 w-full justify-center">
          {working ? 'Processing…' : isInviteMode ? 'Join team workspace' : 'Create secure workspace'} <ArrowRight className="w-4 h-4" />
        </button>

        <div className="mt-4 flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={() => { setIsInviteMode(!isInviteMode); setError(''); }}
            className="text-xs text-orange-300 hover:text-orange-200 transition-colors"
          >
            {isInviteMode ? '← Back to create new workspace' : 'Have an invitation token? Join existing team instead'}
          </button>
          <button type="button" onClick={signOutUser} className="text-xs text-slate-500 hover:text-white">
            Sign out
          </button>
        </div>
      </form>
    </main>
  );
}

function TextField({
  label,
  value,
  onChange,
  type = 'text',
  autoComplete,
  required = true,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  autoComplete?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="block text-sm font-semibold text-slate-300">
      {label}
      <input
        required={required}
        type={type}
        autoComplete={autoComplete}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-xl border border-white/10 bg-[#090d14] px-4 py-3 text-white outline-none transition-all focus:border-orange-300/60 focus:ring-4 focus:ring-orange-300/5"
      />
    </label>
  );
}


function Shell() {
  const { mode, snapshot, user, loading, error, needsOnboarding, activeVertical, view, setView, signOutUser } = useOperations();
  const [mobileNav, setMobileNav] = useState(false);
  const meta = verticalMeta[activeVertical];
  const Icon = meta.icon;
  if (mode === 'firebase' && error && !user && !loading) return <ConfigurationError message={error} />;
  if (mode === 'firebase' && !user && !loading) return <AuthScreen />;
  if (mode === 'firebase' && user && !user.emailVerified && !loading) return <EmailVerificationScreen />;
  if (mode === 'firebase' && user && needsOnboarding && !loading) return <OnboardingScreen />;

  const nav = [
    { id: 'dashboard' as const, label: 'Command center', icon: BarChart3 },
    { id: 'assets' as const, label: 'Assets & systems', icon: PackageSearch },
    { id: 'work' as const, label: 'Field work', icon: ClipboardCheck },
    { id: 'team' as const, label: 'Team & Dispatch', icon: Users },
    { id: 'compliance' as const, label: 'Data export', icon: Download },
    { id: 'reports' as const, label: 'Service records', icon: FileText },
    { id: 'settings' as const, label: 'Workflow settings', icon: Settings2 },
    { id: 'billing' as const, label: 'Plan & billing', icon: CreditCard },
  ];

  return (
    <div className="min-h-screen bg-carbon-950 text-slate-100 selection:bg-orange-500/30 overflow-x-hidden">
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_20%_-10%,rgba(249,115,22,.08),transparent_30%),radial-gradient(circle_at_100%_30%,rgba(6,182,212,.06),transparent_28%)]" />
      <aside className={`fixed z-40 inset-y-0 left-0 w-72 bg-carbon-900/95 backdrop-blur-xl border-r border-carbon-800 p-5 flex flex-col transition-transform lg:translate-x-0 ${mobileNav ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between pb-4 border-b border-carbon-800">
          <FieldLedgerLogo size={30} />
          <button aria-label="Close navigation" className="lg:hidden p-2 text-slate-400 hover:text-white" onClick={() => setMobileNav(false)}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="mt-6 space-y-1">
          {nav.map((item) => (
            <button
              key={item.id}
              onClick={() => { setView(item.id); setMobileNav(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                view === item.id
                  ? 'bg-orange-500/15 text-orange-400 font-bold border border-orange-500/30 shadow-sm'
                  : 'text-slate-400 hover:bg-carbon-850 hover:text-slate-200 border border-transparent'
              }`}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="mt-auto rounded-2xl border border-carbon-800 bg-carbon-850 p-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 text-slate-950 grid place-items-center font-black">
              {snapshot.organization.name.slice(0, 1) || 'F'}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold truncate text-white">{snapshot.organization.name || 'Loading workspace'}</p>
              <p className="text-[11px] text-slate-400 font-mono">{mode === 'demo' ? 'Demo workspace' : user?.email}</p>
            </div>
          </div>
          {mode === 'firebase' && (
            <button
              onClick={signOutUser}
              className="mt-3 w-full flex items-center justify-center gap-2 rounded-lg py-2 text-xs text-slate-400 hover:text-white hover:bg-carbon-800 transition-all font-mono"
            >
              <LogOut className="w-3.5 h-3.5" />Sign out
            </button>
          )}
        </div>
      </aside>

      <div className="relative lg:pl-72 min-h-screen">
        <header className="sticky top-0 z-30 h-16 px-4 sm:px-7 border-b border-carbon-800 bg-carbon-950/85 backdrop-blur-xl flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button aria-label="Open navigation" onClick={() => setMobileNav(true)} className="lg:hidden p-2 rounded-lg bg-carbon-850 border border-carbon-700 shrink-0">
              <Menu className="w-5 h-5" />
            </button>
            
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <div className={`w-8 h-8 rounded-lg grid place-items-center shrink-0 ${meta.soft} ${meta.accent}`}><Icon className="w-4 h-4" /></div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-black text-white max-w-[100px] sm:max-w-none truncate">{snapshot.configs[activeVertical].displayName}</p>
                <p className="text-[10px] text-slate-400 hidden sm:block truncate">{snapshot.configs[activeVertical].coreQuestion}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            <button
              onClick={() => setView('billing')}
              className="inline-flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg border border-orange-500/40 bg-orange-500/15 text-orange-400 text-xs font-mono font-bold hover:bg-orange-500/25 transition-colors shadow-sm"
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">
                {snapshot.organization.subscriptionStatus === 'active' ? 'Starter plan active' : snapshot.organization.subscriptionStatus === 'trialing' ? '14-day Starter trial' : 'Billing setup'}
              </span>
              <span className="sm:hidden">
                {snapshot.organization.subscriptionStatus === 'active' ? 'Starter' : 'Trial'}
              </span>
            </button>
            <span className={`text-[10px] uppercase tracking-[.14em] font-black rounded-full px-2 sm:px-2.5 py-1 border ${mode === 'demo' ? 'text-amber-200 border-amber-300/20 bg-amber-300/10' : 'text-emerald-200 border-emerald-300/20 bg-emerald-300/10'}`}>{mode}</span>
            <ShieldCheck className="w-4 h-4 text-slate-500 hidden sm:block" />
          </div>
        </header>

        <main className="p-4 sm:p-7 lg:p-9 max-w-[1500px] mx-auto">
          {!loading && <PhoneTutorial />}
          {error && <div className="mb-5 p-4 rounded-xl border border-rose-300/20 bg-rose-400/10 text-rose-200 text-sm">{error}</div>}
          {loading ? (
            <LoadingState />
          ) : mode === 'firebase' && !evaluateEntitlement(snapshot.organization).entitled && !['reports', 'compliance', 'billing'].includes(view) ? (
            <SubscriptionBillingPortal />
          ) : view === 'dashboard' ? (
            <Dashboard />
          ) : view === 'assets' ? (
            <Assets />
          ) : view === 'work' ? (
            <FieldWork />
          ) : view === 'team' ? (
            <TeamManagementView />
          ) : view === 'compliance' ? (
            <DataExportPanel />
          ) : view === 'reports' ? (
            <Reports />
          ) : view === 'billing' ? (
            <SubscriptionBillingPortal />
          ) : (
            <WorkflowSettings />
          )}
        </main>
      </div>
    </div>
  );
}

function ConfigurationError({ message }: { message: string }) {
  return <main className="min-h-screen bg-[#080b11] text-slate-100 grid place-items-center p-6"><section className="max-w-xl rounded-[2rem] border border-amber-300/20 bg-[#101620] p-8 shadow-2xl"><AlertTriangle className="w-7 h-7 text-amber-300" /><p className="mt-6 text-xs uppercase tracking-[.18em] text-amber-200 font-bold">Production configuration required</p><h1 className="text-3xl font-black tracking-[-.04em] mt-2">FieldLedger stopped safely.</h1><p className="text-slate-400 leading-relaxed mt-4">{message}</p><p className="text-xs text-slate-600 mt-6">Set the documented Firebase and App Check environment values. Demo data is never used as an automatic production fallback.</p></section></main>;
}

function LoadingState() {
  return <div className="space-y-4">{[1, 2, 3].map((item) => <div key={item} className="h-28 rounded-2xl bg-white/[.04] animate-pulse border border-white/5" />)}</div>;
}

function Dashboard() {
  const { snapshot, activeVertical, setView } = useOperations();
  const assets = snapshot.assets.filter((asset) => asset.vertical === activeVertical);
  const jobs = snapshot.jobs.filter((job) => job.vertical === activeVertical);
  const due = assets.filter((asset) => asset.status === 'due_soon' || asset.status === 'overdue' || asset.status === 'service_required');
  const completed = jobs.filter((job) => job.status === 'completed').length;
  const config = snapshot.configs[activeVertical];
  const metrics = [
    { label: config.assetLabelPlural, value: assets.length, detail: 'Tracked in this workspace', icon: PackageSearch },
    { label: 'Needs attention', value: due.length, detail: `${due.filter((item) => item.status === 'overdue').length} overdue`, icon: AlertTriangle },
    { label: 'Open field work', value: jobs.filter((job) => job.status !== 'completed' && job.status !== 'cancelled').length, detail: 'Scheduled or in progress', icon: CalendarDays },
    { label: 'Completed records', value: completed, detail: 'In current workspace', icon: FileText },
  ];
  return <div className="space-y-7">
    <section className="flex flex-col md:flex-row md:items-end justify-between gap-5"><div><p className="text-xs uppercase tracking-[.18em] text-slate-500 font-bold">Live operations</p><h1 className="text-3xl sm:text-4xl font-black tracking-[-.045em] mt-2">What needs attention now</h1><p className="text-slate-400 mt-2 max-w-2xl">Due work, unresolved exceptions, and field progress for {config.displayName.toLowerCase()}.</p></div><button onClick={() => setView('work')} className="rounded-xl bg-white text-slate-950 font-black text-sm px-5 py-3 flex items-center justify-center gap-2 hover:bg-slate-200 active:scale-[.98] transition-all">Open field queue <ArrowRight className="w-4 h-4" /></button></section>
    <section className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">{metrics.map((metric) => <div key={metric.label} className="group p-5 rounded-2xl border border-white/8 bg-[#101620]/80 hover:border-white/15 transition-all"><div className="flex items-center justify-between"><metric.icon className="w-4 h-4 text-slate-500 group-hover:text-orange-300 transition-colors" /><span className="text-3xl font-black tracking-[-.04em]">{metric.value}</span></div><p className="font-bold mt-5">{metric.label}</p><p className="text-xs text-slate-500 mt-1">{metric.detail}</p></div>)}</section>
    <section className="grid xl:grid-cols-[1.35fr_.65fr] gap-5">
      <div className="rounded-2xl border border-white/8 bg-[#101620]/75 overflow-hidden"><div className="p-5 border-b border-white/8 flex items-center justify-between"><div><h2 className="font-black">Due queue</h2><p className="text-xs text-slate-500 mt-1">Sorted by operational urgency</p></div><button onClick={() => setView('assets')} className="text-xs font-bold text-slate-400 hover:text-white">View inventory</button></div><div className="divide-y divide-white/6">{due.length ? due.slice(0, 6).map((asset) => <AssetRow key={asset.id} asset={asset} />) : <EmptyState text="No assets currently need attention." />}</div></div>
      <div className="rounded-2xl border border-white/8 bg-gradient-to-b from-[#121a26] to-[#0d121b] p-6"><Sparkles className="w-5 h-5 text-orange-300" /><h2 className="font-black text-xl mt-5 tracking-[-.025em]">The operating question</h2><p className="text-slate-300 leading-relaxed mt-3">{config.coreQuestion}</p><div className="mt-7 pt-5 border-t border-white/8"><p className="text-[10px] uppercase tracking-[.16em] text-slate-600 font-bold">Next proof point</p><p className="text-sm text-slate-400 mt-2">Complete a real service record and schedule the next visit before the crew leaves.</p></div></div>
    </section>
  </div>;
}

function AssetRow({ asset }: { asset: AssetRecord }) {
  const { snapshot } = useOperations();
  const site = snapshot.sites.find((item) => item.id === asset.siteId);
  const tone = asset.status === 'overdue' || asset.status === 'service_required' ? 'text-rose-300 bg-rose-400/10 border-rose-300/20' : asset.status === 'due_soon' ? 'text-amber-200 bg-amber-300/10 border-amber-300/20' : 'text-emerald-200 bg-emerald-300/10 border-emerald-300/20';
  return <div className="p-4 sm:px-5 flex items-center gap-4 hover:bg-white/[.025] transition-colors"><div className="w-10 h-10 rounded-xl bg-white/5 grid place-items-center"><Gauge className="w-4 h-4 text-slate-400" /></div><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><p className="font-bold text-sm truncate">{asset.name}</p><span className="font-mono text-[10px] text-slate-600">{asset.assetCode}</span></div><p className="text-xs text-slate-500 mt-1 truncate">{site?.siteName} · {asset.location}</p></div><div className="text-right hidden sm:block"><p className="text-xs font-semibold">{formatDate(asset.nextServiceDueAt)}</p><p className="text-[10px] text-slate-600 mt-1">Next service</p></div><span className={`text-[10px] uppercase tracking-[.12em] font-black px-2 py-1 rounded-full border ${tone}`}>{asset.status.replace('_', ' ')}</span></div>;
}

function Assets() {
  const { snapshot, activeVertical, addAsset, addCustomerSite } = useOperations();
  const [saveError,setSaveError] = useState('');
  const [busy,setBusy] = useState(false);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [customerOpen, setCustomerOpen] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [form, setForm] = useState({ siteId: '', assetCode: '', name: '', location: '', scheduleInterval: snapshot.configs[activeVertical].schedule.interval, serialNumber: '', manufacturer: '', model: '', capacity: 1, manufactureYear: new Date().getFullYear(), trapType: 'gravity', cookingVolume: 'medium' });
  const [customerForm, setCustomerForm] = useState({ businessName: '', siteName: '', address: '', city: '', state: '', contactName: '', contactEmail: '', contactPhone: '' });
  const assets = snapshot.assets.filter((asset) => asset.vertical === activeVertical && `${asset.assetCode} ${asset.name} ${asset.location}`.toLowerCase().includes(search.toLowerCase()));
  const submit = async (event: React.FormEvent) => { event.preventDefault(); setSaveError('');setBusy(true);try {await addAsset(form); setOpen(false); setForm({ siteId: '', assetCode: '', name: '', location: '', scheduleInterval: snapshot.configs[activeVertical].schedule.interval, serialNumber: '', manufacturer: '', model: '', capacity: 1, manufactureYear: new Date().getFullYear(), trapType: 'gravity', cookingVolume: 'medium' });}catch(cause){setSaveError(cause instanceof Error?cause.message:'Could not save asset.');}finally{setBusy(false);} };
  const submitCustomer = async (event: React.FormEvent) => { event.preventDefault();setSaveError('');setBusy(true);try {const siteId = await addCustomerSite(customerForm); setCustomerOpen(false); setForm((current) => ({ ...current, siteId })); setOpen(true); setCustomerForm({ businessName: '', siteName: '', address: '', city: '', state: '', contactName: '', contactEmail: '', contactPhone: '' });}catch(cause){setSaveError(cause instanceof Error?cause.message:'Could not save customer site.');}finally{setBusy(false);} };
  return <div className="space-y-6"><CustomerImportPanel />{saveError && <p role="alert" className="text-rose-300">{saveError}</p>}{busy && <p role="status">Saving…</p>}<FirstResultGuide /><PageTitle eyebrow="Asset registry" title={snapshot.configs[activeVertical].assetLabelPlural} description="Searchable service history and recurrence settings for every tracked unit." action={<div className="flex flex-wrap gap-2"><button onClick={() => setCustomerOpen(true)} className="secondary-button"><Building2 className="w-4 h-4" />Add customer site</button><button onClick={() => setOpen(true)} className="primary-button"><Plus className="w-4 h-4" />Add {snapshot.configs[activeVertical].assetLabel}</button></div>} />
    <div className="rounded-2xl border border-white/8 bg-[#101620]/75 overflow-hidden"><div className="p-4 border-b border-white/8 flex flex-col sm:flex-row gap-3"><div className="relative max-w-md flex-1"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search code, name, or location" className="field pl-10" /></div>{activeVertical === 'extinguisher' && <button onClick={() => setScannerOpen(true)} className="secondary-button justify-center"><PackageSearch className="w-4 h-4" />Scan QR or barcode</button>}</div><div className="divide-y divide-white/6">{assets.length ? assets.map((asset) => <AssetRow key={asset.id} asset={asset} />) : <EmptyState text="No matching assets." />}</div></div>
    {open && <Modal title={`Add ${snapshot.configs[activeVertical].assetLabel}`} onClose={() => setOpen(false)}><form onSubmit={submit} className="grid sm:grid-cols-2 gap-4"><div className="sm:col-span-2"><SelectField label="Customer site" value={form.siteId} onChange={(value) => setForm({ ...form, siteId: value })} options={[{ value: '', label: 'Select a site' }, ...snapshot.sites.map((site) => ({ value: site.id, label: site.siteName }))]} /></div><TextField label="Asset or system code" value={form.assetCode} onChange={(value) => setForm({ ...form, assetCode: value })} /><TextField label="Display name" value={form.name} onChange={(value) => setForm({ ...form, name: value })} /><div className="sm:col-span-2"><TextField label="Physical location" value={form.location} onChange={(value) => setForm({ ...form, location: value })} /></div>{activeVertical === 'extinguisher' && <><TextField label="Serial number" value={form.serialNumber} onChange={(value) => setForm({ ...form, serialNumber: value })} /><TextField label="Manufacturer" value={form.manufacturer} onChange={(value) => setForm({ ...form, manufacturer: value })} /><TextField label="Model" value={form.model} onChange={(value) => setForm({ ...form, model: value })} /><NumberField label="Capacity (lb)" value={form.capacity} onChange={(value) => setForm({ ...form, capacity: value })} /><NumberField label="Manufacture year" value={form.manufactureYear} onChange={(value) => setForm({ ...form, manufactureYear: value })} /></>}{activeVertical === 'grease_trap' && <><NumberField label="Capacity (gallons)" value={form.capacity} onChange={(value) => setForm({ ...form, capacity: value })} /><SelectField label="Unit type" value={form.trapType} onChange={(value) => setForm({ ...form, trapType: value })} options={[{ value: 'gravity', label: 'Gravity interceptor' }, { value: 'hydro', label: 'Hydromechanical' }, { value: 'indoor_interceptor', label: 'Indoor interceptor' }, { value: 'outdoor_vault', label: 'Outdoor vault' }]} /></>}{activeVertical === 'hood_cleaning' && <SelectField label="Cooking volume" value={form.cookingVolume} onChange={(value) => setForm({ ...form, cookingVolume: value })} options={[{ value: 'low', label: 'Low volume' }, { value: 'medium', label: 'Moderate volume' }, { value: 'high', label: 'High volume' }, { value: 'solid_fuel', label: 'Solid fuel' }]} />}<NumberField label={`Service interval (${snapshot.configs[activeVertical].schedule.unit})`} value={form.scheduleInterval} onChange={(value) => setForm({ ...form, scheduleInterval: value })} /><button className="primary-button sm:col-span-2 justify-center">Save asset</button></form></Modal>}
    {customerOpen && <Modal title="Add customer and site" onClose={() => setCustomerOpen(false)}><form onSubmit={submitCustomer} className="grid sm:grid-cols-2 gap-4"><div className="sm:col-span-2"><TextField label="Customer business" value={customerForm.businessName} onChange={(value) => setCustomerForm({ ...customerForm, businessName: value })} /></div><div className="sm:col-span-2"><TextField label="Site name" value={customerForm.siteName} onChange={(value) => setCustomerForm({ ...customerForm, siteName: value })} /></div><div className="sm:col-span-2"><TextField label="Street address" value={customerForm.address} onChange={(value) => setCustomerForm({ ...customerForm, address: value })} /></div><TextField label="City" value={customerForm.city} onChange={(value) => setCustomerForm({ ...customerForm, city: value })} /><TextField label="State / region" value={customerForm.state} onChange={(value) => setCustomerForm({ ...customerForm, state: value })} /><TextField label="Contact name" value={customerForm.contactName} onChange={(value) => setCustomerForm({ ...customerForm, contactName: value })} /><TextField label="Contact phone" value={customerForm.contactPhone} onChange={(value) => setCustomerForm({ ...customerForm, contactPhone: value })} /><div className="sm:col-span-2"><TextField label="Contact email" type="email" value={customerForm.contactEmail} onChange={(value) => setCustomerForm({ ...customerForm, contactEmail: value })} /></div><button className="primary-button sm:col-span-2 justify-center">Save site and add its first asset</button></form></Modal>}
    <RecordEditors />
    {scannerOpen && <BarcodeScanner onClose={() => setScannerOpen(false)} onResult={(value) => { setSearch(value); setScannerOpen(false); }} />}
  </div>;
}

function FieldWork() {
  const { snapshot, activeVertical, createJob, user, mode } = useOperations();
  const office = mode === 'demo' || ['owner', 'manager'].includes(snapshot.members.find(member => member.userId === user?.uid)?.role || '');
  const [siteId, setSiteId] = useState('');
  const [assignedTechId, setAssignedTechId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<'all' | 'mine'>('all');
  const [scheduling, setScheduling] = useState(false);
  const [scheduleError, setScheduleError] = useState('');

  const allJobs = snapshot.jobs
    .filter((job) => job.vertical === activeVertical)
    .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate));

  const filteredJobs = allJobs.filter((job) => {
    if (filterMode === 'mine') {
      return job.assignedTechId === user?.uid;
    }
    return true;
  });

  const activeJob = activeJobId ? snapshot.jobs.find((j) => j.id === activeJobId) || null : null;

  const eligibleTechs = snapshot.members.filter(
    (m) => m.active && (m.role === 'technician' || m.role === 'manager' || m.role === 'owner')
  );

  const schedule = async (event: React.FormEvent) => {
    event.preventDefault();
    setScheduleError('');
    setScheduling(true);
    try {
      const id = await createJob(siteId, date, assignedTechId || undefined);
      setActiveJobId(id);
      setSiteId('');
      setAssignedTechId('');
    } catch (cause) {
      setScheduleError(cause instanceof Error ? cause.message : 'Could not schedule service stop.');
    } finally {
      setScheduling(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageTitle
        eyebrow="Field execution"
        title="Service queue"
        description="Open the stop, account for each unit, record exceptions, and finish the service record."
      />
      {office && <RecurringVisits />}
      <div className={`grid ${office ? 'xl:grid-cols-[.7fr_1.3fr]' : ''} gap-5`}>
        {office && <form onSubmit={schedule} className="rounded-2xl border border-white/8 bg-[#101620]/75 p-5 h-fit space-y-4">
          <div>
            <h2 className="font-black text-lg">Schedule a stop</h2>
            <p className="text-xs text-slate-500 mt-1">Create one focused field visit.</p>
          </div>
          {scheduleError && <p role="alert" className="text-xs text-rose-300 bg-rose-400/10 p-2.5 rounded-lg border border-rose-300/20">{scheduleError}</p>}
          <SelectField
            label="Customer Site"
            value={siteId}
            onChange={setSiteId}
            options={[
              { value: '', label: 'Select a site' },
              ...snapshot.sites
                .filter((site) =>
                  snapshot.assets.some((asset) => asset.siteId === site.id && asset.vertical === activeVertical)
                )
                .map((site) => ({ value: site.id, label: site.siteName })),
            ]}
          />
          <TextField label="Service date" value={date} onChange={setDate} type="date" />
          <SelectField
            label="Assign Technician (optional)"
            value={assignedTechId}
            onChange={setAssignedTechId}
            required={false}
            options={[
              { value: '', label: 'Auto / Unassigned' },
              ...eligibleTechs.map((m) => ({
                value: m.userId,
                label: `${m.displayName || m.email || m.userId} (${m.role})`,
              })),
            ]}
          />
          <button type="submit" disabled={scheduling || !siteId} className="primary-button w-full justify-center">
            <CalendarDays className="w-4 h-4" />
            {scheduling ? 'Scheduling…' : 'Schedule and open'}
          </button>
        </form>}

        <div className="rounded-2xl border border-white/8 bg-[#101620]/75 overflow-hidden">
          <div className="p-5 border-b border-white/8 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="font-black">Upcoming and active</h2>
              <p className="text-xs text-slate-500 mt-1">{filteredJobs.length} service stop{filteredJobs.length === 1 ? '' : 's'}</p>
            </div>
            <div className="inline-flex rounded-xl border border-white/10 p-0.5 bg-carbon-900">
              <button
                type="button"
                onClick={() => setFilterMode('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  filterMode === 'all'
                    ? 'bg-orange-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                All stops ({allJobs.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('mine')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  filterMode === 'mine'
                    ? 'bg-orange-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                My assigned work
              </button>
            </div>
          </div>
          <div className="divide-y divide-white/6">
            {filteredJobs.length ? (
              filteredJobs.map((job) => {
                const site = snapshot.sites.find((item) => item.id === job.siteId);
                const tech = snapshot.members.find((m) => m.userId === job.assignedTechId);
                const techLabel = job.assignedTechName || tech?.displayName || tech?.email || (job.assignedTechId ? 'Assigned' : 'Unassigned');
                const statusTone =
                  job.status === 'in_progress'
                    ? 'text-amber-200 border-amber-300/30 bg-amber-400/10'
                    : job.status === 'dispatched'
                      ? 'text-cyan-200 border-cyan-300/30 bg-cyan-400/10'
                      : job.status === 'completed'
                        ? 'text-emerald-200 border-emerald-300/30 bg-emerald-400/10'
                        : job.status === 'cancelled'
                          ? 'text-rose-300 border-rose-300/30 bg-rose-400/10'
                          : 'text-slate-400 border-white/10 bg-white/5';

                return (
                  <button
                    key={job.id}
                    onClick={() => setActiveJobId(job.id)}
                    className="w-full p-5 text-left flex items-center gap-4 hover:bg-white/[.025] transition-colors"
                  >
                    <div className="w-11 h-11 rounded-xl bg-white/5 grid place-items-center">
                      <CalendarDays className="w-4 h-4 text-slate-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold truncate">{site?.siteName || 'Unknown site'}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        {formatDate(job.scheduledDate)} · {snapshot.assets.filter((asset) => asset.siteId === job.siteId && asset.vertical === activeVertical).length} expected · Tech: <span className="text-slate-300 font-mono">{techLabel}</span>
                      </p>
                    </div>
                    <span className={`text-[10px] uppercase font-black tracking-[.12em] px-2.5 py-1 rounded-full border ${statusTone}`}>
                      {job.status.replace('_', ' ')}
                    </span>
                    <ArrowRight className="w-4 h-4 text-slate-600" />
                  </button>
                );
              })
            ) : (
              <EmptyState text={filterMode === 'mine' ? "You have no work assigned to your account." : "No service stops scheduled."} />
            )}
          </div>
        </div>
      </div>
      {activeJob && <JobRunner job={activeJob} onClose={() => setActiveJobId(null)} />}
    </div>
  );
}

function JobRunner({ job, onClose }: { job: JobRecord; onClose: () => void }) {
  const { snapshot, user, mode, completeJob, uploadJobPhoto, assignJob, startJob, cancelJob } = useOperations();
  const currentJob = snapshot.jobs.find((j) => j.id === job.id) || job;
  const assets = snapshot.assets.filter((asset) => asset.siteId === currentJob.siteId && asset.vertical === currentJob.vertical);
  const draft = useJobDraft(`${snapshot.organization.id}:${user?.uid || 'demo'}:${job.id}`, currentJob, (assetId, file, id) => uploadJobPhoto(job.id, assetId, file, id));
  const { results, setResults } = draft;
  const [photoLabel, setPhotoLabel] = useState('Before');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [uploadingAsset, setUploadingAsset] = useState<string | null>(null);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  const site = snapshot.sites.find((item) => item.id === currentJob.siteId);
  const resolved = Object.keys(results).length;

  const currentMember = snapshot.members.find((m) => m.userId === user?.uid);
  const isManagerOrOwner = currentMember?.role === 'owner' || currentMember?.role === 'manager' || mode === 'demo';

  const eligibleTechs = snapshot.members.filter(
    (m) => m.active && (m.role === 'technician' || m.role === 'manager' || m.role === 'owner')
  );

  const update = (assetId: string, outcome: AssetServiceResult['outcome']) =>
    setResults((current) => ({
      ...current,
      [assetId]: { ...current[assetId], assetId, outcome, checklist: current[assetId]?.checklist || {} },
    }));

  const addPhoto = async (assetId: string, file?: File) => {
    if (!file) return;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size >= 20 * 1024 * 1024) { setSaveError('Choose a JPEG, PNG or WebP photo smaller than 20 MB.'); return; }
    draft.addPhoto(assetId, file, photoLabel);
  };

  const handleStart = async () => {
    setSaveError('');
    setSaving(true);
    try {
      await startJob(currentJob.id, currentJob.version);
      draft.acknowledgeVersion((currentJob.version || 1) + 1);
    } catch (cause) {
      setSaveError(cause instanceof Error ? cause.message : 'Unable to start this service stop.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelReason.trim()) return;
    setSaveError('');
    setCancelling(true);
    try {
      await cancelJob(currentJob.id, cancelReason.trim(), currentJob.version);
      setCancelModalOpen(false);
    } catch (cause) {
      setSaveError(cause instanceof Error ? cause.message : 'Unable to cancel this service stop.');
    } finally {
      setCancelling(false);
    }
  };

  const handleReassign = async (newTechId: string) => {
    if (!newTechId || newTechId === currentJob.assignedTechId) return;
    setSaveError('');
    try {
      await assignJob(currentJob.id, newTechId, currentJob.version);
      draft.acknowledgeVersion((currentJob.version || 1) + 1);
    } catch (cause) {
      setSaveError(cause instanceof Error ? cause.message : 'Unable to reassign technician.');
    }
  };

  const finish = async () => {
    setSaveError('');
    setSaving(true);
    try {
      await completeJob(currentJob.id, Object.values(results), draft.expectedVersion);
      await draft.discardAfterCompletion();
      onClose();
    } catch (cause) {
      setSaveError(cause instanceof Error ? cause.message : 'Unable to complete this job.');
    } finally {
      setSaving(false);
    }
  };

  const isTerminal = currentJob.status === 'completed' || currentJob.status === 'cancelled';

  return (
    <Modal title={`Service stop · ${site?.siteName || 'Site'}`} onClose={onClose} wide>
      <div className="mb-4 text-sm text-slate-300"><p role="status">{draft.status}</p>{draft.error && <p role="alert" className="text-rose-300">{draft.error}</p>}{draft.pending.length > 0 && <button className="secondary-button mt-2" onClick={draft.retry}>Retry saved photos</button>}<label className="block mt-3">Photo label <select aria-label="Photo label" value={photoLabel} onChange={event => setPhotoLabel(event.target.value)} className="bg-slate-900 p-2 rounded ml-2"><option>Before</option><option>After</option><option>Detail</option></select></label></div>
      <div className="space-y-6">
        {saveError && (
          <p role="alert" className="text-xs text-rose-300 bg-rose-400/10 p-3 rounded-xl border border-rose-300/20">
            {saveError}
          </p>
        )}

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl bg-white/[.025] border border-white/6">
          <div>
            <div className="flex items-center gap-2.5">
              <p className="font-bold text-base">{site?.siteName}</p>
              <span className={`text-[10px] uppercase font-black tracking-[.12em] px-2 py-0.5 rounded-full border ${
                currentJob.status === 'in_progress'
                  ? 'text-amber-200 border-amber-300/30 bg-amber-400/10'
                  : currentJob.status === 'dispatched'
                    ? 'text-cyan-200 border-cyan-300/30 bg-cyan-400/10'
                    : currentJob.status === 'completed'
                      ? 'text-emerald-200 border-emerald-300/30 bg-emerald-400/10'
                      : currentJob.status === 'cancelled'
                        ? 'text-rose-300 border-rose-300/30 bg-rose-400/10'
                        : 'text-slate-400 border-white/10 bg-white/5'
              }`}>
                {currentJob.status.replace('_', ' ')}
              </span>
              <span className="text-[10px] font-mono text-slate-500">v{currentJob.version || 1}</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {site?.address}, {site?.city} {site?.state}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs text-slate-400">Assigned:</span>
              {isManagerOrOwner && !isTerminal ? (
                <select
                  value={currentJob.assignedTechId || ''}
                  onChange={(e) => handleReassign(e.target.value)}
                  className="bg-carbon-900 border border-white/15 text-xs text-slate-200 rounded px-2 py-1 font-mono"
                >
                  <option value="" disabled>Unassigned</option>
                  {eligibleTechs.map((m) => (
                    <option key={m.userId} value={m.userId}>
                      {m.displayName || m.email || m.userId} ({m.role})
                    </option>
                  ))}
                </select>
              ) : (
                <span className="text-xs font-mono text-slate-300">
                  {currentJob.assignedTechName || (eligibleTechs.find((m) => m.userId === currentJob.assignedTechId)?.displayName) || currentJob.assignedTechId || 'Unassigned'}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {!isTerminal && currentJob.status !== 'in_progress' && (
              <button
                type="button"
                onClick={handleStart}
                disabled={saving}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-400 hover:bg-amber-300 text-slate-950 transition-colors shadow-sm"
              >
                {saving ? 'Starting…' : 'Start service stop'}
              </button>
            )}

            {!isTerminal && (
              <button
                type="button"
                onClick={() => setCancelModalOpen(true)}
                disabled={saving}
                className="px-3 py-2 rounded-xl text-xs font-bold border border-rose-400/30 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 transition-colors"
              >
                Cancel stop
              </button>
            )}

            {currentJob.status === 'in_progress' && (
              <>
                <span className="text-xs font-mono text-slate-400">
                  {resolved} of {assets.length} logged
                </span>
                <button
                  type="button"
                  onClick={finish}
                  disabled={saving || !draft.ready || !draft.saved || draft.pending.length > 0 || resolved !== assets.length || !resolved}
                  className="primary-button"
                >
                  {saving ? 'Completing…' : 'Generate service record'}
                </button>
              </>
            )}
          </div>
        </div>

        {currentJob.status === 'cancelled' && (
          <div className="p-4 rounded-xl border border-rose-300/20 bg-rose-400/10 text-rose-200 text-xs">
            <p className="font-bold uppercase tracking-wider text-[11px]">This stop was cancelled</p>
            <p className="mt-1 text-slate-300">Reason: {currentJob.cancellationReason || 'No reason specified.'}</p>
          </div>
        )}

        {currentJob.status === 'completed' && (
          <div className="p-4 rounded-xl border border-emerald-300/20 bg-emerald-400/10 text-emerald-200 text-xs">
            <p className="font-bold uppercase tracking-wider text-[11px]">Service record completed</p>
            <p className="mt-1 text-slate-300">All units have been accounted for and committed.</p>
          </div>
        )}

        {/* Asset list */}
        {isManagerOrOwner && ['scheduled', 'dispatched'].includes(currentJob.status) && <RescheduleStop job={currentJob} onSaved={draft.acknowledgeVersion} />}
        <div className="space-y-4">
          {assets.map((asset) => {
            const result = results[asset.id];
            const tone =
              result?.outcome === 'completed'
                ? 'border-emerald-300/30 bg-emerald-400/5'
                : result?.outcome === 'exception'
                  ? 'border-rose-300/30 bg-rose-400/5'
                  : result?.outcome === 'unable'
                    ? 'border-amber-300/30 bg-amber-400/5'
                    : 'border-white/8 bg-[#0b1018]';

            return (
              <div key={asset.id} className={`p-4 rounded-2xl border ${tone} space-y-4`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-sm">{asset.name}</p>
                      <span className="font-mono text-[10px] text-slate-600">{asset.assetCode}</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">{asset.location}</p>
                  </div>
                  {!isTerminal && currentJob.status === 'in_progress' && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => update(asset.id, 'completed')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          result?.outcome === 'completed'
                            ? 'bg-emerald-300 text-slate-950'
                            : 'bg-white/5 text-slate-400 hover:text-white'
                        }`}
                      >
                        Pass / Serviced
                      </button>
                      <button
                        type="button"
                        onClick={() => update(asset.id, 'exception')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          result?.outcome === 'exception'
                            ? 'bg-rose-300 text-slate-950'
                            : 'bg-white/5 text-slate-400 hover:text-white'
                        }`}
                      >
                        Exception
                      </button>
                      <button
                        type="button"
                        onClick={() => update(asset.id, 'unable')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          result?.outcome === 'unable'
                            ? 'bg-amber-300 text-slate-950'
                            : 'bg-white/5 text-slate-400 hover:text-white'
                        }`}
                      >
                        Inaccessible
                      </button>
                    </div>
                  )}
                  {isTerminal && result && (
                    <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">
                      {result.outcome}
                    </span>
                  )}
                </div>

                {result && (
                  <fieldset className="grid gap-3 sm:grid-cols-2" disabled={isTerminal}>
                    <legend className="mb-2 text-sm font-bold">Service checklist</legend>
                    {snapshot.configs[currentJob.vertical].checklist
                      .filter((field) => field.type !== 'photo')
                      .map((field) => (
                        <label key={field.id} className="text-xs text-slate-300">
                          {field.label}
                          {field.required ? ' *' : ''}
                          {field.type === 'boolean' ? (
                            <select
                              className="field mt-1"
                              disabled={isTerminal}
                              value={
                                result.checklist[field.id] === undefined
                                  ? ''
                                  : String(result.checklist[field.id])
                              }
                              onChange={(event) =>
                                setResults((current) => ({
                                  ...current,
                                  [asset.id]: {
                                    ...current[asset.id],
                                    checklist: {
                                      ...current[asset.id].checklist,
                                      [field.id]: event.target.value === 'true',
                                    },
                                  },
                                }))
                              }
                            >
                              <option value="" disabled>Select an answer</option>
                              <option value="true">Yes</option>
                              <option value="false">No / exception</option>
                            </select>
                          ) : field.type === 'select' ? (
                            <select
                              className="field mt-1"
                              disabled={isTerminal}
                              value={String(result.checklist[field.id] ?? '')}
                              onChange={(event) =>
                                setResults((current) => ({
                                  ...current,
                                  [asset.id]: {
                                    ...current[asset.id],
                                    checklist: {
                                      ...current[asset.id].checklist,
                                      [field.id]: event.target.value,
                                    },
                                  },
                                }))
                              }
                            >
                              <option value="" disabled>Select an answer</option>
                              {field.options?.map((option) => (
                                <option key={option} value={option}>
                                  {option.replace(/_/g, ' ')}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <input
                              className="field mt-1"
                              type={field.type === 'number' ? 'number' : 'text'}
                              disabled={isTerminal}
                              value={String(result.checklist[field.id] ?? '')}
                              onChange={(event) =>
                                setResults((current) => ({
                                  ...current,
                                  [asset.id]: {
                                    ...current[asset.id],
                                    checklist: {
                                      ...current[asset.id].checklist,
                                      [field.id]:
                                        field.type === 'number' ? Number(event.target.value) : event.target.value,
                                    },
                                  },
                                }))
                              }
                            />
                          )}
                        </label>
                      ))}
                  </fieldset>
                )}

                {result && (
                  <div className="grid sm:grid-cols-2 gap-3 pt-3 border-t border-white/6">
                    <input
                      value={result.notes || ''}
                      disabled={isTerminal}
                      onChange={(event) =>
                        setResults((current) => ({
                          ...current,
                          [asset.id]: { ...current[asset.id], notes: event.target.value },
                        }))
                      }
                      placeholder="Technician observations and exceptions"
                      className="field"
                    />
                    <div className="flex items-center gap-2">
                      {!isTerminal && (
                        <label className="secondary-button cursor-pointer flex-1 justify-center">
                          <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            className="hidden"
                            onChange={(event) => addPhoto(asset.id, event.target.files?.[0])}
                          />
                          {uploadingAsset === asset.id ? 'Uploading…' : 'Add photo evidence'}
                        </label>
                      )}
                      <span className="text-xs font-mono text-slate-500">
                        {result.photoUrls?.length || 0} photos
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {cancelModalOpen && (
          <Modal title="Cancel Service Stop" onClose={() => setCancelModalOpen(false)}>
            <form onSubmit={handleCancel} className="space-y-4">
              <p className="text-xs text-slate-400">
                Provide a reason for cancelling this service visit. This will be logged to the immutable audit trail.
              </p>
              <TextField
                label="Cancellation Reason"
                value={cancelReason}
                onChange={setCancelReason}
              />
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCancelModalOpen(false)}
                  className="secondary-button"
                >
                  Keep Stop
                </button>
                <button
                  type="submit"
                  disabled={cancelling || !cancelReason.trim()}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-500 hover:bg-rose-400 text-white transition-colors"
                >
                  {cancelling ? 'Cancelling…' : 'Confirm Cancellation'}
                </button>
              </div>
            </form>
          </Modal>
        )}
      </div>
    </Modal>
  );
}

function Reports() {
  const { snapshot, activeVertical } = useOperations();
  const reports = snapshot.reports.filter((report) => report.vertical === activeVertical);
  return <div className="space-y-6"><PageTitle eyebrow="Documentation" title="Service records" description="Durable records generated from completed field work." />
    <div className="grid lg:grid-cols-2 gap-4">{reports.length ? reports.map((report) => { const site = snapshot.sites.find((item) => item.id === report.siteId); const config = snapshot.configs[report.vertical]; return <article key={report.id} className="rounded-2xl border border-white/8 bg-[#101620]/75 p-5 hover:border-white/15 transition-all"><div className="flex items-start justify-between gap-4"><div className="w-10 h-10 rounded-xl bg-white/5 grid place-items-center"><FileText className="w-4 h-4 text-slate-400" /></div><span className="font-mono text-[10px] text-slate-600">{report.reportNumber}</span></div><h2 className="font-black text-lg mt-5">{report.title || config.report.title}</h2><p className="text-sm text-slate-400 mt-1">{report.snapshot?.siteName || site?.siteName}</p><div className="flex items-center justify-between mt-5 pt-4 border-t border-white/8"><div><p className="text-[10px] uppercase tracking-[.12em] text-slate-600 font-bold">Outcome</p><p className="text-xs font-bold text-slate-300 mt-1">{String(report.outcome || 'completed').replace(/_/g, ' ')}</p></div><p className="text-xs text-slate-500">{formatDate(report.generatedAt)}</p></div><p className="text-[10px] leading-relaxed text-slate-600 mt-4">{report.disclaimer || config.report.disclaimer}</p><DownloadReportButton report={report} /><ReportAddendum report={report} /></article>; }) : <div className="lg:col-span-2 rounded-2xl border border-white/8 bg-[#101620]/75"><EmptyState text="Complete a field job to create the first service record." /></div>}</div>
  </div>;
}

function WorkflowSettings() {
  const { snapshot, activeVertical, saveWorkflowConfig, exportData, mode, resetDemo } = useOperations();
  const config = snapshot.configs[activeVertical];
  const [interval, setInterval] = useState(config.schedule.interval);
  const [saved, setSaved] = useState(false);

  const save = async () => { await saveWorkflowConfig({ ...config, schedule: { ...config.schedule, interval } }); setSaved(true); window.setTimeout(() => setSaved(false), 1800); };
  const download = async () => { const data = await exportData(); const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })); const link = document.createElement('a'); link.href = url; link.download = `fieldledger-${activeVertical}-${new Date().toISOString().slice(0, 10)}.json`; link.click(); URL.revokeObjectURL(url); };

  return <div className="space-y-6"><PageTitle eyebrow="Company-controlled workflow" title="Procedure settings" description="Keep recurrence and field questions configurable for your company, customers, and jurisdiction." />
    <div className="grid xl:grid-cols-[1fr_.7fr] gap-5"><section className="rounded-2xl border border-white/8 bg-[#101620]/75 p-6"><h2 className="font-black text-lg">Default recurrence ({config.displayName})</h2><p className="text-sm text-slate-500 mt-2">New assets inherit this schedule. Technicians can override the next date when the service context requires it.</p><div className="mt-6 max-w-sm"><label className="block text-sm font-semibold text-slate-300">Interval ({config.schedule.unit})<input type="number" min="1" value={interval} onChange={(event) => setInterval(Number(event.target.value))} className="field mt-2" /></label><button onClick={save} className="primary-button mt-4">{saved ? <Check className="w-4 h-4" /> : <Settings2 className="w-4 h-4" />}{saved ? 'Saved' : 'Save recurrence'}</button></div><div className="mt-8 pt-6 border-t border-white/8"><h3 className="font-bold">Field checklist</h3><div className="mt-3 space-y-2">{config.checklist.map((field) => <div key={field.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/[.025] border border-white/6"><div className={`w-2 h-2 rounded-full ${field.required ? 'bg-orange-300' : 'bg-slate-600'}`} /><p className="text-sm flex-1">{field.label}</p><span className="text-[10px] uppercase tracking-[.1em] text-slate-600">{field.type}</span></div>)}</div></div></section>
      <aside className="space-y-5"><section className="rounded-2xl border border-white/8 bg-[#101620]/75 p-6"><ShieldCheck className="w-5 h-5 text-cyan-300" /><h2 className="font-black mt-4">Service-record language</h2><p className="text-sm text-slate-400 leading-relaxed mt-2">{config.report.disclaimer}</p><p className="text-xs text-slate-600 leading-relaxed mt-4">{config.report.standardReference}</p></section><section className="rounded-2xl border border-white/8 bg-[#101620]/75 p-6"><h2 className="font-black">Data portability</h2><p className="text-sm text-slate-500 mt-2">Export the current vertical’s operational records in a machine-readable format.</p><button onClick={download} className="secondary-button mt-5"><Download className="w-4 h-4" />Export JSON</button>{mode === 'demo' && <button onClick={resetDemo} className="mt-3 secondary-button text-rose-200"><RotateCcw className="w-4 h-4" />Reset demo data</button>}</section></aside></div>
  </div>;
}

function PageTitle({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: React.ReactNode }) { return <section className="flex flex-col md:flex-row md:items-end justify-between gap-4"><div><p className="text-xs uppercase tracking-[.18em] text-slate-500 font-bold">{eyebrow}</p><h1 className="text-3xl sm:text-4xl font-black tracking-[-.045em] mt-2 capitalize">{title}</h1><p className="text-slate-400 mt-2 max-w-2xl">{description}</p></div>{action}</section>; }
function EmptyState({ text }: { text: string }) { return <div className="p-10 text-center"><div className="w-11 h-11 rounded-xl bg-white/5 grid place-items-center mx-auto"><CheckCircle2 className="w-5 h-5 text-slate-600" /></div><p className="text-sm text-slate-500 mt-3">{text}</p></div>; }
function SelectField({ label, value, onChange, options, required = true }: { label: string; value: string; onChange: (value: string) => void; options: Array<{ value: string; label: string }>; required?: boolean }) { return <label className="block text-sm font-semibold text-slate-300">{label}<div className="relative mt-2"><select required={required} value={value} onChange={(event) => onChange(event.target.value)} className="field appearance-none pr-10">{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select><ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-600" /></div></label>; }
function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) { return <label className="block text-sm font-semibold text-slate-300">{label}<input required type="number" min="1" value={value} onChange={(event) => onChange(Number(event.target.value))} className="field mt-2" /></label>; }
function Modal({ title, onClose, children, wide = false }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) { return <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm p-4 grid place-items-center"><div role="dialog" aria-modal="true" className={`w-full ${wide ? 'max-w-5xl' : 'max-w-lg'} max-h-[92vh] overflow-hidden rounded-[1.5rem] border border-white/12 bg-[#101620] shadow-2xl shadow-black/60`}><div className="px-5 py-4 border-b border-white/8 flex items-center justify-between"><h2 className="font-black text-lg">{title}</h2><button onClick={onClose} aria-label="Close" className="p-2 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 transition-all"><X className="w-5 h-5" /></button></div><div className="p-5 overflow-y-auto">{children}</div></div></div>; }

interface BrowserBarcodeDetector {
  detect(source: HTMLVideoElement): Promise<Array<{ rawValue: string }>>;
}
type BrowserBarcodeDetectorConstructor = new (options?: { formats?: string[] }) => BrowserBarcodeDetector;

function BarcodeScanner({ onClose, onResult }: { onClose: () => void; onResult: (value: string) => void }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [message, setMessage] = useState('Starting camera…');
  const [manual, setManual] = useState('');
  useEffect(() => {
    let stream: MediaStream | null = null;
    let frame = 0;
    let cancelled = false;
    const start = async () => {
      const Detector = (window as typeof window & { BarcodeDetector?: BrowserBarcodeDetectorConstructor }).BarcodeDetector;
      if (!Detector) {
        setMessage('This browser does not support camera barcode decoding. Enter the printed code below.');
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
        if (!videoRef.current) return;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setMessage('Hold the QR code or barcode inside the frame.');
        const detector = new Detector({ formats: ['qr_code', 'code_128', 'code_39', 'ean_13', 'data_matrix'] });
        const scan = async () => {
          if (cancelled || !videoRef.current) return;
          try {
            const codes = await detector.detect(videoRef.current);
            if (codes[0]?.rawValue) { onResult(codes[0].rawValue); return; }
          } catch {
            setMessage('Camera is active. Keep the code steady and well lit.');
          }
          frame = requestAnimationFrame(scan);
        };
        frame = requestAnimationFrame(scan);
      } catch {
        setMessage('Camera permission is unavailable. Enter the printed code below.');
      }
    };
    void start();
    return () => { cancelled = true; cancelAnimationFrame(frame); stream?.getTracks().forEach((track) => track.stop()); };
  }, [onResult]);
  return <Modal title="Scan asset tag" onClose={onClose}><div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-black border border-white/10"><video ref={videoRef} muted playsInline className="w-full h-full object-cover" /><div className="absolute inset-8 border-2 border-orange-300/70 rounded-2xl shadow-[0_0_0_999px_rgba(0,0,0,.45)]" /></div><p className="text-xs text-slate-400 mt-3">{message}</p><form onSubmit={(event) => { event.preventDefault(); if (manual.trim()) onResult(manual.trim()); }} className="mt-4 flex gap-2"><input value={manual} onChange={(event) => setManual(event.target.value)} placeholder="Enter QR, barcode, or serial" className="field" /><button className="primary-button">Find</button></form></Modal>;
}

function App() {
  return (
    <OperationsProvider>
      <Shell />
      <InstallPwaBanner />
    </OperationsProvider>
  );
}
export default App;

function FirstResultGuide() {
 const {snapshot,setView} = useOperations();
 const steps=[{label:'Add a customer and service site',done:snapshot.sites.length>0,view:'assets' as const},{label:'Register the first asset',done:snapshot.assets.length>0,view:'assets' as const},{label:'Schedule and complete a visit',done:snapshot.jobs.some(job=>job.status==='completed'),view:'work' as const},{label:'Download your customer service record',done:snapshot.reports.length>0,view:'reports' as const}];
 if(steps.every(step=>step.done))return null;
 const next=steps.find(step=>!step.done)!;
 return <section className="rounded-2xl border border-orange-300/25 bg-orange-400/5 p-6"><p className="text-xs uppercase tracking-widest text-orange-300">Your first service record</p><h2 className="mt-2 text-xl font-bold">{next.label}</h2><ol className="mt-4 grid gap-2 sm:grid-cols-2">{steps.map((step,index)=><li key={step.label} className="text-sm text-slate-300">{step.done?'✓':index+1+'.'} {step.label}</li>)}</ol><button className="primary-button mt-5" onClick={()=>setView(next.view)}>Continue setup <ArrowRight className="h-4 w-4"/></button></section>;
}

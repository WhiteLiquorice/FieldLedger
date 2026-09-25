import { useState } from 'react';
import { sendEmailVerification } from 'firebase/auth';
import { useOperations } from '../context/OperationsContext';
export function EmailVerificationScreen() {
  const { user, signOutUser } = useOperations();
  const [notice, setNotice] = useState('Open the verification link sent to your email, then continue here.');
  const [busy, setBusy] = useState(false);
  async function confirm(resend: boolean) {
    if (!user) return;
    setBusy(true);
    try {
      if (resend) { await sendEmailVerification(user); setNotice('Verification email sent.'); }
      else {
        await user.reload();
        if (!user.emailVerified) { setNotice('Your email is not verified yet. Open the link and try again.'); return; }
        await user.getIdToken(true);
        window.location.reload();
      }
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Unable to verify email. Try again.'); }
    finally { setBusy(false); }
  }
  return <main className="min-h-screen bg-[#080b11] text-slate-100 flex items-center justify-center p-6"><section className="max-w-lg w-full rounded-2xl border border-white/10 bg-[#101620] p-8"><p className="text-sm text-orange-300">FieldLedger</p><h1 className="text-3xl font-bold mt-3">Verify your email</h1><p className="text-slate-400 mt-4">{user?.email}</p><p role="status" className="mt-4 text-sm">{notice}</p><button className="primary-button mt-6" disabled={busy} onClick={() => confirm(false)}>I verified my email</button><button className="secondary-button mt-3" disabled={busy} onClick={() => confirm(true)}>Resend verification email</button><button className="secondary-button mt-3" onClick={signOutUser}>Sign out</button></section></main>;
}

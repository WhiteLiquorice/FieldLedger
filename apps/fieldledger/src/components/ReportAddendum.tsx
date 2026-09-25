import { useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { useOperations } from '../context/OperationsContext';
import { getFirebaseServices } from '../lib/firebase';
import type { ReportRecord } from '../domain';
export function ReportAddendum({ report }: { report: ReportRecord }) {
  const { mode, snapshot, user } = useOperations();
  const [open, setOpen] = useState(false), [reason, setReason] = useState(''), [note, setNote] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [requestId, setRequestId] = useState(() => crypto.randomUUID());
  const baseId = report.baseReportId || report.id;
  const latest = Math.max(...snapshot.reports.filter(item => (item.baseReportId || item.id) === baseId).map(item => item.revision || 1));
  const office = ['owner', 'manager'].includes(snapshot.members.find(member => member.userId === user?.uid)?.role || '');
  return <div className="mt-4 text-sm">
    <p className="text-slate-400">{(report.revision || 1) === 1 ? 'Original record' : `Revision ${report.revision} · includes the original evidence`}{latest > (report.revision || 1) ? ` · revision ${latest} is available` : ''}</p>
    {report.addenda?.map((item, index) => <div key={index} className="mt-3 border-l-2 border-orange-300/40 pl-3"><p className="font-semibold text-slate-200">{item.reason}</p><p className="text-slate-300 whitespace-pre-wrap">{item.note}</p><p className="text-xs text-slate-500 mt-1">{item.authorName} · {new Date(item.createdAt).toLocaleDateString()}</p></div>)}
    {mode === 'firebase' && office && latest === (report.revision || 1) && !open && <button type="button" className="secondary-button mt-3" onClick={() => setOpen(true)}>Add correction or clarification</button>}
    {open && <form className="space-y-3 mt-3" onSubmit={async event => { event.preventDefault(); setBusy(true); setError(''); try { await httpsCallable(getFirebaseServices().functions, 'addReportAddendum')({ orgId: snapshot.organization.id, baseReportId: baseId, expectedRevision: report.revision || 1, requestId, reason, note }); setOpen(false); setReason(''); setNote(''); setRequestId(crypto.randomUUID()); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to save correction.'); } finally { setBusy(false); } }}>
      <p className="text-slate-400">This creates a new numbered revision. The original record and photographs remain available.</p>
      <label className="block">Reason for correction<input className="field mt-1" required minLength={5} maxLength={500} value={reason} onChange={event => { setReason(event.target.value); setRequestId(crypto.randomUUID()); }} /></label>
      <label className="block">Correction or clarification<textarea className="field mt-1 min-h-24" required minLength={10} maxLength={4000} value={note} onChange={event => { setNote(event.target.value); setRequestId(crypto.randomUUID()); }} /></label>
      {error && <p role="alert" className="text-rose-300">{error}</p>}
      <div className="flex flex-wrap gap-2"><button className="primary-button" disabled={busy}>{busy ? 'Saving revision…' : 'Save new revision'}</button><button className="secondary-button" type="button" disabled={busy} onClick={() => setOpen(false)}>Cancel</button></div>
    </form>}
  </div>;
}

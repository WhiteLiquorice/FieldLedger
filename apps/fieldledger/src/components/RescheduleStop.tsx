import { useState } from 'react';
import { useOperations } from '../context/OperationsContext';
import type { JobRecord } from '../domain';

export function RescheduleStop({ job, onSaved }: { job: JobRecord; onSaved: (version: number) => void }) {
  const { rescheduleJob } = useOperations();
  const [date, setDate] = useState(job.scheduledDate), [reason, setReason] = useState(''), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  return <details className="rounded-xl border border-white/10 p-4"><summary className="cursor-pointer text-sm font-bold">Reschedule this visit</summary><form className="mt-3 grid gap-3" onSubmit={async event => {
    event.preventDefault(); setBusy(true); setError('');
    try { await rescheduleJob(job.id, date, reason, job.version || 1); onSaved((job.version || 1) + 1); setReason(''); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to reschedule.'); }
    finally { setBusy(false); }
  }}><label className="text-sm">New service date<input className="field mt-1" type="date" required value={date} onChange={event => setDate(event.target.value)} /></label><label className="text-sm">Reason for rescheduling<input className="field mt-1" required minLength={3} maxLength={500} value={reason} onChange={event => setReason(event.target.value)} /></label><button className="secondary-button" disabled={busy}>{busy ? 'Saving date…' : 'Save new date'}</button>{error && <p role="alert" className="text-rose-300">{error}</p>}</form></details>;
}

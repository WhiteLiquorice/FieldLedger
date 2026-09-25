import { useEffect, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { useOperations } from '../context/OperationsContext';
import { getFirebaseServices } from '../lib/firebase';

type Suggestion = { id: string; sourceJobId: string; siteId: string; assetId: string; scheduledDate: string; status: string };
function SuggestionRow({ item }: { item: Suggestion }) {
  const { snapshot } = useOperations();
  const [date, setDate] = useState(item.scheduledDate || new Date().toISOString().slice(0, 10)), [tech, setTech] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const site = snapshot.sites.find(site => site.id === item.siteId);
  return <form className="border-t border-white/10 pt-4 space-y-3" onSubmit={async event => {
    event.preventDefault(); setBusy(true); setError('');
    try { await httpsCallable(getFirebaseServices().functions, 'scheduleRecurringVisit')({ orgId: snapshot.organization.id, queueId: item.id, sourceJobId: item.sourceJobId, scheduledDate: date, ...(tech ? { assignedTechId: tech } : {}) }); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not schedule recurrence.'); }
    finally { setBusy(false); }
  }}>
    <div><h3 className="font-bold">{site?.siteName || 'Customer site'}</h3><p className="text-sm text-slate-400">{item.status === 'needs_follow_up' ? 'Previous visit could not be completed. Arrange a follow-up.' : `Next service suggested for ${item.scheduledDate}.`}</p></div>
    <div className="grid gap-3 sm:grid-cols-3"><label className="text-sm">Next visit date<input className="field mt-1" type="date" value={date} required onChange={event => setDate(event.target.value)} /></label><label className="text-sm">Assign next visit<select className="field mt-1" value={tech} onChange={event => setTech(event.target.value)}><option value="">Assign later</option>{snapshot.members.filter(member => member.active && ['owner', 'manager', 'technician'].includes(member.role)).map(member => <option value={member.userId} key={member.userId}>{member.displayName || member.email || member.userId}</option>)}</select></label><button className="primary-button self-end justify-center" disabled={busy}>{busy ? 'Scheduling…' : 'Schedule recurring visit'}</button></div>
    {error && <p role="alert" className="text-rose-300 text-sm">{error}</p>}
  </form>;
}
export function RecurringVisits() {
  const { snapshot, mode, user } = useOperations();
  const [items, setItems] = useState<Suggestion[]>([]), [error, setError] = useState('');
  const office = ['owner', 'manager'].includes(snapshot.members.find(member => member.userId === user?.uid)?.role || '');
  useEffect(() => {
    if (mode !== 'firebase' || !office || !snapshot.organization.id) return;
    return onSnapshot(collection(getFirebaseServices().db, `orgs/${snapshot.organization.id}/recurring_queue`), result => { setItems(result.docs.map(doc => ({ ...doc.data(), id: doc.id } as Suggestion))); setError(''); }, cause => setError(cause.message));
  }, [mode, office, snapshot.organization.id]);
  if (!office || mode !== 'firebase') return null;
  const pending = items.filter(item => ['queued', 'needs_follow_up'].includes(item.status)).sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate));
  const sites = pending.filter((item, index) => pending.findIndex(other => other.siteId === item.siteId) === index);
  return <section className="rounded-2xl border border-white/10 bg-[#101620] p-5 space-y-4"><div><h2 className="font-bold text-lg">Next visits to arrange</h2><p className="text-sm text-slate-400 mt-1">Review the date with the customer. Scheduling creates one visit covering the site's current equipment.</p></div>{error ? <p role="alert" className="text-rose-300">{error}</p> : sites.length ? sites.map(item => <SuggestionRow key={`${item.id}:${item.sourceJobId}`} item={item} />) : <p className="text-sm text-slate-400">Completed visits will add their next service dates here.</p>}</section>;
}

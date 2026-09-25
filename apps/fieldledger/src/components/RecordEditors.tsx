import { useState } from 'react';
import { useOperations } from '../context/OperationsContext';
import type { AssetRecord, CustomerRecord, SiteRecord } from '../domain';

function Field({ label, value, onChange, optional = false, type = 'text' }: { label: string; value: string; onChange: (value: string) => void; optional?: boolean; type?: string }) {
  return <label className="block text-sm text-slate-300">{label}<input className="field mt-1" type={type} value={value} required={!optional} maxLength={type === 'email' ? 254 : 500} onChange={event => onChange(event.target.value)} /></label>;
}
function SiteEditor({ site, customer, close }: { site: SiteRecord; customer: CustomerRecord; close: () => void }) {
  const { updateCustomerSite } = useOperations();
  const [original] = useState({ customerVersion: customer.version || 1, siteVersion: site.version || 1 });
  const [form, setForm] = useState({ businessName: customer.businessName, siteName: site.siteName, address: site.address, city: site.city, state: site.state, contactName: customer.contactName, contactEmail: customer.contactEmail, contactPhone: customer.contactPhone });
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  return <form className="grid gap-4 sm:grid-cols-2 mt-4" onSubmit={async event => { event.preventDefault(); setBusy(true); setError(''); try { await updateCustomerSite(site.id, form, original.customerVersion, original.siteVersion); close(); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not save site.'); } finally { setBusy(false); } }}>
    <p className="sm:col-span-2 text-sm text-slate-400">The customer name and contact apply to all their sites. Finalized service records keep their original details.</p>
    {(Object.entries({ businessName: 'Customer business', siteName: 'Site name', address: 'Street address', city: 'City', state: 'State / region', contactName: 'Contact name', contactEmail: 'Contact email', contactPhone: 'Contact phone' }) as Array<[keyof typeof form, string]>).map(([key, label]) => <Field key={key} label={label} value={form[key]} type={key === 'contactEmail' ? 'email' : 'text'} optional={key.startsWith('contact')} onChange={value => setForm(current => ({ ...current, [key]: value }))} />)}
    {error && <p role="alert" className="text-rose-300 sm:col-span-2">{error}</p>}
    <div className="flex gap-3 sm:col-span-2"><button disabled={busy} className="primary-button">{busy ? 'Saving…' : 'Save customer and site'}</button><button type="button" disabled={busy} className="secondary-button" onClick={close}>Cancel edit</button></div>
  </form>;
}
function AssetEditor({ asset, close }: { asset: AssetRecord; close: () => void }) {
  const { updateServiceAsset } = useOperations();
  const [version] = useState(asset.version || 1);
  const [form, setForm] = useState({ name: asset.name, assetCode: asset.assetCode, location: asset.location, scheduleInterval: asset.serviceSchedule.interval });
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  return <form className="grid gap-4 sm:grid-cols-2 mt-4" onSubmit={async event => { event.preventDefault(); setBusy(true); setError(''); try { await updateServiceAsset(asset.id, form, version); close(); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not save equipment.'); } finally { setBusy(false); } }}>
    <Field label="Display name" value={form.name} onChange={name => setForm({ ...form, name })} /><Field label="Equipment code" value={form.assetCode} onChange={assetCode => setForm({ ...form, assetCode })} /><Field label="Physical location" optional value={form.location} onChange={location => setForm({ ...form, location })} />
    <label className="text-sm text-slate-300">Service interval ({asset.serviceSchedule.unit})<input className="field mt-1" type="number" min={1} max={1200} required value={form.scheduleInterval} onChange={event => setForm({ ...form, scheduleInterval: Number(event.target.value) })} /></label>
    <p className="text-sm text-slate-400 sm:col-span-2">An interval change recalculates the next due date from the last completed service. It does not move visits already on the schedule.</p>
    {error && <p role="alert" className="text-rose-300 sm:col-span-2">{error}</p>}
    <div className="flex gap-3 sm:col-span-2"><button disabled={busy} className="primary-button">{busy ? 'Saving…' : 'Save equipment'}</button><button disabled={busy} type="button" className="secondary-button" onClick={close}>Cancel edit</button></div>
  </form>;
}
export function RecordEditors() {
  const { snapshot, user, mode } = useOperations();
  const [siteId, setSiteId] = useState(''), [assetId, setAssetId] = useState('');
  const role = mode === 'demo' ? 'owner' : snapshot.members.find(item => item.userId === user?.uid)?.role;
  if (!role || !['owner', 'manager'].includes(role)) return null;
  const site = snapshot.sites.find(item => item.id === siteId), customer = snapshot.customers.find(item => item.id === site?.customerId), asset = snapshot.assets.find(item => item.id === assetId);
  return <section className="rounded-2xl border border-white/10 bg-[#101620] p-5 space-y-4">
    <h2 className="font-bold">Update customer and equipment details</h2>
    <label className="block text-sm text-slate-300">Customer site to edit<select className="field mt-1" value={siteId} onChange={event => setSiteId(event.target.value)}><option value="">Select a site</option>{snapshot.sites.map(item => <option key={item.id} value={item.id}>{snapshot.customers.find(customer => customer.id === item.customerId)?.businessName} · {item.siteName}</option>)}</select></label>
    {site && customer && <SiteEditor key={site.id} site={site} customer={customer} close={() => setSiteId('')} />}
    <label className="block text-sm text-slate-300">Equipment to edit<select className="field mt-1" value={assetId} onChange={event => setAssetId(event.target.value)}><option value="">Select equipment</option>{snapshot.assets.map(item => <option key={item.id} value={item.id}>{item.assetCode} · {item.name}</option>)}</select></label>
    {asset && <AssetEditor key={asset.id} asset={asset} close={() => setAssetId('')} />}
  </section>;
}

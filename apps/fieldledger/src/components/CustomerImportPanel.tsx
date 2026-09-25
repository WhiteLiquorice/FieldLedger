import { useState } from 'react';
import { previewCustomerImport, importHeaders } from '@compliance-saas/backend-core';
import { httpsCallable } from 'firebase/functions';
import { getFirebaseServices } from '../lib/firebase';
import { useOperations } from '../context/OperationsContext';

export function CustomerImportPanel() {
  const { snapshot, user, mode } = useOperations();
  const [preview, setPreview] = useState<ReturnType<typeof previewCustomerImport> | null>(null);
  const [busy, setBusy] = useState(false), [notice, setNotice] = useState('');
  const member = snapshot.members.find(item => item.userId === user?.uid);
  if (snapshot.organization.vertical !== 'hood_cleaning' || (mode !== 'demo' && !['owner', 'manager'].includes(member?.role || ''))) return null;
  async function choose(file?: File) {
    setNotice(''); setPreview(null);
    if (!file) return;
    if (file.size > 1000000) { setNotice('CSV must be smaller than 1 MB.'); return; }
    try { setPreview(previewCustomerImport(await file.text())); }
    catch (error) { setNotice(error instanceof Error ? error.message : 'Unable to read CSV.'); }
  }
  async function commit() {
    if (!preview || preview.errors.length) return;
    setBusy(true); setNotice('');
    try {
      if (mode === 'demo') { setNotice('CSV validation succeeded. Sign up to import records into your company workspace.'); return; }
      const call = httpsCallable<{ orgId: string; rows: typeof preview.rows }, { createdDocuments: number; skippedDocuments: number }>(getFirebaseServices().functions, 'importCustomerSites');
      const { data } = await call({ orgId: snapshot.organization.id, rows: preview.rows });
      setNotice(`Import finished: ${data.createdDocuments} new customer, site and system records; ${data.skippedDocuments} existing records retained.`); setPreview(null);
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Import failed. You can retry the same file.'); }
    finally { setBusy(false); }
  }
  function template() {
    const url = URL.createObjectURL(new Blob([`${importHeaders.join(',')}\nExample Restaurant,Main Kitchen,123 Example Street,Example City,MO,Alex,alex@example.com,5555550100,Roof exhaust fan,FAN-1\n`], { type: 'text/csv' }));
    const link = document.createElement('a'); link.href = url; link.download = 'fieldledger-hood-import-template.csv'; link.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <details className="rounded-2xl border border-white/10 bg-[#101620] p-5"><summary className="font-bold cursor-pointer">Import customer sites and hood systems</summary><p className="text-sm text-slate-400 mt-3">Preview up to 100 systems. Existing matching records are kept. Review all row errors before importing.</p><button className="secondary-button mt-3" onClick={template}>Download CSV template</button><label className="block mt-4 text-sm">Choose CSV<input aria-label="Choose CSV" type="file" accept=".csv,text/csv" onChange={event => choose(event.target.files?.[0])} className="block mt-2 max-w-full" /></label>{preview && <div className="mt-4">{preview.errors.map((error, index) => <p role="alert" key={index} className="text-sm text-rose-300">{error}</p>)}<div className="overflow-x-auto mt-3"><table className="w-full text-sm text-left"><thead><tr><th>Customer</th><th>Site</th><th>System</th><th>Code</th></tr></thead><tbody>{preview.rows.slice(0, 10).map((row, index) => <tr key={index}><td className="py-2">{row.businessName}</td><td>{row.siteName}</td><td>{row.systemName}</td><td>{row.assetCode}</td></tr>)}</tbody></table></div><p className="text-xs text-slate-400 mt-2">{preview.rows.length} total systems; showing the first 10.</p><button disabled={busy || !!preview.errors.length || !preview.rows.length} className="primary-button mt-4" onClick={commit}>{busy ? 'Importing…' : mode === 'demo' ? 'Validate demo import' : 'Import reviewed records'}</button></div>}{notice && <p role="status" className="mt-3 text-sm text-orange-200">{notice}</p>}</details>;
}

import { useState } from 'react';
import { useOperations } from '../context/OperationsContext';

export function DataExportPanel() {
  const { exportData, snapshot, mode, user } = useOperations();
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const canExport = mode === 'demo' || snapshot.members.some(member => member.userId === user?.uid && ['owner', 'manager'].includes(member.role));
  async function download() {
    setBusy(true); setError('');
    try {
      const result = await exportData();
      const url = URL.createObjectURL(new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' }));
      const link = document.createElement('a'); link.href = url; link.download = 'fieldledger-workspace-export.json'; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 30000);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Export failed. Retry to download a complete file.'); }
    finally { setBusy(false); }
  }
  return <section className="max-w-3xl rounded-2xl border border-white/10 bg-[#101620] p-6"><h1 className="text-2xl font-bold">Workspace data export</h1><p className="mt-4 text-sm leading-relaxed text-slate-300">Download customer sites, systems, jobs, final records, team records, workflow settings, and audit events as JSON. The export includes photo references. Download customer PDFs separately to retain their embedded photographs.</p><p className="mt-3 text-sm text-slate-400">Large workspaces are read in pages. Avoid making changes during the export. The file records its start and finish times and is available after a trial or subscription ends.</p>{canExport ? <button className="primary-button mt-5" disabled={busy} onClick={download}>{busy ? 'Preparing complete export…' : 'Download workspace JSON'}</button> : <p className="mt-5 text-orange-200">Ask your company owner or manager to export the workspace.</p>}{error && <p role="alert" className="mt-4 text-rose-300">{error}</p>}</section>;
}

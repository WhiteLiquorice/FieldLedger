import React, { useState } from 'react';
import { useOperations } from '../context/OperationsContext';

const steps = [
  { title: 'Prepare a practice visit', view: 'assets', action: 'Open Assets & systems. Add a customer site named PHONE TEST and a system, then schedule a visit in Field work. Use a workspace you control and objects you can safely photograph.', expected: 'Your test site, system and scheduled visit appear. These are real records; tutorial mode does not sandbox or delete them.' },
  { title: 'Capture before and after photos', view: 'work', action: 'Start the test visit. Use its photo controls to take distinct before and after pictures with your phone camera. Allow camera access when requested. If access is denied, allow it in browser settings and retry.', expected: 'Both pictures have visible previews and the correct before/after labels. Gallery upload alone does not verify camera capture.' },
  { title: 'Save a draft without a network', view: 'work', action: 'While the visit is open, turn off Wi-Fi and cellular data. Change a checklist answer and add a test photo. Wait for the draft status before reloading this page. Do not sign out or clear browser data.', expected: 'The app explains its offline state. After reloading and reopening the visit, the checklist answer and photo remain. If anything disappears, mark Needs attention and reconnect.' },
  { title: 'Recover after switching networks', view: 'work', action: 'Restore cellular data with Wi-Fi off. Reopen the draft, then switch Wi-Fi back on. Lock your phone briefly or switch apps during an upload, return, and retry if prompted.', expected: 'The draft survives and upload progress resumes or offers a clear retry. Photos are not duplicated and errors are visible rather than silently discarded.' },
  { title: 'Complete the service visit', view: 'work', action: 'With connectivity restored, finish required checklist fields and complete the test visit. Return to the list and reopen it. Check the next recurring visit if this system has a recurrence.', expected: 'One completed record contains the correct answers and photos. Retrying does not create duplicate records or recurring visits.' },
  { title: 'Open and share the PDF', view: 'reports', action: 'Open Service records, download the test report and open it in your phone’s PDF app. Inspect every page and open the share sheet; cancel sharing unless you intend to send it.', expected: 'The PDF is readable and includes the correct site, date, answers and both photos. Download/open works even if the browser’s inline PDF viewer is blank.' },
  { title: 'Install and reopen the app', view: 'dashboard', action: 'On iPhone use Safari’s Share → Add to Home Screen. On Android use the browser’s Install app or Add to Home screen option. Open the installed app and find your test record. Tutorial progress may be separate in the installed app.', expected: 'The installed app opens, navigation works and your saved record remains after signing in. After a later deployment, repeat this check to verify updates; installation alone does not prove an update passed.' },
  { title: 'Review usability and results', view: 'dashboard', action: 'Rotate your phone, open and close navigation, edit a form with the keyboard visible, and return to your report. Download these test results for review. Repeat this tutorial separately on each phone/browser you want to support.', expected: 'Buttons and labels remain usable, forms are not obscured, and there is no sideways scrolling. Leave anything you could not test untested. This is a self-reported phone check, not production certification.' },
] as const;
type Status = 'untested' | 'passed' | 'attention';
type Progress = { enabled: boolean; current: number; results: { status: Status; at?: string }[] };
const fresh = (): Progress => ({ enabled: false, current: 0, results: steps.map(() => ({ status: 'untested' })) });

function SessionTutorial({ storageKey }: { storageKey: string }) {
  const { view, setView, mode } = useOperations();
  const [initial] = useState(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return { progress: fresh(), error: '' };
      const value = JSON.parse(raw);
      if (typeof value.enabled !== 'boolean' || !Number.isInteger(value.current) || value.current < 0 || value.current >= steps.length || value.results?.length !== steps.length || !value.results.every((r: { status: string; at?: unknown }) => ['untested', 'passed', 'attention'].includes(r.status) && (r.at === undefined || typeof r.at === 'string'))) throw new Error('Invalid progress');
      return { progress: value as Progress, error: '' };
    } catch {
      return { progress: fresh(), error: 'Saved tutorial progress could not be read. Your service records are unaffected; tutorial results start untested.' };
    }
  });
  const [error, setError] = useState(initial.error);
  const [progress, setProgress] = useState<Progress>(initial.progress);
  const [confirmReset, setConfirmReset] = useState(false);
  function save(next: Progress) {
    setProgress(next);
    try { localStorage.setItem(storageKey, JSON.stringify(next)); setError(''); }
    catch { setError('This browser could not save tutorial progress. Keep this page open and download your results before leaving.'); }
  }
  function mark(status: Status) {
    save({ ...progress, results: progress.results.map((result, index) => index === progress.current ? { status, at: new Date().toISOString() } : result) });
  }
  function download() {
    const report = { tutorialVersion: 1, recordedAt: new Date().toISOString(), origin: location.origin, mode, device: navigator.userAgent, evidence: 'Self-reported checks on this browser; not automated verification or production certification.', results: steps.map((step, index) => ({ step: step.title, ...progress.results[index] })) };
    const url = URL.createObjectURL(new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a'); link.href = url; link.download = 'fieldledger-phone-test.json'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const passed = progress.results.filter(r => r.status === 'passed').length;
  const attention = progress.results.filter(r => r.status === 'attention').length;
  const step = steps[progress.current];
  return <>
    {view === 'settings' && <section className="mb-5 rounded-2xl border border-white/10 bg-carbon-900 p-5">
      <div className="flex items-center justify-between gap-4"><div><h2 className="font-bold">Guided phone tutorial</h2><p className="text-sm text-slate-400 mt-1">Practice a service visit and check your phone. Progress stays in this browser for this account and workspace.</p></div>
        <button type="button" role="switch" aria-label="Guided phone tutorial" aria-checked={progress.enabled} onClick={() => save({ ...progress, enabled: !progress.enabled })} className="secondary-button shrink-0 min-h-11">{progress.enabled ? 'On' : 'Off'}</button></div>
    </section>}
    {error && <p role="alert" className="mb-4 text-amber-200">{error}</p>}
    {progress.enabled && <section aria-label="Phone tutorial" className="mb-6 rounded-2xl border border-orange-300/25 bg-carbon-900 p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-bold text-orange-200">Phone tutorial · {progress.current + 1} of {steps.length}</h2><button className="secondary-button" onClick={() => save({ ...progress, enabled: false })}>Hide tutorial</button></div>
      <p className="mt-2 text-sm text-slate-400" role="status">{passed} passed · {attention} needs attention · {steps.length - passed - attention} untested</p>
      {mode === 'demo' && <p className="mt-2 text-sm text-amber-200">Demo mode: practice only. Repeat on the live app to check cloud uploads and saved records.</p>}
      <h3 className="mt-5 text-lg font-bold">{step.title}</h3><p className="mt-2 text-sm leading-relaxed text-slate-300">{step.action}</p>
      <p className="mt-3 text-sm leading-relaxed text-slate-400"><strong className="text-slate-200">Check the result: </strong>{step.expected}</p>
      <button className="secondary-button mt-4" onClick={() => setView(step.view)}>Open {step.view === 'assets' ? 'Assets & systems' : step.view === 'work' ? 'Field work' : step.view === 'reports' ? 'Service records' : 'Command center'}</button>
      <p className="mt-4 text-sm">Your result: {progress.results[progress.current].status === 'attention' ? 'Needs attention' : progress.results[progress.current].status}</p>
      <div className="mt-3 flex flex-wrap gap-2"><button className="primary-button" onClick={() => mark('passed')}>Passed this step</button><button className="secondary-button" onClick={() => mark('attention')}>Needs attention</button><button className="secondary-button" onClick={() => mark('untested')}>Mark untested</button></div>
      <div className="mt-4 flex flex-wrap gap-2"><button className="secondary-button" disabled={progress.current === 0} onClick={() => save({ ...progress, current: progress.current - 1 })}>Previous step</button><button className="secondary-button" disabled={progress.current === steps.length - 1} onClick={() => save({ ...progress, current: progress.current + 1 })}>Next step</button><button className="secondary-button" onClick={download}>Download test results</button></div>
      <div className="mt-4 text-sm text-slate-400">Turning this off keeps your progress. <button className="underline min-h-11" onClick={() => setConfirmReset(true)}>Restart tutorial</button></div>
      {confirmReset && <div className="mt-2 flex flex-wrap items-center gap-3"><p>Clear only tutorial results? Service records will remain.</p><button className="secondary-button" onClick={() => { save({ ...fresh(), enabled: true }); setConfirmReset(false); }}>Clear tutorial results</button><button className="secondary-button" onClick={() => setConfirmReset(false)}>Keep results</button></div>}
    </section>}
  </>;
}

export function PhoneTutorial() {
  const { mode, user, snapshot } = useOperations();
  const key = `fieldledger-phone-tutorial-v1:${mode}:${user?.uid ?? 'demo'}:${snapshot.organization.id}`;
  return <SessionTutorial key={key} storageKey={key} />;
}

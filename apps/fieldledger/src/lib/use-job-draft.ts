import { useEffect, useRef, useState } from 'react';
import { readDraft, writeDraft, removeDraft, type PendingPhoto } from './job-drafts';
import type { AssetServiceResult, JobRecord } from '../domain';

export function useJobDraft(key: string, job: JobRecord, upload: (assetId: string, file: File, id: string) => Promise<string>) {
  const [results, setResults] = useState<Record<string, AssetServiceResult>>(() => Object.fromEntries(job.results.map(r => [r.assetId, r])));
  const [pending, setPending] = useState<PendingPhoto[]>([]);
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState('Loading saved draft…');
  const [error, setError] = useState('');
  const [revision, retry] = useState(0);
  const [saved, setSaved] = useState(false);
  const [version, setVersion] = useState(job.version || 1);
  const sequence = useRef(Promise.resolve());
  const uploadRef = useRef(upload); uploadRef.current = upload;
  const stopped = useRef(false);
  const initialVersion = useRef(job.version || 1);
  useEffect(() => {
    let active = true;
    readDraft(key).then(draft => {
      if (!active) return;
      if (draft) {
        if (draft.version !== (job.version || 1)) { setError('This job changed while a local draft was saved. Review the current job before completing.'); }
        setResults(draft.results); setPending(draft.pending); initialVersion.current = draft.version;
        setVersion(draft.version);
      }
      setReady(true);
    }).catch(cause => setError(`Cannot open draft storage: ${cause.message}. Keep this job open and retry.`));
    return () => { active = false; };
  }, [key]);
  useEffect(() => {
    if (!ready || stopped.current) return;
    let active = true;
    setSaved(false);
    sequence.current = sequence.current.then(async () => {
      await writeDraft({ key, version: initialVersion.current, results, pending });
      if (active) { setSaved(true); setStatus(pending.length ? `${pending.length} photo(s) saved on this device; waiting to upload` : 'Draft saved on this device'); }
    }).catch(cause => { if (active) setError(`Draft not saved: ${cause.message}`); });
    return () => { active = false; };
  }, [key, ready, results, pending, version]);
  useEffect(() => {
    const online = () => retry(value => value + 1);
    window.addEventListener('online', online);
    return () => window.removeEventListener('online', online);
  }, []);
  useEffect(() => {
    if (!ready || !saved || !pending.length || !navigator.onLine || stopped.current) return;
    let active = true;
    const photo = pending[0];
    setStatus('Uploading saved photo…');
    uploadRef.current(photo.assetId, photo.file, photo.id).then(url => {
      if (!active) return;
      setResults(current => {
        const result = current[photo.assetId] || { assetId: photo.assetId, outcome: 'completed' as const, checklist: {} };
        const urls = result.photoUrls || [];
        if (urls.includes(url)) return current;
        return { ...current, [photo.assetId]: { ...result, photoUrls: [...urls, url], checklist: { ...result.checklist, [`photo_label_${urls.length}`]: photo.label } } };
      });
      setPending(current => current.filter(item => item.id !== photo.id));
    }).catch(cause => { if (active) { setError(`Photo is saved locally. Upload failed: ${cause.message}`); setStatus('Upload failed; reconnect or retry'); } });
    return () => { active = false; };
  }, [ready, saved, pending, revision]);
  async function discardAfterCompletion() {
    stopped.current = true;
    await sequence.current;
    await removeDraft(key);
  }
  return { results, setResults, ready, pending, status, error, saved, expectedVersion: version,
    acknowledgeVersion: (value: number) => { initialVersion.current = value; setVersion(value); },
    addPhoto: (assetId: string, file: File, label: string) => setPending(current => [...current, { id: `ev-${crypto.randomUUID()}`, assetId, file, label }]),
    retry: () => { setError(''); retry(value => value + 1); }, discardAfterCompletion };
}

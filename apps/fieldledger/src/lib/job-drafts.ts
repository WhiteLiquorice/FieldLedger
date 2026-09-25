import type { AssetServiceResult } from '../domain';
export interface PendingPhoto { id: string; assetId: string; file: File; label: string }
export interface JobDraft { key: string; version: number; results: Record<string, AssetServiceResult>; pending: PendingPhoto[] }
const databaseName = 'fieldledger-private-drafts-v1';
async function database() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(databaseName, 1);
    request.onupgradeneeded = () => request.result.createObjectStore('drafts', { keyPath: 'key' });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
async function transact<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await database();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction('drafts', mode);
      const request = action(tx.objectStore('drafts'));
      tx.oncomplete = () => resolve(request.result);
      tx.onerror = () => reject(tx.error || request.error);
      tx.onabort = () => reject(tx.error || new Error('Draft storage aborted.'));
    });
  } finally { db.close(); }
}
export const readDraft = (key: string) => transact<JobDraft | undefined>('readonly', store => store.get(key));
export const writeDraft = (draft: JobDraft) => transact('readwrite', store => store.put(draft));
export const removeDraft = (key: string) => transact('readwrite', store => store.delete(key));
export const clearDrafts = () => transact('readwrite', store => store.clear());

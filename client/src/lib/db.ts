import { DB_NAME, DB_STORE } from '../constants';
import type { DownloadedTrack, DownloadMeta } from '../types';

export function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(DB_STORE)) {
        db.createObjectStore(DB_STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveDownload(track: DownloadedTrack): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DB_STORE, 'readwrite');
    tx.objectStore(DB_STORE).put(track);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** Lightweight — only reads ids and timestamps, no blobs. Fast even with hundreds of downloads. */
export async function getAllDownloadsMeta(): Promise<DownloadMeta[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DB_STORE, 'readonly');
    const store = tx.objectStore(DB_STORE);
    const req = store.openCursor();
    const results: DownloadMeta[] = [];
    req.onsuccess = () => {
      const cursor = req.result;
      if (cursor) {
        const v = cursor.value as DownloadedTrack;
        results.push({ id: v.id, downloadedAt: v.downloadedAt });
        cursor.continue();
      } else {
        resolve(results);
      }
    };
    req.onerror = () => reject(req.error);
  });
}

export async function getDownloadBlob(id: string): Promise<Blob | undefined> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DB_STORE, 'readonly');
    const req = tx.objectStore(DB_STORE).get(id);
    req.onsuccess = () => resolve(req.result?.blob);
    req.onerror = () => reject(req.error);
  });
}

export async function removeDownload(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DB_STORE, 'readwrite');
    tx.objectStore(DB_STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
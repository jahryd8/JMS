import { useState, useEffect, useCallback } from 'react';
import { DOWNLOADS_ORDER_KEY } from '../constants';
import { getAllDownloadsMeta, getDownloadBlob, saveDownload, removeDownload } from '../lib/db';
import { moveItemInArray } from '../lib/array';
import { getAudioUrl } from '../lib/urls';
import type { Song, DownloadMeta, DownloadedTrack } from '../types';

export function useDownloads(authToken: string | null) {
  const [downloadMeta, setDownloadMeta] = useState<DownloadMeta[]>([]);
  const [downloadProgress, setDownloadProgress] = useState<Record<string, number>>({});

  useEffect(() => {
    getAllDownloadsMeta()
      .then((items) => {
        let ordered = items;
        try {
          const raw = localStorage.getItem(DOWNLOADS_ORDER_KEY);
          if (raw) {
            const order: string[] = JSON.parse(raw);
            const pos = new Map(order.map((id, i) => [id, i]));
            ordered = [...items].sort((a, b) => {
              const ai = pos.has(a.id) ? pos.get(a.id)! : Infinity;
              const bi = pos.has(b.id) ? pos.get(b.id)! : Infinity;
              return ai - bi;
            });
          }
        } catch { /* ignore */ }
        setDownloadMeta(ordered);
      })
      .catch((err) => console.error('DB load failed:', err));
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(DOWNLOADS_ORDER_KEY, JSON.stringify(downloadMeta.map(d => d.id)));
    } catch { /* ignore */ }
  }, [downloadMeta]);

  const isDownloaded = useCallback(
    (songId: string) => downloadMeta.some(d => d.id === songId),
    [downloadMeta]
  );

  const getCachedBlob = useCallback((songId: string) => getDownloadBlob(songId), []);

  const downloadTrack = useCallback(async (song: Song, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isDownloaded(song.id)) return;
    setDownloadProgress(prev => ({ ...prev, [song.id]: 0 }));
    try {
      const url = getAudioUrl(song, authToken);
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const reader = res.body?.getReader();
      const contentLength = Number(res.headers.get('Content-Length') || 0);
      const chunks: Uint8Array[] = [];
      let received = 0;
      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) {
            chunks.push(value);
            received += value.length;
            if (contentLength) {
              setDownloadProgress(prev => ({
                ...prev,
                [song.id]: Math.round((received / contentLength) * 100),
              }));
            }
          }
        }
      }
      const blob = new Blob(chunks as BlobPart[], { type: 'audio/mpeg' });
      const track: DownloadedTrack = {
        id: song.id, song, blob, downloadedAt: Date.now(),
      };
      await saveDownload(track);
      setDownloadMeta(prev => [
        ...prev.filter(d => d.id !== song.id),
        { id: song.id, downloadedAt: track.downloadedAt },
      ]);
    } catch (err) {
      console.error('Download failed:', err);
      alert('Download failed. You may be offline or unauthorized.');
    } finally {
      setDownloadProgress(prev => {
        const n = { ...prev };
        delete n[song.id];
        return n;
      });
    }
  }, [authToken, isDownloaded]);

  const removeDownloaded = useCallback(async (songId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await removeDownload(songId);
      setDownloadMeta(prev => prev.filter(d => d.id !== songId));
    } catch (err) {
      console.error('Failed to remove download:', err);
    }
  }, []);

  const moveDownload = useCallback((songId: string, direction: 'up' | 'down', e: React.MouseEvent) => {
    e.stopPropagation();
    setDownloadMeta(prev => {
      const idx = prev.findIndex(d => d.id === songId);
      if (idx === -1) return prev;
      const target = direction === 'up' ? idx - 1 : idx + 1;
      return moveItemInArray(prev, idx, target);
    });
  }, []);

  return {
    downloadMeta,
    downloadProgress,
    isDownloaded,
    getCachedBlob,
    downloadTrack,
    removeDownloaded,
    moveDownload,
  };
}
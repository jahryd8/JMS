import { useState, useEffect, useRef, useCallback } from 'react';
import { LAST_PLAYED_KEY, LAST_PLAYED_VERSION } from '../constants';
import type { Song } from '../types';

interface Snapshot {
  v?: number;
  trackId: string;
  time: number;
  queue: string[];
  index: number;
  savedAt?: number;
}

interface Args {
  /** Full library, once loaded. Used to rebuild the queue from saved IDs. */
  allSongs: Song[];
  /** Current queue — written to the snapshot on every change. */
  playbackQueue: Song[];
  currentTrackIndex: number;
  currentTrack: Song | undefined;
  currentTime: number;
  /** Drives the boot-restore branch and the mid-session toggle effect. */
  resumePlayback: boolean;
  /** Called once on boot after a snapshot is restored (or discarded). */
  onRestored?: () => void;
  /** Optional: called when a restore decides to seek to a saved position. */
  onRestoreSeek?: (time: number) => void;
}

interface Result {
  hasRestored: boolean;
  /** Owned here; consumed by useAudioPlayer. `null` means "no pending seek". */
  pendingSeekTime: number | null;
  /** useAudioPlayer calls this after seeking so we clear the pending intent. */
  clearPendingSeek: () => void;
  /** App calls this from "play a track" — resets any pending seek. */
  resetSeek: () => void;
}

/**
 * Owns the "resume where I left off" behavior:
 *  - versioned localStorage snapshot
 *  - one-shot boot restore when the library is ready
 *  - mid-session toggle of the resumePlayback switch
 *  - immediate save on track change (time: 0)
 *  - debounced save on time updates (5 s)
 */
export function useLastPlayed({
  allSongs,
  playbackQueue,
  currentTrackIndex,
  currentTrack,
  currentTime,
  resumePlayback,
  onRestored,
  onRestoreSeek,
}: Args): Result {
  const [hasRestored, setHasRestored] = useState(false);
  const [pendingSeekTime, setPendingSeekTime] = useState<number | null>(null);

  // Stable callback refs so effects can call latest versions without
  // adding them to dep arrays (which would re-fire the boot effect).
  const onRestoredRef = useRef(onRestored);
  const onRestoreSeekRef = useRef(onRestoreSeek);
  useEffect(() => { onRestoredRef.current = onRestored; }, [onRestored]);
  useEffect(() => { onRestoreSeekRef.current = onRestoreSeek; }, [onRestoreSeek]);

  // ---------- Boot restore (runs once per boot, after allSongs is populated) ----------
  useEffect(() => {
    if (hasRestored) return;
    if (allSongs.length === 0) return;

    const raw = localStorage.getItem(LAST_PLAYED_KEY);
    if (!raw) {
      setHasRestored(true);
      onRestoredRef.current?.();
      return;
    }

    try {
      const snap = JSON.parse(raw) as Snapshot;

      // Discard snapshots from before this version
      if (snap.v !== LAST_PLAYED_VERSION) {
        localStorage.removeItem(LAST_PLAYED_KEY);
        setHasRestored(true);
        onRestoredRef.current?.();
        return;
      }

      // Nothing to restore if the track is gone
      if (!allSongs.some(s => s.id === snap.trackId)) {
        setHasRestored(true);
        onRestoredRef.current?.();
        return;
      }

      // The caller (useAudioPlayer) owns the queue/index, so we surface the
      // restore via onRestored — but we do the *seek* decision here because
      // it depends on resumePlayback and the saved time.
      if (resumePlayback && snap.time > 0) {
        setPendingSeekTime(snap.time);
        onRestoreSeekRef.current?.(snap.time);
      } else {
        setPendingSeekTime(0);
        onRestoreSeekRef.current?.(0);
      }
    } catch {
      /* corrupt snapshot — ignore */
    }

    setHasRestored(true);
    onRestoredRef.current?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allSongs.length, hasRestored]);

  // ---------- Mid-session toggle of resumePlayback ----------
  useEffect(() => {
    if (!hasRestored) return;

    if (!resumePlayback) {
      // Turning OFF: drop any pending seek, keep the track, persist time=0.
      setPendingSeekTime(0);
      if (currentTrack) {
        try {
          const raw = localStorage.getItem(LAST_PLAYED_KEY);
          const existing = raw ? (JSON.parse(raw) as Partial<Snapshot>) : {};
          const next: Snapshot = {
            ...existing,
            v: LAST_PLAYED_VERSION,
            trackId: currentTrack.id,
            time: 0,
            queue: playbackQueue.map(s => s.id),
            index: currentTrackIndex,
            savedAt: Date.now(),
          };
          localStorage.setItem(LAST_PLAYED_KEY, JSON.stringify(next));
        } catch { /* ignore */ }
      }
    } else {
      // Turning ON: if a saved position exists for the current track, jump to it.
      try {
        const raw = localStorage.getItem(LAST_PLAYED_KEY);
        if (!raw || !currentTrack) return;
        const snap = JSON.parse(raw) as Snapshot;
        if (!snap.trackId) return;
        if (currentTrack.id === snap.trackId && snap.time > 0) {
          setPendingSeekTime(snap.time);
          onRestoreSeekRef.current?.(snap.time);
        }
      } catch { /* ignore */ }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resumePlayback, hasRestored]);

  // ---------- Immediate persist on track change (time: 0) ----------
  useEffect(() => {
    if (!currentTrack) return;
    const snap: Snapshot = {
      v: LAST_PLAYED_VERSION,
      trackId: currentTrack.id,
      time: 0,
      queue: playbackQueue.map(s => s.id),
      index: currentTrackIndex,
      savedAt: Date.now(),
    };
    try { localStorage.setItem(LAST_PLAYED_KEY, JSON.stringify(snap)); } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTrack?.id, currentTrackIndex]);

  // ---------- Debounced persist on time updates ----------
  useEffect(() => {
    if (!currentTrack) return;
    const timer = window.setTimeout(() => {
      const snap: Snapshot = {
        v: LAST_PLAYED_VERSION,
        trackId: currentTrack.id,
        time: currentTime,
        queue: playbackQueue.map(s => s.id),
        index: currentTrackIndex,
        savedAt: Date.now(),
      };
      try { localStorage.setItem(LAST_PLAYED_KEY, JSON.stringify(snap)); } catch { /* ignore */ }
    }, 5000);
    return () => window.clearTimeout(timer);
  }, [currentTrack?.id, currentTrackIndex, playbackQueue, currentTime]);

  const clearPendingSeek = useCallback(() => setPendingSeekTime(null), []);
  const resetSeek = useCallback(() => setPendingSeekTime(0), []);

  return { hasRestored, pendingSeekTime, clearPendingSeek, resetSeek };
}
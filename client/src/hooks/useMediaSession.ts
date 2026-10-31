import { useEffect, useRef } from 'react';
import type { Song } from '../types';

interface Args {
  currentTrack?: Song;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  coverUrl: string;
  onPlay: () => void;
  onPause: () => void;
  onNext: () => void;
  onPrev: () => void;
  onSeek: (time: number) => void;
  onStop: () => void;
}

export function useMediaSession({
  currentTrack, isPlaying, currentTime, duration, coverUrl,
  onPlay, onPause, onNext, onPrev, onSeek, onStop,
}: Args) {
  const currentTimeRef = useRef(currentTime);
  const durationRef = useRef(duration);
  const onSeekRef = useRef(onSeek);

  useEffect(() => { currentTimeRef.current = currentTime; }, [currentTime]);
  useEffect(() => { durationRef.current = duration; }, [duration]);
  useEffect(() => { onSeekRef.current = onSeek; }, [onSeek]);

  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    if (!currentTrack) {
      navigator.mediaSession.metadata = null;
      return;
    }
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentTrack.title,
        artist: currentTrack.artist,
        album: currentTrack.album || 'JMS',
        artwork: [
          { src: coverUrl, sizes: '96x96', type: 'image/jpeg' },
          { src: coverUrl, sizes: '128x128', type: 'image/jpeg' },
          { src: coverUrl, sizes: '192x192', type: 'image/jpeg' },
          { src: coverUrl, sizes: '256x256', type: 'image/jpeg' },
          { src: coverUrl, sizes: '384x384', type: 'image/jpeg' },
          { src: coverUrl, sizes: '512x512', type: 'image/jpeg' },
        ],
      });
    } catch (err) {
      console.warn('[MediaSession] Failed to set metadata:', err);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTrack?.id, coverUrl]);

  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
  }, [isPlaying]);

  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    if (!navigator.mediaSession.setPositionState) return;
    if (!duration || duration <= 0 || !isFinite(duration)) return;
    const now = Math.floor(currentTime);
    const last = (useMediaSession as any)._lastSec ?? -1;
    if (now === last) return;
    (useMediaSession as any)._lastSec = now;
    try {
      navigator.mediaSession.setPositionState({
        duration, playbackRate: 1,
        position: Math.min(Math.max(0, currentTime), duration),
      });
    } catch { /* ignore */ }
  }, [currentTime, duration]);

  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    const ms = navigator.mediaSession;
    const safeSet = (a: MediaSessionAction, h: MediaSessionActionHandler | null) => {
      try { ms.setActionHandler(a, h); } catch { /* unsupported */ }
    };
    safeSet('play', () => onPlay());
    safeSet('pause', () => onPause());
    safeSet('previoustrack', () => onPrev());
    safeSet('nexttrack', () => onNext());
    safeSet('stop', () => onStop());
    safeSet('seekbackward', (d) => {
      const offset = d.seekOffset ?? 10;
      onSeekRef.current(Math.max(0, currentTimeRef.current - offset));
    });
    safeSet('seekforward', (d) => {
      const offset = d.seekOffset ?? 10;
      onSeekRef.current(Math.min(durationRef.current, currentTimeRef.current + offset));
    });
    safeSet('seekto', (d) => {
      if (d.seekTime != null) onSeekRef.current(d.seekTime);
    });
    return () => {
      (['play','pause','previoustrack','nexttrack','stop','seekbackward','seekforward','seekto'] as MediaSessionAction[])
        .forEach(a => { try { ms.setActionHandler(a, null); } catch { /* ignore */ } });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onPlay, onPause, onNext, onPrev, onStop]);
}
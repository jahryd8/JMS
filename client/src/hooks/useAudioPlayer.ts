import { useState, useRef, useCallback, useEffect } from 'react';
import { getAudioUrl } from '../lib/urls';
import type { Song } from '../types';

interface Args {
  authToken: string | null;
  isOnline: boolean;
  getCachedBlob: (songId: string) => Promise<Blob | undefined>;
  isDownloaded: (songId: string) => boolean;
}

export function useAudioPlayer({ authToken, isOnline, getCachedBlob, isDownloaded }: Args) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const blobUrlRef = useRef<Map<string, string>>(new Map());
  const shouldBePlayingRef = useRef(false);

  const [allSongs, setAllSongs] = useState<Song[]>([]);
  const [playbackQueue, setPlaybackQueue] = useState<Song[]>([]);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);
  const [isRepeat, setIsRepeat] = useState(false);
  const [pendingSeekTime, setPendingSeekTime] = useState<number | null>(null);

  const currentTrack: Song | undefined = playbackQueue[currentTrackIndex] || allSongs[0];

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = isMuted ? 0 : volume;
  }, [volume, isMuted]);

  useEffect(() => {
    if (!audioRef.current || !currentTrack) return;

    let cancelled = false;
    const trackId = currentTrack.id;

    const load = async () => {
      let url: string;
      const downloaded = isDownloaded(trackId);

      if (downloaded) {
        let blobUrl = blobUrlRef.current.get(trackId);
        if (!blobUrl) {
          const blob = await getCachedBlob(trackId);
          if (!blob) { console.warn('[Player] Blob missing'); return; }
          blobUrl = URL.createObjectURL(blob);
          blobUrlRef.current.set(trackId, blobUrl);
        }
        url = blobUrl;
      } else if (!isOnline) {
        console.warn('[Player] Offline, track not downloaded');
        return;
      } else {
        url = getAudioUrl(currentTrack, authToken);
      }

      if (cancelled) return;
      const audio = audioRef.current!;
      const targetSeek = pendingSeekTime ?? 0;

      const restorePosition = () => {
        if (targetSeek > 0 && Math.abs(audio.currentTime - targetSeek) > 1) {
          try { audio.currentTime = targetSeek; } catch { /* ignore */ }
        }
        audio.removeEventListener('loadedmetadata', restorePosition);
        setPendingSeekTime(null);
      };
      audio.addEventListener('loadedmetadata', restorePosition);
      audio.src = url;
      audio.load();

      if (shouldBePlayingRef.current) {
        audio.play()
          .then(() => { setIsPlaying(true); })
          .catch((err) => {
            console.warn('[Player] play() rejected:', err.message);
            setTimeout(() => {
              if (shouldBePlayingRef.current && audioRef.current) {
                audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
              }
            }, 500);
          });
      }
    };

    load();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTrackIndex, currentTrack?.id, authToken, isOnline, pendingSeekTime]);

  const handlePlayTrack = (track: Song, targetList: Song[]) => {
    setPlaybackQueue(targetList);
    const idx = targetList.findIndex(s => s.id === track.id);
    setCurrentTrackIndex(idx !== -1 ? idx : 0);
    setCurrentTime(0);
    setPendingSeekTime(0);
    shouldBePlayingRef.current = true;
    setIsPlaying(true);
  };

  const togglePlay = () => {
    if (!audioRef.current || !currentTrack) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      shouldBePlayingRef.current = false;
    } else {
      shouldBePlayingRef.current = true;
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {
        setTimeout(() => {
          if (shouldBePlayingRef.current && audioRef.current) {
            audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
          }
        }, 500);
      });
    }
  };

  const handleNext = useCallback(() => {
    if (playbackQueue.length === 0) return;
    if (isRepeat && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
      return;
    }
    shouldBePlayingRef.current = true;
    if (isShuffle) setCurrentTrackIndex(Math.floor(Math.random() * playbackQueue.length));
    else setCurrentTrackIndex(prev => (prev + 1) % playbackQueue.length);
    setCurrentTime(0);
    setPendingSeekTime(0);
    setIsPlaying(true);
  }, [isRepeat, isShuffle, playbackQueue.length]);

  const handlePrev = () => {
    if (playbackQueue.length === 0) return;
    if (currentTime > 3 && audioRef.current) {
      audioRef.current.currentTime = 0;
    } else {
      setCurrentTrackIndex(prev => (prev - 1 + playbackQueue.length) % playbackQueue.length);
      setPendingSeekTime(0);
    }
    setIsPlaying(true);
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
      setDuration(audioRef.current.duration || currentTrack?.duration || 0);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const t = parseFloat(e.target.value);
    setCurrentTime(t);
    if (audioRef.current) audioRef.current.currentTime = t;
  };

  return {
    audioRef,
    allSongs, setAllSongs,
    playbackQueue, setPlaybackQueue,
    currentTrackIndex, setCurrentTrackIndex,
    currentTrack,
    isPlaying, setIsPlaying,
    currentTime, setCurrentTime,
    duration,
    volume, setVolume,
    isMuted, setIsMuted,
    isShuffle, setIsShuffle,
    isRepeat, setIsRepeat,
    pendingSeekTime, setPendingSeekTime,
    handlePlayTrack, togglePlay, handleNext, handlePrev,
    handleTimeUpdate, handleSeek,
  };
}
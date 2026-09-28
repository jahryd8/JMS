import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play, Pause, SkipBack, SkipForward, Shuffle, Repeat, Volume2, VolumeX,
  Search, Moon, Sun, Music, Heart, Disc,
  LogOut, Plus, Trash2, X,
  Lock, User, DownloadCloud, ChevronUp, ChevronDown, Menu, Check,
  HardDriveDownload, WifiOff
} from 'lucide-react';
import type { Song } from './types/song';

interface Playlist {
  id: string;
  name: string;
  songIds: string[];
  isSystem?: boolean;
}

interface DownloadedTrack {
  id: string;
  song: Song;
  blob: Blob;
  downloadedAt: number;
}

const DEFAULT_PLAYLISTS: Playlist[] = [
  { id: 'pl-fav', name: 'Favourites', songIds: [], isSystem: true },
  { id: 'pl-vibe', name: 'Chill Vibes', songIds: [] }
];

const GENERIC_COVERS = [
  "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&w=400&q=80"
];

const ITEMS_PER_BATCH = 20;
const API_BASE = 'http://localhost:5000';
const DB_NAME = 'jms_downloads';
const DB_STORE = 'tracks';

// ============================================================
// URL helpers
// ============================================================
function toAbsoluteUrl(url: string | undefined): string | undefined {
  if (!url) return url;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('/')) return `${API_BASE}${url}`;
  return url;
}

// ============================================================
// IndexedDB helpers for offline downloads
// ============================================================
function openDB(): Promise<IDBDatabase> {
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

async function saveDownload(track: DownloadedTrack): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DB_STORE, 'readwrite');
    tx.objectStore(DB_STORE).put(track);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function getAllDownloads(): Promise<DownloadedTrack[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DB_STORE, 'readonly');
    const req = tx.objectStore(DB_STORE).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

async function removeDownload(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DB_STORE, 'readwrite');
    tx.objectStore(DB_STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export default function App() {
  // ---------- Auth State ----------
  const [authToken, setAuthToken] = useState<string | null>(() => localStorage.getItem('jms_token'));
  const [user, setUser] = useState<{ username: string; role: string } | null>(() => {
    const saved = localStorage.getItem('jms_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // ---------- UI State ----------
  const [darkMode, setDarkMode] = useState(true);
  const [activeTab, setActiveTab] = useState('Discover');
  const [activePlaylistId, setActivePlaylistId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_BATCH);

  // ---------- Library / Player State ----------
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
  const [isLoading, setIsLoading] = useState(false);

  // ---------- Playlist State ----------
  const [playlists, setPlaylists] = useState<Playlist[]>(() => {
    const saved = localStorage.getItem('jms_playlists');
    return saved ? JSON.parse(saved) : DEFAULT_PLAYLISTS;
  });
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [openDropdownSongId, setOpenDropdownSongId] = useState<string | null>(null);

  // ---------- Downloads State ----------
  const [downloads, setDownloads] = useState<DownloadedTrack[]>([]);
  const [downloadProgress, setDownloadProgress] = useState<Record<string, number>>({});
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentTrack: Song | undefined = playbackQueue[currentTrackIndex] || allSongs[0];

  const isDownloaded = useCallback(
    (songId: string) => downloads.some(d => d.id === songId),
    [downloads]
  );

  // ---------- Load downloads from IndexedDB ----------
  useEffect(() => {
    getAllDownloads().then(setDownloads).catch(err => console.error('DB load failed:', err));
  }, []);

  // ---------- Online/Offline listener ----------
  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  // ---------- Cover helper ----------
  const getCoverUrl = (song?: Song): string => {
    if (!song) return GENERIC_COVERS[0];

    if (song.coverPath) {
      if (song.coverPath.startsWith('data:')) return song.coverPath;
      const absolute = toAbsoluteUrl(song.coverPath);
      if (!absolute) return GENERIC_COVERS[0];
      const sep = absolute.includes('?') ? '&' : '?';
      return `${absolute}${sep}token=${authToken}`;
    }

    let charHash = 0;
    for (let i = 0; i < song.id.length; i++) charHash += song.id.charCodeAt(i);
    return GENERIC_COVERS[charHash % GENERIC_COVERS.length];
  };

  // ---------- Audio URL helper ----------
  const getAudioUrl = (song: Song): string => {
    const absolute = toAbsoluteUrl(song.audioUrl) || '';
    const sep = absolute.includes('?') ? '&' : '?';
    return `${absolute}${sep}token=${authToken}`;
  };

  useEffect(() => {
    setVisibleCount(ITEMS_PER_BATCH);
  }, [activeTab, activePlaylistId, searchQuery]);

  // ---------- Close dropdown on outside click ----------
  useEffect(() => {
    if (!openDropdownSongId) return;
    const close = () => setOpenDropdownSongId(null);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [openDropdownSongId]);

  // ---------- Auth ----------
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: loginUsername, password: loginPassword })
      });
      const data = await res.json();
      if (res.ok) {
        setAuthToken(data.token);
        setUser(data.user);
        localStorage.setItem('jms_token', data.token);
        localStorage.setItem('jms_user', JSON.stringify(data.user));
      } else {
        setLoginError(data.error || 'Login failed.');
      }
    } catch {
      setLoginError('Cannot connect to JMS backend server.');
    }
  };

  const handleLogout = () => {
    if (audioRef.current) audioRef.current.pause();
    setIsPlaying(false);
    setAuthToken(null);
    setUser(null);
    setAllSongs([]);
    setPlaybackQueue([]);
    localStorage.removeItem('jms_token');
    localStorage.removeItem('jms_user');
  };

  useEffect(() => {
    localStorage.setItem('jms_playlists', JSON.stringify(playlists));
  }, [playlists]);

  // ---------- Library ----------
  const fetchLibrary = async () => {
    if (!authToken) return;
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/library/songs?page=1&limit=1000`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (response.ok) {
        const data = await response.json();
        console.log('[Library] Received', data.songs?.length, 'songs');
        const incomingSongs: Song[] = data.songs || [];
        setAllSongs(incomingSongs);
        setPlaybackQueue(incomingSongs);
      } else if (response.status === 401 || response.status === 403) {
        handleLogout();
      } else {
        console.error('[Library] Failed:', response.status, await response.text());
      }
    } catch (err) {
      console.error('Failed to load library:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (authToken) fetchLibrary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authToken]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = isMuted ? 0 : volume;
  }, [volume, isMuted]);

  // ---------- Track loading (supports offline blobs) ----------
  useEffect(() => {
    if (!audioRef.current || !currentTrack) return;

    const localDownload = downloads.find(d => d.id === currentTrack.id);
    let url: string;

    if (localDownload) {
      url = URL.createObjectURL(localDownload.blob);
    } else {
      url = getAudioUrl(currentTrack);
    }

    console.log('[Player] Setting src:', url);
    audioRef.current.src = url;
    audioRef.current.load();

    if (isPlaying) {
      audioRef.current.play().catch(e => console.error('Playback error:', e));
    }

    return () => {
      if (localDownload) URL.revokeObjectURL(url);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTrackIndex, currentTrack?.id, authToken, downloads]);

  // ---------- Player controls ----------
  const handlePlayTrack = (track: Song, targetList: Song[]) => {
    setPlaybackQueue(targetList);
    const targetIdx = targetList.findIndex(s => s.id === track.id);
    setCurrentTrackIndex(targetIdx !== -1 ? targetIdx : 0);
    setIsPlaying(true);
  };

  const togglePlay = () => {
    if (!audioRef.current || !currentTrack) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => setIsPlaying(true)).catch(err => console.error(err));
    }
  };

  const handleNext = useCallback(() => {
    if (playbackQueue.length === 0) return;
    if (isRepeat && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play();
      return;
    }
    if (isShuffle) {
      setCurrentTrackIndex(Math.floor(Math.random() * playbackQueue.length));
    } else {
      setCurrentTrackIndex(prev => (prev + 1) % playbackQueue.length);
    }
    setIsPlaying(true);
  }, [isRepeat, isShuffle, playbackQueue.length]);

  const handlePrev = () => {
    if (playbackQueue.length === 0) return;
    if (currentTime > 3 && audioRef.current) {
      audioRef.current.currentTime = 0;
    } else {
      setCurrentTrackIndex(prev => (prev - 1 + playbackQueue.length) % playbackQueue.length);
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
    const seekTime = parseFloat(e.target.value);
    setCurrentTime(seekTime);
    if (audioRef.current) audioRef.current.currentTime = seekTime;
  };

  // ---------- Download to IndexedDB ----------
  const downloadTrack = async (song: Song, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isDownloaded(song.id)) return;

    setDownloadProgress(prev => ({ ...prev, [song.id]: 0 }));
    try {
      const url = getAudioUrl(song);
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
                [song.id]: Math.round((received / contentLength) * 100)
              }));
            }
          }
        }
      }

      const blob = new Blob(chunks as BlobPart[], { type: 'audio/mpeg' });
      const track: DownloadedTrack = {
        id: song.id,
        song,
        blob,
        downloadedAt: Date.now()
      };
      await saveDownload(track);
      setDownloads(prev => [...prev.filter(d => d.id !== song.id), track]);
    } catch (err) {
      console.error('Download failed:', err);
      alert('Download failed. You may be offline or unauthorized.');
    } finally {
      setDownloadProgress(prev => {
        const next = { ...prev };
        delete next[song.id];
        return next;
      });
    }
  };

  const removeDownloaded = async (songId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await removeDownload(songId);
      setDownloads(prev => prev.filter(d => d.id !== songId));
    } catch (err) {
      console.error('Failed to remove download:', err);
    }
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs <= 0) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // ---------- Playlist actions ----------
  const createPlaylist = () => {
    if (!newPlaylistName.trim()) return;
    const newPl: Playlist = {
      id: `pl-${Date.now()}`,
      name: newPlaylistName.trim(),
      songIds: []
    };
    setPlaylists([...playlists, newPl]);
    setNewPlaylistName('');
    setIsCreateModalOpen(false);
    setActivePlaylistId(newPl.id);
    setActiveTab('PlaylistView');
  };

  const deletePlaylist = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setPlaylists(prev => prev.filter(p => p.id !== id));
    if (activePlaylistId === id) {
      setActivePlaylistId(null);
      setActiveTab('Discover');
    }
  };

  const toggleSongInPlaylist = (playlistId: string, songId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setPlaylists(prev => prev.map(pl => {
      if (pl.id === playlistId) {
        const exists = pl.songIds.includes(songId);
        return {
          ...pl,
          songIds: exists ? pl.songIds.filter(id => id !== songId) : [...pl.songIds, songId]
        };
      }
      return pl;
    }));
  };

  const removeFromActivePlaylist = (songId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!activePlaylistId) return;
    setPlaylists(prev => prev.map(pl => {
      if (pl.id !== activePlaylistId) return pl;
      return { ...pl, songIds: pl.songIds.filter(id => id !== songId) };
    }));
    setOpenDropdownSongId(null);
  };

  const moveTrackInPlaylist = (
    playlistId: string,
    songId: string,
    direction: 'up' | 'down',
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    setPlaylists(prev => prev.map(pl => {
      if (pl.id !== playlistId) return pl;
      const idx = pl.songIds.indexOf(songId);
      if (idx === -1) return pl;
      const newIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (newIdx < 0 || newIdx >= pl.songIds.length) return pl;
      const updatedIds = [...pl.songIds];
      const [movedItem] = updatedIds.splice(idx, 1);
      updatedIds.splice(newIdx, 0, movedItem);
      return { ...pl, songIds: updatedIds };
    }));
  };

  const favPlaylist = playlists.find(p => p.id === 'pl-fav');
  const isFavorite = (songId: string) => favPlaylist?.songIds.includes(songId) ?? false;

  const toggleFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!favPlaylist) return;
    toggleSongInPlaylist('pl-fav', id, e);
  };

  const activePlaylist = playlists.find(p => p.id === activePlaylistId);

  // ---------- Filtering ----------
  const getDisplayedSongs = (): Song[] => {
    let baseList = allSongs;

    if (activeTab === 'Downloads') {
      baseList = downloads.map(d => d.song);
    } else if (activeTab === 'Favourites') {
      const favIds = favPlaylist?.songIds || [];
      baseList = allSongs.filter(s => favIds.includes(s.id));
    } else if (activeTab === 'PlaylistView' && activePlaylist) {
      baseList = activePlaylist.songIds
        .map(id => allSongs.find(s => s.id === id))
        .filter((s): s is Song => s !== undefined);
    }

    const q = searchQuery.toLowerCase();
    if (!q) return baseList;
    return baseList.filter(s =>
      s.title.toLowerCase().includes(q) ||
      s.artist.toLowerCase().includes(q)
    );
  };

  const fullFilteredSongs = getDisplayedSongs();
  const visibleSongs = fullFilteredSongs.slice(0, visibleCount);

  const getPlaylistRealCount = (pl: Playlist) =>
    pl.songIds.filter(id => allSongs.some(s => s.id === id)).length;

  // =========================================================
  // LIGHT / DARK THEME TOKENS
  // =========================================================
  const theme = darkMode
    ? {
        bg: 'bg-slate-950',
        bgSoft: 'bg-slate-900/50',
        surface: 'bg-slate-900',
        surfaceAlt: 'bg-slate-800',
        border: 'border-slate-800',
        text: 'text-white',
        textMuted: 'text-slate-400',
        hover: 'hover:bg-slate-800/60',
        header: 'bg-slate-950/80 border-slate-800',
        playerBar: 'bg-slate-950/95 border-slate-800',
        heroGrad: 'from-blue-600/20 via-purple-600/10 to-transparent',
        heroBorder: 'border-blue-500/20',
        accentText: 'text-blue-400',
        chip: 'bg-blue-600 text-white',
      }
    : {
        bg: 'bg-gradient-to-br from-amber-50 via-rose-50 to-indigo-50',
        bgSoft: 'bg-white/70',
        surface: 'bg-white',
        surfaceAlt: 'bg-slate-100',
        border: 'border-slate-200',
        text: 'text-slate-900',
        textMuted: 'text-slate-500',
        hover: 'hover:bg-indigo-50',
        header: 'bg-white/80 border-slate-200',
        playerBar: 'bg-white/95 border-slate-200',
        heroGrad: 'from-indigo-500 via-purple-500 to-pink-500',
        heroBorder: 'border-transparent',
        accentText: 'text-indigo-600',
        chip: 'bg-indigo-600 text-white',
      };

  // =========================================================
  // LOGIN SCREEN
  // =========================================================
  if (!authToken || !user) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-4 transition-colors ${
        darkMode ? 'bg-slate-950 text-white' : 'bg-gradient-to-br from-indigo-100 via-purple-100 to-pink-100 text-slate-900'
      }`}>
        <div className={`w-full max-w-md p-8 rounded-2xl shadow-2xl border ${
          darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-purple-200'
        }`}>
          <div className="flex items-center justify-center mb-6">
            <div className={`p-3 rounded-full ${darkMode ? 'bg-blue-600/10 border border-blue-500/30' : 'bg-gradient-to-br from-indigo-500 to-purple-600'}`}>
              <Lock className={`w-6 h-6 ${darkMode ? 'text-blue-500' : 'text-white'}`} />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-center mb-1">JMS Server</h1>
          <p className={`text-sm text-center mb-6 ${theme.textMuted}`}>
            Authorized Private Server Access Only
          </p>

          {loginError && (
            <div className="mb-4 px-3 py-2 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs">
              {loginError}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className={`block text-xs font-medium mb-1.5 ${theme.textMuted}`}>Username</label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  className={`w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none border transition ${
                    darkMode
                      ? 'bg-slate-800/80 border-slate-700 text-white focus:border-blue-500'
                      : 'bg-slate-50 border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100'
                  }`}
                  placeholder="Enter username"
                  required
                />
              </div>
            </div>

            <div>
              <label className={`block text-xs font-medium mb-1.5 ${theme.textMuted}`}>Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className={`w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none border transition ${
                    darkMode
                      ? 'bg-slate-800/80 border-slate-700 text-white focus:border-blue-500'
                      : 'bg-slate-50 border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100'
                  }`}
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className={`w-full py-2.5 rounded-xl text-white text-sm font-semibold transition shadow-lg ${
                darkMode
                  ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20'
                  : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-indigo-500/30'
              }`}
            >
              Sign In to JMS
            </button>
          </form>
        </div>
      </div>
    );
  }

  // =========================================================
  // SIDEBAR NAV
  // =========================================================
  const renderSidebarNav = () => (
    <div className="flex flex-col gap-6">
      <div>
        <p className={`px-3 mb-2 text-[10px] font-bold tracking-widest uppercase ${theme.textMuted}`}>
          Menu
        </p>
        <div className="space-y-1">
          {[
            { name: 'Discover', icon: Disc },
            { name: 'My Music', icon: Music },
            { name: 'Favourites', icon: Heart },
            { name: 'Downloads', icon: HardDriveDownload },
          ].map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.name && !activePlaylistId;
            const badge = item.name === 'Downloads' && downloads.length > 0 ? downloads.length : null;
            return (
              <button
                key={item.name}
                onClick={() => {
                  setActiveTab(item.name);
                  setActivePlaylistId(null);
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? darkMode
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-500/30'
                    : darkMode
                      ? 'text-slate-300 hover:bg-slate-800/60'
                      : 'text-slate-700 hover:bg-indigo-50'
                }`}
              >
                <span className="flex items-center gap-3">
                  <Icon className="w-4 h-4" />
                  {item.name}
                </span>
                {badge !== null && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                    isActive ? 'bg-white/25 text-white' : darkMode ? 'bg-slate-800 text-slate-300' : 'bg-indigo-100 text-indigo-700'
                  }`}>
                    {badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between px-3 mb-2">
          <p className={`text-[10px] font-bold tracking-widest uppercase ${theme.textMuted}`}>
            Playlists
          </p>
          <button
            onClick={() => {
              setIsCreateModalOpen(true);
              setIsMobileMenuOpen(false);
            }}
            className={`p-1 rounded-md transition ${
              darkMode ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-indigo-100 text-indigo-600'
            }`}
            title="Create Playlist"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-1">
          {playlists.map((pl) => {
            const isActive = activeTab === 'PlaylistView' && activePlaylistId === pl.id;
            const count = getPlaylistRealCount(pl);
            return (
              <div
                key={pl.id}
                onClick={() => {
                  setActivePlaylistId(pl.id);
                  setActiveTab('PlaylistView');
                  setIsMobileMenuOpen(false);
                }}
                className={`group w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-sm font-medium cursor-pointer transition-all ${
                  isActive
                    ? darkMode
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-500/30'
                    : darkMode
                      ? 'text-slate-300 hover:bg-slate-800/60'
                      : 'text-slate-700 hover:bg-indigo-50'
                }`}
              >
                <span className="truncate flex-1 min-w-0">{pl.name}</span>
                <div className="flex items-center gap-1 shrink-0">
                  <span className={`text-[10px] tabular-nums w-6 text-right ${
                    isActive ? 'text-white/80' : theme.textMuted
                  }`}>
                    {count}
                  </span>
                  {!pl.isSystem && (
                    <button
                      onClick={(e) => deletePlaylist(pl.id, e)}
                      className={`p-1 rounded transition ${
                        isActive
                          ? 'hover:bg-white/20 text-white opacity-0 group-hover:opacity-100'
                          : darkMode
                            ? 'hover:text-rose-400 opacity-0 group-hover:opacity-100'
                            : 'hover:text-rose-500 opacity-0 group-hover:opacity-100'
                      }`}
                      title="Delete Playlist"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <button
        onClick={handleLogout}
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
          darkMode ? 'text-slate-400 hover:bg-slate-800/60' : 'text-slate-600 hover:bg-indigo-50'
        }`}
      >
        <LogOut className="w-4 h-4" />
        Log Out
      </button>
    </div>
  );

  // =========================================================
  // MAIN APP
  // =========================================================
  return (
    <div className={`min-h-screen transition-colors ${theme.bg} ${theme.text}`}>
      {/* HEADER */}
      <header className={`sticky top-0 z-30 px-3 sm:px-4 py-3 border-b backdrop-blur-md ${theme.header}`}>
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className={`md:hidden p-2 rounded-lg ${darkMode ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-100 text-slate-700'}`}
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <div className={`p-1.5 rounded-lg ${darkMode ? 'bg-blue-600' : 'bg-gradient-to-br from-indigo-500 to-purple-600'}`}>
                <Music className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-base sm:text-lg tracking-tight">JMS</span>
              {!isOnline && (
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-500 font-semibold">
                  <WifiOff className="w-3 h-3" /> Offline
                </span>
              )}
            </div>
          </div>

          <div className="relative flex-1 max-w-md hidden sm:block">
            <Search className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 ${theme.textMuted}`} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search songs, artists..."
              className={`w-full pl-9 pr-4 py-1.5 rounded-full text-xs sm:text-sm outline-none transition-all ${
                darkMode
                  ? 'bg-slate-800/80 text-white border border-slate-700 focus:border-blue-500'
                  : 'bg-white text-slate-800 border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100'
              }`}
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`p-2 rounded-full transition-colors ${
                darkMode ? 'hover:bg-slate-800 text-amber-400' : 'hover:bg-amber-100 text-amber-600'
              }`}
              title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white ${
              darkMode ? 'bg-blue-600' : 'bg-gradient-to-br from-indigo-500 to-purple-600'
            }`}>
              {user.username.charAt(0).toUpperCase()}
            </div>
          </div>
        </div>
      </header>

      {/* MOBILE DRAWER */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div className={`absolute left-0 top-0 bottom-0 w-72 p-5 overflow-y-auto ${
            darkMode ? 'bg-slate-900' : 'bg-white'
          }`}>
            <div className="flex items-center justify-between mb-6">
              <span className="font-bold text-lg">Menu</span>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-1 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {renderSidebarNav()}
          </div>
        </div>
      )}

      {/* MAIN CONTAINER */}
      <div className="max-w-7xl mx-auto flex gap-6 px-3 sm:px-4 py-4 sm:py-6">
        {/* DESKTOP SIDEBAR */}
        <aside className={`hidden md:block w-64 shrink-0 p-4 rounded-2xl border h-fit sticky top-24 ${theme.surface} ${theme.border}`}>
          {renderSidebarNav()}
        </aside>

        {/* WORKSPACE AREA */}
        <main className="flex-1 min-w-0 pb-40 md:pb-28">
          {/* MOBILE SEARCH */}
          <div className="sm:hidden mb-4 relative">
            <Search className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 ${theme.textMuted}`} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search songs, artists..."
              className={`w-full pl-9 pr-4 py-2 rounded-full text-sm outline-none ${
                darkMode
                  ? 'bg-slate-800/80 text-white border border-slate-700 focus:border-blue-500'
                  : 'bg-white text-slate-800 border border-slate-300 focus:border-indigo-500'
              }`}
            />
          </div>

          {/* HERO CARD */}
          <div className={`p-5 sm:p-6 rounded-2xl mb-6 border bg-gradient-to-br ${theme.heroGrad} ${theme.heroBorder}`}>
            <h1 className={`text-xl sm:text-3xl font-bold mb-1 ${darkMode ? '' : 'text-slate-900'}`}>
              {activePlaylist
                ? activePlaylist.name
                : activeTab === 'Downloads'
                  ? 'Offline Library'
                  : "Jah's Music Station"}
            </h1>
            <p className={`text-xs sm:text-sm ${darkMode ? 'text-slate-400' : 'text-slate-700'}`}>
              {activePlaylist
                ? `Custom playlist with ${getPlaylistRealCount(activePlaylist)} tracks.`
                : activeTab === 'Downloads'
                  ? `${downloads.length} track${downloads.length === 1 ? '' : 's'} available offline.`
                  : 'Welcome to your private music library. Stream anywhere seamlessly.'}
            </p>
          </div>

          {/* TRACKS LIST HEADER */}
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-bold">
              {activePlaylist ? activePlaylist.name : activeTab}
            </h2>
            <span className={`text-xs ${theme.textMuted}`}>
              {visibleSongs.length} / {fullFilteredSongs.length} tracks
            </span>
          </div>

          {isLoading ? (
            <div className={`text-center py-12 text-sm ${theme.textMuted}`}>Loading library...</div>
          ) : fullFilteredSongs.length === 0 ? (
            <div className={`text-center py-12 rounded-2xl border ${theme.border} ${theme.textMuted}`}>
              {activeTab === 'Downloads' ? (
                <>
                  <HardDriveDownload className="w-10 h-10 mx-auto mb-3 opacity-40" />
                  <p className="text-sm">No offline tracks yet.</p>
                  <p className="text-xs mt-1 opacity-70">Tap the download icon on any song to save it.</p>
                </>
              ) : (
                <>
                  <Music className="w-10 h-10 mx-auto mb-3 opacity-40" />
                  <p className="text-sm">No audio tracks found in this view.</p>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-1">
              {visibleSongs.map((song, idx) => {
                const isCurrent = currentTrack?.id === song.id;
                const isFav = isFavorite(song.id);
                const isDropdownOpen = openDropdownSongId === song.id;
                const downloaded = isDownloaded(song.id);
                const progress = downloadProgress[song.id];

                return (
                  <div
                    key={song.id}
                    onClick={() => handlePlayTrack(song, fullFilteredSongs)}
                    className={`group relative flex items-center justify-between gap-2 p-2 sm:p-3.5 rounded-xl transition-all cursor-pointer border ${
                      isCurrent
                        ? darkMode
                          ? 'bg-blue-600/20 border-blue-500/40'
                          : 'bg-indigo-100 border-indigo-300'
                        : darkMode
                          ? 'hover:bg-slate-800/60 border-transparent'
                          : 'hover:bg-white border-transparent hover:border-indigo-100'
                    }`}
                  >
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                      <div className="relative shrink-0">
                        <img
                          src={getCoverUrl(song)}
                          alt={song.title}
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = GENERIC_COVERS[0];
                          }}
                          className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg object-cover bg-slate-800 shadow-sm"
                        />
                        {isCurrent && isPlaying && (
                          <div className="absolute inset-0 rounded-lg bg-black/40 flex items-center justify-center">
                            <Play className="w-4 h-4 text-white fill-white" />
                          </div>
                        )}
                        {downloaded && (
                          <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center border-2 border-white dark:border-slate-950">
                            <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className={`text-xs sm:text-sm font-semibold truncate ${
                          isCurrent ? theme.accentText : ''
                        }`}>
                          {song.title}
                        </p>
                        <p className={`text-[10px] sm:text-xs truncate ${theme.textMuted}`}>
                          {song.artist}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-0.5 sm:gap-1.5 shrink-0">
                      <span className={`text-[10px] sm:text-xs hidden sm:inline ${theme.textMuted}`}>
                        {formatTime(song.duration)}
                      </span>

                      {activeTab === 'PlaylistView' && activePlaylistId && (
                        <div className="hidden sm:flex items-center">
                          <button
                            onClick={(e) => moveTrackInPlaylist(activePlaylistId, song.id, 'up', e)}
                            disabled={idx === 0}
                            className={`p-1 rounded disabled:opacity-30 ${darkMode ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-indigo-600'}`}
                          >
                            <ChevronUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => moveTrackInPlaylist(activePlaylistId, song.id, 'down', e)}
                            disabled={idx === visibleSongs.length - 1}
                            className={`p-1 rounded disabled:opacity-30 ${darkMode ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-indigo-600'}`}
                          >
                            <ChevronDown className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}

                      {activeTab === 'PlaylistView' && activePlaylistId && activePlaylistId !== 'pl-fav' && (
                        <button
                          onClick={(e) => removeFromActivePlaylist(song.id, e)}
                          className="p-1.5 rounded-full text-slate-400 hover:text-rose-500 transition"
                          title="Remove from playlist"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}

                      <button
                        onClick={(e) =>
                          downloaded
                            ? removeDownloaded(song.id, e)
                            : downloadTrack(song, e)
                        }
                        disabled={progress !== undefined}
                        className={`p-1.5 rounded-full transition hidden sm:inline-flex ${
                          downloaded
                            ? 'text-emerald-500 hover:text-rose-500'
                            : progress !== undefined
                              ? 'text-blue-500 cursor-wait'
                              : 'text-slate-400 hover:text-blue-500'
                        }`}
                        title={
                          downloaded
                            ? 'Downloaded — click to remove'
                            : progress !== undefined
                              ? `Downloading ${progress}%`
                              : 'Download for offline'
                        }
                      >
                        {progress !== undefined ? (
                          <span className="text-[10px] font-bold tabular-nums w-4 text-center">
                            {progress}
                          </span>
                        ) : downloaded ? (
                          <HardDriveDownload className="w-4 h-4" />
                        ) : (
                          <DownloadCloud className="w-4 h-4" />
                        )}
                      </button>

                      <button
                        onClick={(e) => toggleFavorite(song.id, e)}
                        className={`p-1.5 rounded-full transition ${
                          isFav ? 'text-rose-500' : darkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-400 hover:text-rose-400'
                        }`}
                      >
                        <Heart className={`w-4 h-4 ${isFav ? 'fill-rose-500' : ''}`} />
                      </button>

                      <div className="relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenDropdownSongId(isDropdownOpen ? null : song.id);
                          }}
                          className={`p-1.5 rounded-full transition ${darkMode ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-indigo-600'}`}
                          title="Add to Playlist"
                        >
                          <Plus className="w-4 h-4" />
                        </button>

                        {isDropdownOpen && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className={`absolute right-0 top-full mt-2 w-48 rounded-xl shadow-xl border z-50 p-2 ${
                              darkMode
                                ? 'bg-slate-900 border-slate-700 text-white'
                                : 'bg-white border-slate-200 text-slate-800'
                            }`}
                          >
                            <p className={`px-2 py-1 text-[10px] font-bold tracking-widest uppercase ${theme.textMuted}`}>
                              Add to Playlist
                            </p>
                            {playlists.map(pl => {
                              const inPl = pl.songIds.includes(song.id);
                              return (
                                <button
                                  key={pl.id}
                                  onClick={(e) => toggleSongInPlaylist(pl.id, song.id, e)}
                                  className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-xs font-medium transition ${
                                    darkMode ? 'hover:bg-slate-800' : 'hover:bg-indigo-50'
                                  }`}
                                >
                                  <span className="truncate">{pl.name}</span>
                                  {inPl && <Check className="w-3.5 h-3.5 text-indigo-500" />}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {visibleCount < fullFilteredSongs.length && (
            <div className="mt-6 text-center">
              <button
                onClick={() => setVisibleCount(prev => prev + ITEMS_PER_BATCH)}
                className={`px-6 py-2.5 rounded-xl font-semibold text-xs transition shadow-md inline-flex items-center gap-2 ${
                  darkMode
                    ? 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                    : 'bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200'
                }`}
              >
                Load More Tracks ({fullFilteredSongs.length - visibleCount} remaining)
              </button>
            </div>
          )}
        </main>
      </div>

      {/* MOBILE BOTTOM NAV */}
      <nav className={`md:hidden fixed bottom-0 left-0 right-0 z-20 border-t backdrop-blur-md ${theme.playerBar}`}>
        <div className="flex items-center justify-around py-2">
          <button
            onClick={() => { setActiveTab('Discover'); setActivePlaylistId(null); }}
            className={`flex flex-col items-center gap-1 text-[10px] font-medium px-3 py-1 ${
              activeTab === 'Discover' ? theme.accentText : 'text-slate-400'
            }`}
          >
            <Disc className="w-5 h-5" />
            Discover
          </button>
          <button
            onClick={() => { setActiveTab('My Music'); setActivePlaylistId(null); }}
            className={`flex flex-col items-center gap-1 text-[10px] font-medium px-3 py-1 ${
              activeTab === 'My Music' ? theme.accentText : 'text-slate-400'
            }`}
          >
            <Music className="w-5 h-5" />
            Library
          </button>
          <button
            onClick={() => { setActiveTab('Favourites'); setActivePlaylistId(null); }}
            className={`flex flex-col items-center gap-1 text-[10px] font-medium px-3 py-1 ${
              activeTab === 'Favourites' ? theme.accentText : 'text-slate-400'
            }`}
          >
            <Heart className="w-5 h-5" />
            Favourites
          </button>
          <button
            onClick={() => { setActiveTab('Downloads'); setActivePlaylistId(null); }}
            className={`flex flex-col items-center gap-1 text-[10px] font-medium px-3 py-1 relative ${
              activeTab === 'Downloads' ? theme.accentText : 'text-slate-400'
            }`}
          >
            <HardDriveDownload className="w-5 h-5" />
            Downloads
            {downloads.length > 0 && (
              <span className="absolute top-0 right-1 w-4 h-4 rounded-full bg-indigo-500 text-white text-[9px] flex items-center justify-center font-bold">
                {downloads.length}
              </span>
            )}
          </button>
        </div>
      </nav>

      {/* CREATE PLAYLIST MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsCreateModalOpen(false)}
          />
          <div className={`relative w-full max-w-sm p-6 rounded-2xl shadow-2xl border ${theme.surface} ${theme.border}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">Create Playlist</h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className={`p-1 rounded-md ${theme.textMuted} hover:text-rose-500`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <input
              type="text"
              value={newPlaylistName}
              onChange={(e) => setNewPlaylistName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && createPlaylist()}
              placeholder="Playlist name"
              className={`w-full px-4 py-2.5 rounded-xl text-sm outline-none mb-6 border ${
                darkMode
                  ? 'bg-slate-800 border-slate-700 text-white focus:border-blue-500'
                  : 'bg-slate-50 border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100'
              }`}
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
                  darkMode ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-100 text-slate-700'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={createPlaylist}
                className={`px-4 py-2 rounded-xl text-sm font-semibold text-white transition ${
                  darkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700'
                }`}
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PLAYER FOOTER */}
      {currentTrack && (
        <footer className={`fixed bottom-[62px] md:bottom-0 left-0 right-0 z-30 border-t backdrop-blur-md ${theme.playerBar}`}>
          <audio
            ref={audioRef}
            onTimeUpdate={handleTimeUpdate}
            onEnded={handleNext}
            onLoadedMetadata={handleTimeUpdate}
            onError={(e) => {
              const el = e.currentTarget;
              console.error('[Audio] error code:', el.error?.code, 'message:', el.error?.message, 'src:', el.src);
            }}
          />

          <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2.5 flex items-center gap-3 sm:gap-4">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 w-32 sm:w-56 shrink-0">
              <img
                src={getCoverUrl(currentTrack)}
                alt={currentTrack.title}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = GENERIC_COVERS[0];
                }}
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl object-cover bg-slate-800 shadow shrink-0"
              />
              <div className="min-w-0 hidden sm:block">
                <p className="text-xs sm:text-sm font-semibold truncate">{currentTrack.title}</p>
                <p className={`text-[10px] sm:text-xs truncate ${theme.textMuted}`}>{currentTrack.artist}</p>
              </div>
            </div>

            <div className="flex-1 flex flex-col items-center gap-1 min-w-0">
              <div className="flex items-center gap-2 sm:gap-4">
                <button
                  onClick={() => setIsShuffle(!isShuffle)}
                  className={`hidden sm:block transition ${
                    isShuffle ? theme.accentText : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Shuffle className="w-4 h-4" />
                </button>
                <button
                  onClick={handlePrev}
                  className={`${darkMode ? 'text-slate-300 hover:text-white' : 'text-slate-600 hover:text-indigo-600'} transition`}
                >
                  <SkipBack className="w-5 h-5" />
                </button>
                <button
                  onClick={togglePlay}
                  className={`w-10 h-10 rounded-full flex items-center justify-center hover:scale-105 transition shadow-lg ${
                    darkMode ? 'bg-white text-slate-900' : 'bg-gradient-to-br from-indigo-600 to-purple-600 text-white shadow-indigo-500/30'
                  }`}
                >
                  {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
                </button>
                <button
                  onClick={handleNext}
                  className={`${darkMode ? 'text-slate-300 hover:text-white' : 'text-slate-600 hover:text-indigo-600'} transition`}
                >
                  <SkipForward className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setIsRepeat(!isRepeat)}
                  className={`hidden sm:block transition ${
                    isRepeat ? theme.accentText : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Repeat className="w-4 h-4" />
                </button>
              </div>

              <div className="hidden sm:flex items-center gap-2 w-full max-w-md">
                <span className={`text-[10px] w-8 text-right ${theme.textMuted}`}>
                  {formatTime(currentTime)}
                </span>
                <input
                  type="range"
                  min={0}
                  max={duration || 0}
                  value={currentTime}
                  onChange={handleSeek}
                  className="flex-1 h-1 bg-slate-300 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
                <span className={`text-[10px] w-8 ${theme.textMuted}`}>
                  {formatTime(duration)}
                </span>
              </div>
            </div>

            <div className="hidden md:flex items-center gap-2 w-40 justify-end">
              <button
                onClick={() => setIsMuted(!isMuted)}
                className={`${theme.textMuted} hover:opacity-100 transition`}
              >
                {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={isMuted ? 0 : volume}
                onChange={(e) => {
                  setVolume(parseFloat(e.target.value));
                  if (isMuted) setIsMuted(false);
                }}
                className="w-20 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}
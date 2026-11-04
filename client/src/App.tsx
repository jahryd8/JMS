import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Menu, Music, Search, Sun, Moon, WifiOff, X,
  Disc, Heart, HardDriveDownload,
} from 'lucide-react';

import LoginScreen from './components/LoginScreen';
import SidebarNav from './components/SidebarNav';
import DiscoverGrid from './components/DiscoverGrid';
import TrackList from './components/TrackList';
import MiniPlayer from './components/MiniPlayer';
import MobileFullPlayer from './components/MobileFullPlayer';

import { useAudioPlayer } from './hooks/useAudioPlayer';
import { useDownloads } from './hooks/useDownloads';
import { useMediaSession } from './hooks/useMediaSession';

import {
  API_BASE, GENERIC_COVERS, ITEMS_PER_BATCH,
  THEME_KEY, LAST_PLAYED_KEY, RESUME_PLAYBACK_KEY, LAST_PLAYED_VERSION,
} from './constants';
import { getCoverUrl as buildCoverUrl } from './lib/urls';
import type { Song, Playlist } from './types';

const DEFAULT_PLAYLISTS: Playlist[] = [
  { id: 'pl-fav', name: 'Favourites', songIds: [], isSystem: true },
  { id: 'pl-vibe', name: 'Chill Vibes', songIds: [] }
];

export default function App() {
  // Auth
  const [authToken, setAuthToken] = useState<string | null>(() => localStorage.getItem('jms_token'));
  const [user, setUser] = useState<{ username: string; role: string } | null>(() => {
    const saved = localStorage.getItem('jms_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [showWakingMessage, setShowWakingMessage] = useState(false);

  // UI
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === 'light') return false;
    if (saved === 'dark') return true;
    return true;
  });
  const [resumePlayback, setResumePlayback] = useState<boolean>(
    () => localStorage.getItem(RESUME_PLAYBACK_KEY) === 'true'
  );
  const [activeTab, setActiveTab] = useState('Discover');
  const [activePlaylistId, setActivePlaylistId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobilePlayerOpen, setIsMobilePlayerOpen] = useState(false);
  const [isMobilePlayerMenuOpen, setIsMobilePlayerMenuOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_BATCH);
  const [reorderMode, setReorderMode] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isLoading, setIsLoading] = useState(false);

  // Playlists
  const [playlists, setPlaylists] = useState<Playlist[]>(() => {
    const saved = localStorage.getItem('jms_playlists');
    return saved ? JSON.parse(saved) : DEFAULT_PLAYLISTS;
  });
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [openDropdownSongId, setOpenDropdownSongId] = useState<string | null>(null);
  const [hasRestoredLastTrack, setHasRestoredLastTrack] = useState(false);

  // Hooks
  const downloads = useDownloads(authToken);
  const player = useAudioPlayer({
    authToken,
    isOnline,
    getCachedBlob: downloads.getCachedBlob,
    isDownloaded: downloads.isDownloaded,
  });

  // Theme
  const theme = darkMode
    ? {
        bg: 'bg-slate-950',
        surface: 'bg-slate-900',
        border: 'border-slate-800',
        text: 'text-white',
        textMuted: 'text-slate-400',
        header: 'bg-slate-950/80 border-slate-800',
        playerBar: 'bg-slate-950/95 border-slate-800',
        heroGrad: 'from-blue-600/20 via-purple-600/10 to-transparent',
        heroBorder: 'border-blue-500/20',
        accentText: 'text-blue-400',
        hover: 'hover:bg-slate-800/60',
      }
    : {
        bg: 'bg-gradient-to-br from-amber-50 via-rose-50 to-indigo-50',
        surface: 'bg-white',
        border: 'border-slate-200',
        text: 'text-slate-900',
        textMuted: 'text-slate-500',
        header: 'bg-white/80 border-slate-200',
        playerBar: 'bg-white/95 border-slate-200',
        heroGrad: 'from-indigo-500 via-purple-500 to-pink-500',
        heroBorder: 'border-transparent',
        accentText: 'text-indigo-600',
        hover: 'hover:bg-indigo-50',
      };

  // Persistence
  useEffect(() => {
    localStorage.setItem(THEME_KEY, darkMode ? 'dark' : 'light');
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', darkMode ? '#0f172a' : '#fafaf9');
  }, [darkMode]);

  useEffect(() => {
    localStorage.setItem(RESUME_PLAYBACK_KEY, resumePlayback ? 'true' : 'false');
  }, [resumePlayback]);

  useEffect(() => {
    localStorage.setItem('jms_playlists', JSON.stringify(playlists));
  }, [playlists]);

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

  useEffect(() => {
    setVisibleCount(ITEMS_PER_BATCH);
    setReorderMode(false);
  }, [activeTab, activePlaylistId, searchQuery]);

  useEffect(() => {
    if (!openDropdownSongId) return;
    const close = () => setOpenDropdownSongId(null);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [openDropdownSongId]);

  // Auth
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsLoggingIn(true);
    setShowWakingMessage(false);
    const wakingTimer = window.setTimeout(() => setShowWakingMessage(true), 3000);

    const attemptLogin = async (): Promise<{ ok: boolean; data?: any; networkError?: boolean }> => {
      try {
        const res = await fetch(`${API_BASE}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: loginUsername, password: loginPassword }),
        });
        const data = await res.json().catch(() => ({}));
        return { ok: res.ok, data };
      } catch {
        return { ok: false, networkError: true };
      }
    };

    try {
      let result = await attemptLogin();
      if (result.networkError) {
        await new Promise(r => setTimeout(r, 5000));
        result = await attemptLogin();
      }
      if (result.ok && result.data) {
        setAuthToken(result.data.token);
        setUser(result.data.user);
        localStorage.setItem('jms_token', result.data.token);
        localStorage.setItem('jms_user', JSON.stringify(result.data.user));
      } else if (result.networkError) {
        setLoginError('Server is taking too long to respond. Please try again in a moment.');
      } else {
        setLoginError(result.data?.error || 'Login failed.');
      }
    } finally {
      window.clearTimeout(wakingTimer);
      setIsLoggingIn(false);
      setShowWakingMessage(false);
    }
  };

  const handleLogout = () => {
    if (player.audioRef.current) player.audioRef.current.pause();
    player.setIsPlaying(false);
    setAuthToken(null);
    setUser(null);
    player.setAllSongs([]);
    player.setPlaybackQueue([]);
    localStorage.removeItem('jms_token');
    localStorage.removeItem('jms_user');
  };

  // Library
    const fetchLibrary = async () => {
    if (!authToken) return;
    if (!navigator.onLine) {
      console.log('[Library] Offline — skipping fetch');
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const tryFetch = async (): Promise<Response | null> => {
      try {
        return await fetch(`${API_BASE}/api/library/songs?page=1&limit=1000`, {
          headers: { Authorization: `Bearer ${authToken}` },
        });
      } catch { return null; }
    };
    try {
      let response = await tryFetch();
      if (!response) {
        await new Promise(r => setTimeout(r, 5000));
        response = await tryFetch();
      }
      if (!response) return;
      if (response.ok) {
        const data = await response.json();
        const incomingSongs: Song[] = data.songs || [];
        player.setAllSongs(incomingSongs);
        if (!hasRestoredLastTrack) player.setPlaybackQueue(incomingSongs);
      } else if (response.status === 401 || response.status === 403) {
        handleLogout();
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (authToken) fetchLibrary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authToken]);

  // Restore last-played
  useEffect(() => {
    if (hasRestoredLastTrack) return;
    if (player.allSongs.length === 0) return;
    const raw = localStorage.getItem(LAST_PLAYED_KEY);
    if (!raw) { setHasRestoredLastTrack(true); return; }
    try {
      const snap = JSON.parse(raw) as { v?: number; trackId: string; time: number; queue: string[]; index: number };
      if (snap.v !== LAST_PLAYED_VERSION) {
        localStorage.removeItem(LAST_PLAYED_KEY);
        setHasRestoredLastTrack(true);
        return;
      }
      const track = player.allSongs.find(s => s.id === snap.trackId);
      if (!track) { setHasRestoredLastTrack(true); return; }
      const rebuiltQueue = (snap.queue || [])
        .map(id => player.allSongs.find(s => s.id === id))
        .filter((s): s is Song => !!s);
      const finalQueue = rebuiltQueue.length > 0 ? rebuiltQueue : [track];
      const finalIndex = Math.max(0, finalQueue.findIndex(s => s.id === track.id));
      player.setPlaybackQueue(finalQueue);
      player.setCurrentTrackIndex(finalIndex);
      const shouldResume = localStorage.getItem(RESUME_PLAYBACK_KEY) === 'true';
      if (shouldResume) {
        player.setCurrentTime(snap.time || 0);
        player.setPendingSeekTime(snap.time || 0);
      } else {
        player.setCurrentTime(0);
        player.setPendingSeekTime(0);
      }
    } catch { /* ignore */ }
    setHasRestoredLastTrack(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player.allSongs.length, hasRestoredLastTrack]);

  // Resume toggle reaction
  useEffect(() => {
    if (!hasRestoredLastTrack) return;
    if (!resumePlayback) {
      player.setCurrentTime(0);
      player.setPendingSeekTime(0);
      if (player.audioRef.current) {
        try { player.audioRef.current.currentTime = 0; } catch { /* ignore */ }
      }
    } else {
      try {
        const raw = localStorage.getItem(LAST_PLAYED_KEY);
        if (!raw) return;
        const snap = JSON.parse(raw) as { trackId: string; time: number };
        if (!snap.trackId || !player.currentTrack) return;
        if (player.currentTrack.id === snap.trackId && snap.time > 0) {
          player.setPendingSeekTime(snap.time);
          player.setCurrentTime(snap.time);
          if (player.audioRef.current && player.audioRef.current.readyState >= 1) {
            try { player.audioRef.current.currentTime = snap.time; } catch { /* ignore */ }
          }
        }
      } catch { /* ignore */ }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resumePlayback]);

  // Persist last-played (immediate)
  useEffect(() => {
    if (!player.currentTrack) return;
    try {
      localStorage.setItem(LAST_PLAYED_KEY, JSON.stringify({
        v: LAST_PLAYED_VERSION,
        trackId: player.currentTrack.id,
        time: 0,
        queue: player.playbackQueue.map(s => s.id),
        index: player.currentTrackIndex,
        savedAt: Date.now(),
      }));
    } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player.currentTrack?.id, player.currentTrackIndex]);

  // Persist last-played (debounced)
  useEffect(() => {
    if (!player.currentTrack) return;
    const handler = window.setTimeout(() => {
      try {
        localStorage.setItem(LAST_PLAYED_KEY, JSON.stringify({
          v: LAST_PLAYED_VERSION,
          trackId: player.currentTrack!.id,
          time: player.currentTime,
          queue: player.playbackQueue.map(s => s.id),
          index: player.currentTrackIndex,
          savedAt: Date.now(),
        }));
      } catch { /* ignore */ }
    }, 5000);
    return () => window.clearTimeout(handler);
  }, [player.currentTrack?.id, player.currentTrackIndex, player.playbackQueue, player.currentTime]);

  // Playlists
  const createPlaylist = () => {
    if (!newPlaylistName.trim()) return;
    const newPl: Playlist = { id: `pl-${Date.now()}`, name: newPlaylistName.trim(), songIds: [] };
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
        return { ...pl, songIds: exists ? pl.songIds.filter(id => id !== songId) : [...pl.songIds, songId] };
      }
      return pl;
    }));
  };

  const removeFromActivePlaylist = (songId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!activePlaylistId) return;
    setPlaylists(prev => prev.map(pl =>
      pl.id !== activePlaylistId ? pl : { ...pl, songIds: pl.songIds.filter(id => id !== songId) }
    ));
    setOpenDropdownSongId(null);
  };

  const moveTrackInPlaylist = (playlistId: string, songId: string, direction: 'up' | 'down', e: React.MouseEvent) => {
    e.stopPropagation();
    setPlaylists(prev => prev.map(pl => {
      if (pl.id !== playlistId) return pl;
      const idx = pl.songIds.indexOf(songId);
      if (idx === -1) return pl;
      const target = direction === 'up' ? idx - 1 : idx + 1;
      if (target < 0 || target >= pl.songIds.length) return pl;
      const updated = [...pl.songIds];
      const [moved] = updated.splice(idx, 1);
      updated.splice(target, 0, moved);
      return { ...pl, songIds: updated };
    }));
  };

  const favPlaylist = playlists.find(p => p.id === 'pl-fav');
  const favoriteIds = useMemo(
    () => new Set(favPlaylist?.songIds || []),
    [favPlaylist]
  );

  const toggleFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!favPlaylist) return;
    toggleSongInPlaylist('pl-fav', id, e);
  };

  const activePlaylist = playlists.find(p => p.id === activePlaylistId);

  const playRandomFromLibrary = (_categoryName: string) => {
    if (player.allSongs.length === 0) return;
    const randomIdx = Math.floor(Math.random() * player.allSongs.length);
    const track = player.allSongs[randomIdx];
    const shuffled = [...player.allSongs].sort(() => Math.random() - 0.5);
    player.handlePlayTrack(track, shuffled);
  };

    const getDisplayedSongs = (): Song[] => {
    let baseList = player.allSongs;
    if (activeTab === 'Downloads') {
      baseList = downloads.downloadMeta.map(d => d.song);
    } else if (activeTab === 'Favourites') {
      const favIds = favPlaylist?.songIds || [];
      baseList = player.allSongs.filter(s => favIds.includes(s.id));
    } else if (activeTab === 'PlaylistView' && activePlaylist) {
      baseList = activePlaylist.songIds
        .map(id => player.allSongs.find(s => s.id === id))
        .filter((s): s is Song => !!s);
    }
    const q = searchQuery.toLowerCase();
    if (!q) return baseList;
    return baseList.filter(s =>
      s.title.toLowerCase().includes(q) || s.artist.toLowerCase().includes(q)
    );
  };

  const fullFilteredSongs = getDisplayedSongs();
  const visibleSongs = fullFilteredSongs.slice(0, visibleCount);
  const getPlaylistRealCount = (pl: Playlist) =>
    pl.songIds.filter(id => player.allSongs.some(s => s.id === id)).length;

  const progressPct = player.duration > 0 ? (player.currentTime / player.duration) * 100 : 0;

  const canReorder: boolean =
    (activeTab === 'Downloads' && !searchQuery) ||
    (activeTab === 'PlaylistView' && !!activePlaylistId && activePlaylistId !== 'pl-fav' && !searchQuery);
    
  const downloadMetaIds = useMemo(
    () => new Set(downloads.downloadMeta.map(d => d.id)),
    [downloads.downloadMeta]
  );

  const getCover = useCallback(
    (song?: Song) => buildCoverUrl(song, authToken, GENERIC_COVERS),
    [authToken]
  );

  const handleCoverError = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    (e.target as HTMLImageElement).src = GENERIC_COVERS[0];
  }, []);

  // Media Session
  useMediaSession({
    currentTrack: player.currentTrack,
    isPlaying: player.isPlaying,
    currentTime: player.currentTime,
    duration: player.duration,
    coverUrl: player.currentTrack ? getCover(player.currentTrack) : GENERIC_COVERS[0],
    onPlay: () => {
      if (player.audioRef.current && !player.isPlaying) {
        player.audioRef.current.play()
          .then(() => player.setIsPlaying(true))
          .catch(err => console.error(err));
      }
    },
    onPause: () => {
      if (player.audioRef.current && player.isPlaying) {
        player.audioRef.current.pause();
        player.setIsPlaying(false);
      }
    },
    onNext: player.handleNext,
    onPrev: player.handlePrev,
    onSeek: (time) => {
      if (player.audioRef.current) player.audioRef.current.currentTime = time;
      player.setCurrentTime(time);
    },
    onStop: () => {
      if (player.audioRef.current) {
        player.audioRef.current.pause();
        player.audioRef.current.currentTime = 0;
      }
      player.setIsPlaying(false);
      player.setCurrentTime(0);
    },
  });

  if (!authToken || !user) {
    return (
      <LoginScreen
        darkMode={darkMode}
        loginUsername={loginUsername}
        setLoginUsername={setLoginUsername}
        loginPassword={loginPassword}
        setLoginPassword={setLoginPassword}
        loginError={loginError}
        isLoggingIn={isLoggingIn}
        showWakingMessage={showWakingMessage}
        handleLogin={handleLogin}
      />
    );
  }

  const showDiscover = activeTab === 'Discover' && !activePlaylistId;

  return (
    <div className={`min-h-screen transition-colors duration-300 ${theme.bg} ${theme.text}`}>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>

      <audio
        ref={player.audioRef}
        preload="auto"
        playsInline
        onTimeUpdate={player.handleTimeUpdate}
        onEnded={player.handleNext}
        onLoadedMetadata={player.handleTimeUpdate}
        onPlay={() => player.setIsPlaying(true)}
        onPause={() => {
          if (player.audioRef.current?.paused) player.setIsPlaying(false);
        }}
        onError={(e) => {
          const el = e.currentTarget;
          console.error('[Audio] error code:', el.error?.code, 'message:', el.error?.message);
        }}
      />

      <header
        className={`sticky top-0 z-30 px-3 sm:px-4 pb-3 border-b backdrop-blur-md ${theme.header}`}
        style={{ paddingTop: 'calc(0.75rem + env(safe-area-inset-top))' }}
      >
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
                <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-500 font-semibold">
                  <WifiOff className="w-3 h-3" /> Offline
                </span>
              )}
            </div>
          </div>

          {!showDiscover && (
            <div className="relative flex-1 max-w-md hidden sm:block">
              <Search className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 ${theme.textMuted}`} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search songs, artists..."
                className={`w-full pl-9 pr-4 py-1.5 rounded-full text-xs sm:text-sm outline-none transition-all ${
                  darkMode ? 'bg-slate-800/80 text-white border border-slate-700 focus:border-blue-500'
                            : 'bg-white text-slate-800 border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100'
                }`}
              />
            </div>
          )}
          {showDiscover && <div className="flex-1 max-w-md hidden sm:block" />}

          <div className="flex items-center gap-2">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`p-2 rounded-full transition-colors ${darkMode ? 'hover:bg-slate-800 text-amber-400' : 'hover:bg-amber-100 text-amber-600'}`}
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white ${darkMode ? 'bg-blue-600' : 'bg-gradient-to-br from-indigo-500 to-purple-600'}`}>
              {user.username.charAt(0).toUpperCase()}
            </div>
          </div>
        </div>
      </header>

      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40 animate-[fadeIn_0.2s_ease-out]">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />
          <div
            className={`absolute left-0 top-0 bottom-0 w-72 px-5 pb-5 overflow-y-auto transition-transform ${darkMode ? 'bg-slate-900' : 'bg-white'}`}
            style={{ paddingTop: 'calc(1.25rem + env(safe-area-inset-top))' }}
          >
            <div className="flex items-center justify-between mb-6">
              <span className="font-bold text-lg">Menu</span>
              <button onClick={() => setIsMobileMenuOpen(false)} className="p-1 rounded-md">
                <X className="w-5 h-5" />
              </button>
            </div>
            <SidebarNav
              darkMode={darkMode}
              theme={theme}
              activeTab={activeTab}
              activePlaylistId={activePlaylistId}
              playlists={playlists}
              downloadsCount={downloads.downloadMeta.length}
              resumePlayback={resumePlayback}
              onSelectTab={(tab) => { setActiveTab(tab); setActivePlaylistId(null); setIsMobileMenuOpen(false); }}
              onSelectPlaylist={(id) => { setActivePlaylistId(id); setActiveTab('PlaylistView'); setIsMobileMenuOpen(false); }}
              onCreatePlaylist={() => { setIsCreateModalOpen(true); setIsMobileMenuOpen(false); }}
              onDeletePlaylist={deletePlaylist}
              onToggleResume={() => setResumePlayback(v => !v)}
              onLogout={handleLogout}
              getPlaylistRealCount={getPlaylistRealCount}
            />
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto flex gap-6 px-3 sm:px-4 py-4 sm:py-6">
        <aside className={`hidden md:block w-64 shrink-0 p-4 rounded-2xl border h-fit sticky top-24 ${theme.surface} ${theme.border}`}>
          <SidebarNav
            darkMode={darkMode}
            theme={theme}
            activeTab={activeTab}
            activePlaylistId={activePlaylistId}
            playlists={playlists}
                        downloadsCount={downloads.downloadMeta.length}
            resumePlayback={resumePlayback}
            onSelectTab={(tab) => { setActiveTab(tab); setActivePlaylistId(null); }}
            onSelectPlaylist={(id) => { setActivePlaylistId(id); setActiveTab('PlaylistView'); }}
            onCreatePlaylist={() => setIsCreateModalOpen(true)}
            onDeletePlaylist={deletePlaylist}
            onToggleResume={() => setResumePlayback(v => !v)}
            onLogout={handleLogout}
            getPlaylistRealCount={getPlaylistRealCount}
          />
        </aside>

        <main className="flex-1 min-w-0 pb-44 md:pb-28">
          {!showDiscover && (
            <div className="sm:hidden mb-4 relative">
              <Search className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 ${theme.textMuted}`} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search songs, artists..."
                className={`w-full pl-9 pr-4 py-2 rounded-full text-sm outline-none ${
                  darkMode ? 'bg-slate-800/80 text-white border border-slate-700 focus:border-blue-500'
                            : 'bg-white text-slate-800 border border-slate-300 focus:border-indigo-500'
                }`}
              />
            </div>
          )}

          {showDiscover ? (
            <DiscoverGrid darkMode={darkMode} theme={theme} onPlayRandom={playRandomFromLibrary} />
          ) : (
            <TrackList
              darkMode={darkMode}
              theme={theme}
              activePlaylist={activePlaylist}
              activeTab={activeTab}
              activePlaylistId={activePlaylistId}
              fullFilteredSongs={fullFilteredSongs}
              visibleSongs={visibleSongs}
              visibleCount={visibleCount}
              isLoading={isLoading}
              reorderMode={reorderMode}
              canReorder={canReorder}
              currentTrackId={player.currentTrack?.id ?? null}
              isPlaying={player.isPlaying}
              progressPct={progressPct}
              downloadMetaIds={downloadMetaIds}
              downloadProgress={downloads.downloadProgress}
              playlists={playlists}
              favoriteIds={favoriteIds}
              openDropdownSongId={openDropdownSongId}
              downloadsCount={downloads.downloadMeta.length}
              getCoverUrl={getCover}
              getPlaylistRealCount={getPlaylistRealCount}
              onPlay={player.handlePlayTrack}
              onOpenDropdown={(songId, e) => { e.stopPropagation(); setOpenDropdownSongId(songId); }}
              onToggleFavorite={toggleFavorite}
              onDownload={downloads.downloadTrack}
              onRemoveDownload={downloads.removeDownloaded}
              onRemoveFromPlaylist={removeFromActivePlaylist}
              onToggleSongInPlaylist={toggleSongInPlaylist}
              onMoveTrack={moveTrackInPlaylist}
              onMoveDownload={downloads.moveDownload}
              onLoadMore={() => setVisibleCount(prev => prev + ITEMS_PER_BATCH)}
              onToggleReorder={() => setReorderMode(v => !v)}
              onCoverError={handleCoverError}
            />
          )}
        </main>
      </div>

      <nav
        className={`md:hidden fixed bottom-0 left-0 right-0 z-20 border-t backdrop-blur-md ${theme.playerBar}`}
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex items-center justify-around py-2">
          <button
            onClick={() => { setActiveTab('Discover'); setActivePlaylistId(null); }}
            className={`flex flex-col items-center gap-1 text-[10px] font-medium px-3 py-1 transition-colors ${
              activeTab === 'Discover' ? theme.accentText : 'text-slate-400'
            }`}
          >
            <Disc className="w-5 h-5" />Discover
          </button>
          <button
            onClick={() => { setActiveTab('My Music'); setActivePlaylistId(null); }}
            className={`flex flex-col items-center gap-1 text-[10px] font-medium px-3 py-1 transition-colors ${
              activeTab === 'My Music' ? theme.accentText : 'text-slate-400'
            }`}
          >
            <Music className="w-5 h-5" />Library
          </button>
          <button
            onClick={() => { setActiveTab('Favourites'); setActivePlaylistId(null); }}
            className={`flex flex-col items-center gap-1 text-[10px] font-medium px-3 py-1 transition-colors ${
              activeTab === 'Favourites' ? theme.accentText : 'text-slate-400'
            }`}
          >
            <Heart className="w-5 h-5" />Favourites
          </button>
          <button
            onClick={() => { setActiveTab('Downloads'); setActivePlaylistId(null); }}
            className={`flex flex-col items-center gap-1 text-[10px] font-medium px-3 py-1 relative transition-colors ${
              activeTab === 'Downloads' ? theme.accentText : 'text-slate-400'
            }`}
          >
            <HardDriveDownload className="w-5 h-5" />Downloads
            {downloads.downloadMeta.length > 0 && (
              <span className="absolute top-0 right-1 w-4 h-4 rounded-full bg-indigo-500 text-white text-[9px] flex items-center justify-center font-bold">
                {downloads.downloadMeta.length}
              </span>
            )}
          </button>
        </div>
      </nav>

      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-[fadeIn_0.2s_ease-out]">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsCreateModalOpen(false)} />
          <div className={`relative w-full max-w-sm p-6 rounded-2xl shadow-2xl border ${theme.surface} ${theme.border}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">Create Playlist</h3>
              <button onClick={() => setIsCreateModalOpen(false)} className={`p-1 rounded-md ${theme.textMuted} hover:text-rose-500`}>
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
                darkMode ? 'bg-slate-800 border-slate-700 text-white focus:border-blue-500'
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
                  darkMode ? 'bg-blue-600 hover:bg-blue-700'
                            : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700'
                }`}
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {player.currentTrack && (
        <MiniPlayer
          darkMode={darkMode}
          theme={theme}
          currentTrack={player.currentTrack}
          isPlaying={player.isPlaying}
          currentTime={player.currentTime}
          duration={player.duration}
          volume={player.volume}
          isMuted={player.isMuted}
          isShuffle={player.isShuffle}
          isRepeat={player.isRepeat}
          coverUrl={getCover(player.currentTrack)}
          onTogglePlay={player.togglePlay}
          onPrev={player.handlePrev}
          onNext={player.handleNext}
          onToggleShuffle={() => player.setIsShuffle(!player.isShuffle)}
          onToggleRepeat={() => player.setIsRepeat(!player.isRepeat)}
          onToggleMute={() => player.setIsMuted(!player.isMuted)}
          onVolumeChange={(v) => {
            player.setVolume(v);
            if (player.isMuted) player.setIsMuted(false);
          }}
          onSeek={player.handleSeek}
          onOpenMobile={() => setIsMobilePlayerOpen(true)}
          onCoverError={handleCoverError}
        />
      )}

      {player.currentTrack && (
        <MobileFullPlayer
          darkMode={darkMode}
          theme={theme}
          currentTrack={player.currentTrack}
          isPlaying={player.isPlaying}
          currentTime={player.currentTime}
          duration={player.duration}
          isShuffle={player.isShuffle}
          isRepeat={player.isRepeat}
          isCurrentFav={favoriteIds.has(player.currentTrack.id)}
          isCurrentDownloaded={downloads.isDownloaded(player.currentTrack.id)}
          downloadProg={downloads.downloadProgress[player.currentTrack.id]}
          coverUrl={getCover(player.currentTrack)}
          playbackQueue={player.playbackQueue}
          currentTrackIndex={player.currentTrackIndex}
          isOpen={isMobilePlayerOpen}
          isMenuOpen={isMobilePlayerMenuOpen}
          playlists={playlists}
          getCoverUrl={getCover}
          onClose={() => setIsMobilePlayerOpen(false)}
          onOpenMenu={() => setIsMobilePlayerMenuOpen(true)}
          onCloseMenu={() => setIsMobilePlayerMenuOpen(false)}
          onTogglePlay={player.togglePlay}
          onPrev={player.handlePrev}
          onNext={player.handleNext}
          onToggleShuffle={() => player.setIsShuffle(!player.isShuffle)}
          onToggleRepeat={() => player.setIsRepeat(!player.isRepeat)}
          onSeek={player.handleSeek}
          onToggleFavorite={(e) => toggleFavorite(player.currentTrack!.id, e)}
          onPlayTrack={player.handlePlayTrack}
          onOpenAddToPlaylist={() => {
            setIsMobilePlayerMenuOpen(false);
            setIsMobilePlayerOpen(false);
            setOpenDropdownSongId(player.currentTrack!.id);
          }}
          onDownload={(e) => downloads.downloadTrack(player.currentTrack!, e)}
          onCoverError={handleCoverError}
        />
      )}
    </div>
  );
}
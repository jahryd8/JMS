import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, Pause, SkipBack, SkipForward, Shuffle, Repeat, Volume2, VolumeX, 
  Search, Moon, Sun, Music, Heart, Disc, List, Settings, 
  LogOut, Radio, RefreshCw, Plus, Trash2, FolderPlus, X, ListPlus,
  Lock, User, KeyRound, DownloadCloud, ChevronRight, ChevronUp, ChevronDown
} from 'lucide-react';
import type { Song } from './types/song';

interface Playlist {
  id: string;
  name: string;
  songIds: string[];
  isSystem?: boolean;
}

const DEFAULT_PLAYLISTS: Playlist[] = [
  { id: 'pl-fav', name: 'Favourites', songIds: [], isSystem: true },
  { id: 'pl-vibe', name: 'Chill Vibes', songIds: [] }
];

export default function App() {
  // Auth State
  const [authToken, setAuthToken] = useState<string | null>(() => localStorage.getItem('jms_token'));
  const [user, setUser] = useState<{ username: string; role: string } | null>(() => {
    const saved = localStorage.getItem('jms_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [loginUsername, setLoginUsername] = useState<string>('');
  const [loginPassword, setLoginPassword] = useState<string>('');
  const [loginError, setLoginError] = useState<string>('');

  // UI State
  const [darkMode, setDarkMode] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<string>('Discover');
  const [activePlaylistId, setActivePlaylistId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Audio Library State
  const [allSongs, setAllSongs] = useState<Song[]>([]);
  const [playbackQueue, setPlaybackQueue] = useState<Song[]>([]);
  const [currentTrackIndex, setCurrentTrackIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [volume, setVolume] = useState<number>(0.8);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isShuffle, setIsShuffle] = useState<boolean>(false);
  const [isRepeat, setIsRepeat] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Pagination State
  const [page, setPage] = useState<number>(1);
  const [hasMore, setHasMore] = useState<boolean>(true);

  // Playlist State
  const [playlists, setPlaylists] = useState<Playlist[]>(() => {
    const saved = localStorage.getItem('jms_playlists');
    return saved ? JSON.parse(saved) : DEFAULT_PLAYLISTS;
  });
  const [newPlaylistName, setNewPlaylistName] = useState<string>('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [openDropdownSongId, setOpenDropdownSongId] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentTrack = playbackQueue[currentTrackIndex] || allSongs[0];

  // Auth Handler
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    try {
      const res = await fetch('http://localhost:5000/api/auth/login', {
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
    } catch (err) {
      setLoginError('Cannot connect to JMS backend server.');
    }
  };

  const handleLogout = () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
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

  // Fetch library
  const fetchLibrary = async (pageNum = 1, append = false) => {
    if (!authToken) return;
    setIsLoading(true);
    try {
      const response = await fetch(`http://localhost:5000/api/library/songs?page=${pageNum}&limit=10`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        const incomingSongs: Song[] = data.songs || [];
        
        if (append) {
          setAllSongs(prev => [...prev, ...incomingSongs]);
          setPlaybackQueue(prev => [...prev, ...incomingSongs]);
        } else {
          setAllSongs(incomingSongs);
          setPlaybackQueue(incomingSongs);
        }
        setHasMore(data.hasMore);
      } else if (response.status === 401 || response.status === 403) {
        handleLogout();
      }
    } catch (err) {
      console.error('Failed to load library:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (authToken) {
      fetchLibrary(1, false);
    }
  }, [authToken]);

  const loadMoreSongs = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchLibrary(nextPage, true);
  };

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  useEffect(() => {
    if (audioRef.current && currentTrack) {
      const authenticatedAudioUrl = currentTrack.audioUrl.includes('?') 
        ? `${currentTrack.audioUrl}&token=${authToken}`
        : `${currentTrack.audioUrl}?token=${authToken}`;
        
      audioRef.current.src = authenticatedAudioUrl;
      if (isPlaying) {
        audioRef.current.play().catch(e => console.error("Playback error:", e));
      }
    }
  }, [currentTrackIndex, currentTrack, authToken]);

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

  const handleNext = () => {
    if (isRepeat && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play();
      return;
    }
    if (isShuffle) {
      const nextRand = Math.floor(Math.random() * playbackQueue.length);
      setCurrentTrackIndex(nextRand);
    } else {
      setCurrentTrackIndex((prev) => (prev + 1) % playbackQueue.length);
    }
    setIsPlaying(true);
  };

  const handlePrev = () => {
    if (currentTime > 3 && audioRef.current) {
      audioRef.current.currentTime = 0;
    } else {
      setCurrentTrackIndex((prev) => (prev - 1 + playbackQueue.length) % playbackQueue.length);
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
    if (audioRef.current) {
      audioRef.current.currentTime = seekTime;
    }
  };

  const downloadTrack = async (song: Song, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const authenticatedUrl = `${song.audioUrl}?token=${authToken}`;
      const res = await fetch(authenticatedUrl);
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${song.artist} - ${song.title}.mp3`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error('Download failed:', err);
    }
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs === 0) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

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

  const moveTrackInPlaylist = (playlistId: string, songId: string, direction: 'up' | 'down', e: React.MouseEvent) => {
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

  const getDisplayedSongs = (): Song[] => {
    let baseList = allSongs;

    if (activeTab === 'Favourites') {
      const favIds = favPlaylist?.songIds || [];
      baseList = allSongs.filter(s => favIds.includes(s.id));
    } else if (activeTab === 'PlaylistView' && activePlaylist) {
      baseList = activePlaylist.songIds
        .map(id => allSongs.find(s => s.id === id))
        .filter((s): s is Song => s !== undefined);
    }

    return baseList.filter(s => 
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      s.artist.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  const displayedSongs = getDisplayedSongs();

  // Get real playable track count for playlists based on loaded library
  const getPlaylistRealCount = (pl: Playlist) => {
    return pl.songIds.filter(id => allSongs.some(s => s.id === id)).length;
  };

  // LOGIN GATE SCREEN
  if (!authToken || !user) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-6 ${
        darkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-900'
      }`}>
        <div className={`w-full max-w-md p-8 rounded-3xl border shadow-2xl backdrop-blur-md ${
          darkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="flex flex-col items-center mb-8">
            <div className="p-4 rounded-2xl bg-blue-600 text-white shadow-lg mb-3">
              <Radio className="w-8 h-8 animate-pulse" />
            </div>
            <h1 className="text-2xl font-black tracking-wider">JMS Server</h1>
            <p className="text-xs text-slate-400 mt-1">Authorized Private Server Access Only</p>
          </div>

          {loginError && (
            <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold text-center">
              {loginError}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-xs font-bold uppercase text-slate-400 mb-1 block">Username</label>
              <div className="relative">
                <User className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Username" 
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  className={`w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none border transition ${
                    darkMode ? 'bg-slate-800/80 border-slate-700 text-white focus:border-blue-500' : 'bg-slate-100 border-slate-300'
                  }`}
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold uppercase text-slate-400 mb-1 block">Password</label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                <input 
                  type="password" 
                  placeholder="••••••••" 
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className={`w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none border transition ${
                    darkMode ? 'bg-slate-800/80 border-slate-700 text-white focus:border-blue-500' : 'bg-slate-100 border-slate-300'
                  }`}
                />
              </div>
            </div>

            <button 
              type="submit" 
              className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm transition shadow-lg mt-6 flex items-center justify-center gap-2"
            >
              <Lock className="w-4 h-4" /> Sign In to JMS
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen font-sans flex flex-col transition-colors duration-300 ${
      darkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-900'
    }`}>
      <audio 
        ref={audioRef} 
        onTimeUpdate={handleTimeUpdate} 
        onEnded={handleNext}
      />

      {/* HEADER */}
      <header className={`h-16 px-6 flex items-center justify-between border-b sticky top-0 z-40 backdrop-blur-md ${
        darkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white/90 border-slate-200 text-slate-900 shadow-sm'
      }`}>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <span className="text-xl font-black tracking-wider">JMS</span>
        </div>

        <div className="relative w-1/3 max-w-md">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search songs or artists..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full pl-9 pr-4 py-1.5 rounded-full text-sm outline-none transition-all ${
              darkMode 
                ? 'bg-slate-800/80 text-white border border-slate-700 focus:border-blue-500' 
                : 'bg-slate-100 text-slate-800 border border-slate-300 focus:border-blue-500'
            }`}
          />
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => fetchLibrary(1, false)}
            title="Refresh Library"
            className={`p-2 rounded-full transition-colors ${darkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-200 text-slate-600'}`}
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          <button 
            onClick={() => setDarkMode(!darkMode)}
            className={`p-2 rounded-full transition-colors ${
              darkMode ? 'hover:bg-slate-800 text-amber-400' : 'hover:bg-slate-200 text-slate-700'
            }`}
          >
            {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>

          <div className="flex items-center gap-3 border-l pl-3 border-slate-700/40">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-blue-500/20 border border-blue-400/50 flex items-center justify-center text-blue-400 text-sm font-bold uppercase">
                {user.username.charAt(0)}
              </div>
              <span className="text-sm font-semibold hidden md:inline capitalize">{user.username}</span>
            </div>

            {/* HEADER LOGOUT BUTTON */}
            <button
              onClick={handleLogout}
              title="Log Out"
              className={`p-2 rounded-xl transition flex items-center gap-1 text-xs font-semibold ${
                darkMode ? 'text-rose-400 hover:bg-rose-500/10' : 'text-rose-600 hover:bg-rose-50'
              }`}
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden lg:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* SIDEBAR */}
        <aside className={`w-64 flex flex-col border-r shrink-0 ${
          darkMode ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="p-4 overflow-y-auto flex-1 space-y-6">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider mb-3 px-3 text-slate-400">MENU</h2>
              <nav className="space-y-1">
                {[
                  { name: 'Discover', icon: Disc },
                  { name: 'My Music', icon: Music },
                  { name: 'Favourites', icon: Heart },
                  { name: 'Downloads', icon: DownloadCloud },
                  { name: 'Settings', icon: Settings },
                ].map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.name && !activePlaylistId;
                  return (
                    <button
                      key={item.name}
                      onClick={() => {
                        setActiveTab(item.name);
                        setActivePlaylistId(null);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                        isActive 
                          ? 'bg-blue-600 text-white shadow-md'
                          : (darkMode ? 'text-slate-300 hover:bg-slate-800/60' : 'text-slate-700 hover:bg-slate-100')
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {item.name}
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* PLAYLISTS SECTION */}
            <div>
              <div className="flex items-center justify-between px-3 mb-3">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">PLAYLISTS</h2>
                <button 
                  onClick={() => setIsCreateModalOpen(true)}
                  className={`p-1 rounded-md transition ${darkMode ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-200 text-slate-700'}`}
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
                      }}
                      className={`group w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium cursor-pointer transition-all ${
                        isActive
                          ? 'bg-blue-600 text-white shadow-md'
                          : (darkMode ? 'text-slate-300 hover:bg-slate-800/60' : 'text-slate-700 hover:bg-slate-100')
                      }`}
                    >
                      <div className="flex items-center gap-3 truncate">
                        <List className="w-4 h-4 shrink-0" />
                        <span className="truncate">{pl.name}</span>
                      </div>
                      <div className="flex items-center gap-1.5 opacity-80 group-hover:opacity-100">
                        <span className="text-xs font-mono px-1.5 py-0.5 rounded-full bg-slate-800/40">
                          {count}
                        </span>
                        {!pl.isSystem && (
                          <button
                            onClick={(e) => deletePlaylist(pl.id, e)}
                            className="p-1 rounded hover:text-rose-400 transition"
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
          </div>

          {/* PINNED SIDEBAR FOOTER LOGOUT */}
          <div className={`p-4 border-t ${darkMode ? 'border-slate-800/80' : 'border-slate-200'}`}>
            <button 
              onClick={handleLogout}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition ${
                darkMode ? 'text-rose-400 hover:bg-rose-500/10' : 'text-rose-600 hover:bg-rose-50'
              }`}
            >
              <LogOut className="w-4 h-4" />
              Log Out
            </button>
          </div>
        </aside>

        {/* WORKSPACE AREA */}
        <main className="flex-1 overflow-y-auto p-6 md:p-10 pb-28">
          <div className="max-w-5xl mx-auto space-y-8">
            
            {/* HERO CARD */}
            <div className={`relative overflow-hidden rounded-2xl p-8 border shadow-xl backdrop-blur-sm ${
              darkMode 
                ? 'bg-gradient-to-r from-slate-900 via-slate-900/90 to-blue-950/50 border-slate-800' 
                : 'bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-900 text-white border-slate-800'
            }`}>
              <div className="relative z-10 max-w-2xl">
                <h1 className="text-3xl font-extrabold tracking-tight mb-2">
                  {activePlaylist ? activePlaylist.name : 'Jah\'s Music Station'}
                </h1>
                <p className="text-slate-300 text-sm">
                  {activePlaylist 
                    ? `Custom playlist with ${getPlaylistRealCount(activePlaylist)} tracks.`
                    : 'Welcome to my music station, hope you enjoy the tunes.'}
                </p>
              </div>
            </div>

            {/* TRACKS LIST */}
            <section className={`rounded-2xl p-6 border shadow-lg ${
              darkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-6 bg-blue-500 rounded-full" />
                  <h2 className="text-xl font-bold tracking-wide">
                    {activePlaylist ? activePlaylist.name : activeTab}
                  </h2>
                </div>
                <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${
                  darkMode ? 'bg-slate-800 text-slate-400 border-slate-700' : 'bg-slate-100 text-slate-600 border-slate-300'
                }`}>
                  {displayedSongs.length} tracks loaded
                </span>
              </div>

              {displayedSongs.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  <Music className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>No audio tracks found in this view.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {displayedSongs.map((song, idx) => {
                    const isCurrent = currentTrack?.id === song.id;
                    const isFav = isFavorite(song.id);
                    const isDropdownOpen = openDropdownSongId === song.id;

                    return (
                      <div
                        key={song.id}
                        onClick={() => handlePlayTrack(song, displayedSongs)}
                        className={`group relative flex items-center justify-between p-3.5 rounded-xl transition-all cursor-pointer border ${
                          isCurrent
                            ? (darkMode ? 'bg-blue-600/20 border-blue-500/40' : 'bg-blue-50 border-blue-300')
                            : (darkMode ? 'hover:bg-slate-800/60 border-transparent' : 'hover:bg-slate-50 border-transparent')
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <img 
                            src={song.coverPath || "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=400&q=80"} 
                            alt={song.title} 
                            className="w-12 h-12 rounded-lg object-cover bg-slate-800 shadow-sm shrink-0" 
                          />
                          <div>
                            <h3 className={`text-sm font-semibold transition-colors ${
                              isCurrent ? 'text-blue-400 font-bold' : (darkMode ? 'text-slate-100' : 'text-slate-800')
                            }`}>
                              "{song.title}"
                            </h3>
                            <p className="text-xs text-slate-400 mt-0.5">{song.artist} • {song.album}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="text-xs text-slate-400 font-mono hidden sm:inline mr-2">
                            {formatTime(song.duration)}
                          </span>

                          {activeTab === 'PlaylistView' && activePlaylistId && (
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                              <button
                                onClick={(e) => moveTrackInPlaylist(activePlaylistId, song.id, 'up', e)}
                                disabled={idx === 0}
                                className="p-1 rounded text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:text-slate-400"
                                title="Move Up"
                              >
                                <ChevronUp className="w-4 h-4" />
                              </button>
                              <button
                                onClick={(e) => moveTrackInPlaylist(activePlaylistId, song.id, 'down', e)}
                                disabled={idx === displayedSongs.length - 1}
                                className="p-1 rounded text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:text-slate-400"
                                title="Move Down"
                              >
                                <ChevronDown className="w-4 h-4" />
                              </button>
                              <button
                                onClick={(e) => toggleSongInPlaylist(activePlaylistId, song.id, e)}
                                className="p-1.5 rounded-full text-slate-400 hover:text-rose-400 transition"
                                title="Remove from Playlist"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          )}

                          <button
                            onClick={(e) => downloadTrack(song, e)}
                            className="p-1.5 rounded-full text-slate-400 hover:text-blue-400 transition opacity-0 group-hover:opacity-100"
                            title="Download track"
                          >
                            <DownloadCloud className="w-4 h-4" />
                          </button>

                          <button 
                            onClick={(e) => toggleFavorite(song.id, e)}
                            className={`p-1.5 rounded-full transition ${
                              isFav ? 'text-rose-500' : 'text-slate-400 opacity-0 group-hover:opacity-100 hover:text-slate-200'
                            }`}
                          >
                            <Heart className={`w-4 h-4 ${isFav ? 'fill-current' : ''}`} />
                          </button>

                          <div className="relative">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenDropdownSongId(isDropdownOpen ? null : song.id);
                              }}
                              className="p-1.5 rounded-full text-slate-400 hover:text-white transition opacity-0 group-hover:opacity-100"
                              title="Add to Playlist"
                            >
                              <ListPlus className="w-4 h-4" />
                            </button>

                            {isDropdownOpen && (
                              <div 
                                onClick={(e) => e.stopPropagation()}
                                className={`absolute right-0 mt-2 w-48 rounded-xl shadow-xl border z-50 p-2 ${
                                  darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
                                }`}
                              >
                                <div className="text-xs font-bold uppercase text-slate-400 px-2 py-1 mb-1 border-b border-slate-700/50">
                                  Add to Playlist
                                </div>
                                {playlists.map(pl => {
                                  const inPl = pl.songIds.includes(song.id);
                                  return (
                                    <button
                                      key={pl.id}
                                      onClick={(e) => toggleSongInPlaylist(pl.id, song.id, e)}
                                      className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-xs font-medium transition ${
                                        darkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-100'
                                      }`}
                                    >
                                      <span className="truncate">{pl.name}</span>
                                      {inPl && <span className="text-blue-400 font-bold">✓</span>}
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

              {/* PAGINATION BUTTON */}
              {hasMore && activeTab === 'Discover' && !activePlaylistId && (
                <div className="mt-6 text-center">
                  <button
                    onClick={loadMoreSongs}
                    disabled={isLoading}
                    className={`px-6 py-2.5 rounded-xl font-semibold text-xs transition shadow-md inline-flex items-center gap-2 ${
                      darkMode ? 'bg-slate-800 hover:bg-slate-700 text-slate-200' : 'bg-slate-200 hover:bg-slate-300 text-slate-800'
                    }`}
                  >
                    {isLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ChevronRight className="w-3.5 h-3.5" />}
                    Load More Tracks
                  </button>
                </div>
              )}
            </section>

          </div>
        </main>
      </div>

      {/* CREATE PLAYLIST MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className={`w-full max-w-md p-6 rounded-2xl border shadow-2xl ${
            darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <FolderPlus className="w-5 h-5 text-blue-400" /> Create Playlist
              </h3>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <input 
              type="text" 
              placeholder="Playlist name..."
              value={newPlaylistName}
              onChange={(e) => setNewPlaylistName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && createPlaylist()}
              className={`w-full px-4 py-2.5 rounded-xl text-sm outline-none mb-6 border ${
                darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-100 border-slate-300'
              }`}
            />

            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setIsCreateModalOpen(false)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
                  darkMode ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-200 text-slate-700'
                }`}
              >
                Cancel
              </button>
              <button 
                onClick={createPlaylist}
                className="px-4 py-2 rounded-xl text-sm font-semibold bg-blue-600 text-white hover:bg-blue-500 transition shadow-md"
              >
                Create Playlist
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PLAYER FOOTER */}
      {currentTrack && (
        <footer className={`fixed bottom-0 left-0 right-0 h-20 px-6 border-t z-50 flex items-center justify-between backdrop-blur-xl ${
          darkMode ? 'bg-slate-900/95 border-slate-800 text-white' : 'bg-white/95 border-slate-200 text-slate-900 shadow-lg'
        }`}>
          <div className="flex items-center gap-4 w-1/4 min-w-[200px]">
            <img 
              src={currentTrack.coverPath || "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=400&q=80"} 
              alt={currentTrack.title}
              className="w-12 h-12 rounded-xl object-cover bg-slate-800 shadow shrink-0" 
            />
            <div className="truncate">
              <h4 className="text-sm font-bold truncate">{currentTrack.title}</h4>
              <p className="text-xs text-slate-400 truncate">{currentTrack.artist}</p>
            </div>
          </div>

          <div className="flex flex-col items-center gap-1.5 w-2/4 max-w-xl">
            <div className="flex items-center gap-6">
              <button 
                onClick={() => setIsShuffle(!isShuffle)}
                className={`transition ${isShuffle ? 'text-blue-500 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
                title="Shuffle"
              >
                <Shuffle className="w-4 h-4" />
              </button>

              <button 
                onClick={handlePrev}
                className="text-slate-300 hover:text-white transition"
                title="Previous Track"
              >
                <SkipBack className="w-5 h-5" />
              </button>

              <button 
                onClick={togglePlay}
                className="p-3 rounded-full bg-blue-600 text-white hover:bg-blue-500 transition shadow-lg transform hover:scale-105"
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
              </button>

              <button 
                onClick={handleNext}
                className="text-slate-300 hover:text-white transition"
                title="Next Track"
              >
                <SkipForward className="w-5 h-5" />
              </button>

              <button 
                onClick={() => setIsRepeat(!isRepeat)}
                className={`transition ${isRepeat ? 'text-blue-500 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
                title="Repeat Track"
              >
                <Repeat className="w-4 h-4" />
              </button>
            </div>

            <div className="w-full flex items-center gap-3 text-xs text-slate-400 font-mono">
              <span>{formatTime(currentTime)}</span>
              <input 
                type="range" 
                min={0} 
                max={duration || 100} 
                value={currentTime} 
                onChange={handleSeek}
                className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 w-1/4 min-w-[150px]">
            <button 
              onClick={() => setIsMuted(!isMuted)}
              className="text-slate-400 hover:text-slate-200 transition"
            >
              {isMuted || volume === 0 ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
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
              className="w-20 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
          </div>
        </footer>
      )}
    </div>
  );
}
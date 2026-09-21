import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, Pause, SkipBack, SkipForward, Shuffle, Repeat, Volume2, VolumeX, 
  Search, Moon, Sun, Music, Heart, Disc, List, Download, Settings, 
  LogOut, Radio, ChevronDown, RefreshCw
} from 'lucide-react';

interface Song {
  id: string;
  title: string;
  artist: string;
  album?: string;
  duration: number;
  durationFormatted?: string;
  coverPath?: string;
  filePath?: string;
  audioUrl?: string;
}

const SEEDED_SONGS: Song[] = [
  {
    id: 's1',
    title: 'Thriller',
    artist: 'Michael Jackson',
    album: 'Thriller',
    duration: 357,
    durationFormatted: '5:57',
    coverPath: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=400&q=80',
    audioUrl: 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=funky-synthwave-111718.mp3'
  },
  {
    id: 's2',
    title: 'Bohemian Rhapsody',
    artist: 'Queen',
    album: 'A Night at the Opera',
    duration: 354,
    durationFormatted: '5:54',
    coverPath: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=400&q=80',
    audioUrl: 'https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0a13f69d2.mp3?filename=rock-classic-10022.mp3'
  },
  {
    id: 's3',
    title: 'Billie Jean',
    artist: 'Michael Jackson',
    album: 'Thriller',
    duration: 294,
    durationFormatted: '4:54',
    coverPath: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=400&q=80',
    audioUrl: 'https://cdn.pixabay.com/download/audio/2022/03/15/audio_c8c8a73229.mp3?filename=groove-groove-10821.mp3'
  },
  {
    id: 's4',
    title: 'Smells Like Teen Spirit',
    artist: 'Nirvana',
    album: 'Nevermind',
    duration: 301,
    durationFormatted: '5:01',
    coverPath: 'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?auto=format&fit=crop&w=400&q=80',
    audioUrl: 'https://cdn.pixabay.com/download/audio/2022/02/10/audio_b29c97b830.mp3?filename=energetic-rock-10332.mp3'
  }
];

export default function App() {
  const [darkMode, setDarkMode] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<string>('Discover');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Track & Playback state
  const [playlist, setPlaylist] = useState<Song[]>(SEEDED_SONGS);
  const [currentTrackIndex, setCurrentTrackIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [volume, setVolume] = useState<number>(0.8);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isShuffle, setIsShuffle] = useState<boolean>(false);
  const [isRepeat, setIsRepeat] = useState<boolean>(false);
  const [favorites, setFavorites] = useState<string[]>(['s1', 's3']);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const currentTrack = playlist[currentTrackIndex] || SEEDED_SONGS[0];

  // Fetch real songs from Express Backend on load
  const fetchLibrary = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:5000/api/library/songs');
      if (response.ok) {
        const data: Song[] = await response.json();
        if (data.length > 0) {
          setPlaylist(data);
        }
      }
    } catch (err) {
      console.warn('Backend server offline, defaulting to seeded tracks:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLibrary();
  }, []);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  // Audio track change handler (Direct stream link to backend or static URL)
  useEffect(() => {
    if (audioRef.current && currentTrack) {
      const streamUrl = currentTrack.audioUrl || `http://localhost:5000/api/stream/${currentTrack.id}`;
      audioRef.current.src = streamUrl;
      if (isPlaying) {
        audioRef.current.play().catch(e => console.error("Playback interrupted:", e));
      }
    }
  }, [currentTrackIndex, currentTrack]);

  const handlePlayTrack = (track: Song, targetList: Song[]) => {
    setPlaylist(targetList);
    const targetIdx = targetList.findIndex(s => s.id === track.id);
    setCurrentTrackIndex(targetIdx !== -1 ? targetIdx : 0);
    setIsPlaying(true);
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
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
      const nextRand = Math.floor(Math.random() * playlist.length);
      setCurrentTrackIndex(nextRand);
    } else {
      setCurrentTrackIndex((prev) => (prev + 1) % playlist.length);
    }
    setIsPlaying(true);
  };

  const handlePrev = () => {
    if (currentTime > 3 && audioRef.current) {
      audioRef.current.currentTime = 0;
    } else {
      setCurrentTrackIndex((prev) => (prev - 1 + playlist.length) % playlist.length);
    }
    setIsPlaying(true);
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
      setDuration(audioRef.current.duration || currentTrack.duration);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const seekTime = parseFloat(e.target.value);
    setCurrentTime(seekTime);
    if (audioRef.current) {
      audioRef.current.currentTime = seekTime;
    }
  };

  const toggleFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Filtered tracks
  const displayedSongs = playlist.filter(s => {
    const matchesSearch = s.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          s.artist.toLowerCase().includes(searchQuery.toLowerCase());
    if (activeTab === 'Favourites') {
      return matchesSearch && favorites.includes(s.id);
    }
    return matchesSearch;
  });

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
            placeholder="Search artists, songs..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full pl-9 pr-4 py-1.5 rounded-full text-sm outline-none transition-all ${
              darkMode 
                ? 'bg-slate-800/80 text-white border border-slate-700 focus:border-emerald-500' 
                : 'bg-slate-100 text-slate-800 border border-slate-300 focus:border-emerald-500'
            }`}
          />
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={fetchLibrary}
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

          <div className="flex items-center gap-2 border-l pl-4 border-slate-700/40">
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-400/50 flex items-center justify-center text-emerald-400 text-sm font-bold">
              J
            </div>
            <span className="text-sm font-semibold hidden md:inline">Jaheim</span>
            <ChevronDown className="w-4 h-4 opacity-70" />
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* SIDEBAR */}
        <aside className={`w-60 p-4 flex flex-col justify-between border-r shrink-0 ${
          darkMode ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider mb-4 px-3 text-slate-400">MENU</h2>
            
            <nav className="space-y-1">
              {[
                { name: 'Discover', icon: Disc },
                { name: 'My Music', icon: Music },
                { name: 'Favourites', icon: Heart },
                { name: 'Playlist', icon: List },
                { name: 'Downloads', icon: Download },
                { name: 'Settings', icon: Settings },
              ].map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.name;
                return (
                  <button
                    key={item.name}
                    onClick={() => setActiveTab(item.name)}
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

          <button className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
            darkMode ? 'text-rose-400 hover:bg-rose-500/10' : 'text-rose-600 hover:bg-rose-50'
          }`}>
            <LogOut className="w-4 h-4" />
            Log Out
          </button>
        </aside>

        {/* WORKSPACE AREA (CENTERED FOR WIDESCREEN) */}
        <main className="flex-1 overflow-y-auto p-6 md:p-10 pb-28">
          <div className="max-w-5xl mx-auto space-y-8">
            
            {/* HERO / WELCOME CARD */}
            <div className={`relative overflow-hidden rounded-2xl p-8 md:p-10 border shadow-xl backdrop-blur-sm ${
              darkMode 
                ? 'bg-gradient-to-r from-slate-900 via-slate-900/90 to-blue-950/50 border-slate-800' 
                : 'bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-900 text-white border-slate-800'
            }`}>
              <div className="relative z-10 max-w-2xl">
                <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-3">
                  Welcome to <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">Jah's Music Station</span>
                </h1>
                <p className="text-slate-300 text-sm md:text-base leading-relaxed">
                  Stream your custom ID3-tagged music library across your Linux desktop and mobile devices.
                </p>
              </div>

              {/* Ambient Radial Accent Glow */}
              <div className="absolute -right-12 -bottom-12 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
            </div>

            {/* TRACKS / DISCOVER SECTION */}
            <section className={`rounded-2xl p-6 border shadow-lg ${
              darkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-6 bg-emerald-500 rounded-full" />
                  <h2 className="text-xl font-bold tracking-wide flex items-center gap-2">
                    {activeTab}
                  </h2>
                </div>
                <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${
                  darkMode ? 'bg-slate-800 text-slate-400 border-slate-700' : 'bg-slate-100 text-slate-600 border-slate-300'
                }`}>
                  {displayedSongs.length} tracks found
                </span>
              </div>

              {/* SONGS LIST */}
              <div className="space-y-2">
                {displayedSongs.map((song) => {
                  const isCurrent = currentTrack.id === song.id;
                  const isFav = favorites.includes(song.id);

                  return (
                    <div
                      key={song.id}
                      onClick={() => handlePlayTrack(song, displayedSongs)}
                      className={`group flex items-center justify-between p-3.5 rounded-xl transition-all cursor-pointer border ${
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
                            isCurrent ? 'text-emerald-400 font-bold' : (darkMode ? 'text-slate-100' : 'text-slate-800')
                          }`}>
                            "{song.title}"
                          </h3>
                          <p className="text-xs text-slate-400 mt-0.5">{song.artist}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-5">
                        <span className="text-xs text-slate-400 font-mono hidden sm:inline">
                          {song.durationFormatted || formatTime(song.duration)}
                        </span>
                        <button 
                          onClick={(e) => toggleFavorite(song.id, e)}
                          className={`p-1.5 rounded-full transition ${
                            isFav ? 'text-rose-500' : 'text-slate-400 opacity-0 group-hover:opacity-100 hover:text-slate-200'
                          }`}
                        >
                          <Heart className={`w-4 h-4 ${isFav ? 'fill-current' : ''}`} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

          </div>
        </main>
      </div>

      {/* FOOTER AUDIO PLAYER */}
      <footer className={`fixed bottom-0 left-0 right-0 h-20 px-6 flex items-center justify-between border-t z-50 backdrop-blur-lg ${
        darkMode ? 'bg-slate-900/95 border-slate-800 text-white' : 'bg-white/95 border-slate-200 text-slate-900 shadow-lg'
      }`}>
        <div className="flex items-center gap-3 w-1/4">
          <img 
            src={currentTrack.coverPath || "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=400&q=80"} 
            alt={currentTrack.title} 
            className="w-12 h-12 rounded-lg object-cover bg-slate-800 shadow-sm shrink-0" 
          />
          <div className="truncate">
            <h4 className="text-sm font-semibold truncate">{currentTrack.title}</h4>
            <p className="text-xs text-slate-400 truncate mt-0.5">{currentTrack.artist}</p>
          </div>
        </div>

        <div className="flex flex-col items-center gap-1.5 w-2/4 max-w-xl">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsShuffle(!isShuffle)} className={isShuffle ? 'text-emerald-400' : 'text-slate-400 hover:text-white'}>
              <Shuffle className="w-4 h-4" />
            </button>
            <button onClick={handlePrev} className="text-slate-400 hover:text-white transition"><SkipBack className="w-5 h-5" /></button>
            <button onClick={togglePlay} className="p-3 rounded-full bg-blue-600 text-white shadow-lg hover:scale-105 transition">
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 pl-0.5" />}
            </button>
            <button onClick={handleNext} className="text-slate-400 hover:text-white transition"><SkipForward className="w-5 h-5" /></button>
            <button onClick={() => setIsRepeat(!isRepeat)} className={isRepeat ? 'text-emerald-400' : 'text-slate-400 hover:text-white'}>
              <Repeat className="w-4 h-4" />
            </button>
          </div>

          <div className="w-full flex items-center gap-3 text-xs font-mono text-slate-400">
            <span>{formatTime(currentTime)}</span>
            <input 
              type="range" 
              min="0" 
              max={duration || 100} 
              value={currentTime} 
              onChange={handleSeek}
              className="flex-1 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 w-1/4">
          <button onClick={() => setIsMuted(!isMuted)} className="text-slate-400 hover:text-white transition">
            {isMuted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>
          <input 
            type="range" 
            min="0" 
            max="1" 
            step="0.01" 
            value={isMuted ? 0 : volume} 
            onChange={(e) => {
              setVolume(parseFloat(e.target.value));
              setIsMuted(false);
            }}
            className="w-24 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
        </div>
      </footer>
    </div>
  );
}
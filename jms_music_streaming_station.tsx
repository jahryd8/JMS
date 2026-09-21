import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, Pause, SkipBack, SkipForward, Shuffle, Repeat, Volume2, VolumeX, 
  Search, Moon, Sun, Music, Heart, Disc, ListMusic, Download, Settings, 
  LogOut, Radio, User, Check, Plus, Trash2, Sparkles, Sliders, ChevronDown
} from 'lucide-react';

const SEEDED_SONGS = [
  {
    id: 's1',
    title: 'Thriller',
    artist: 'Michael Jackson',
    album: 'Thriller',
    duration: 357,
    durationFormatted: '5:57',
    cover: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=400&q=80',
    audioUrl: 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=funky-synthwave-111718.mp3'
  },
  {
    id: 's2',
    title: 'Bohemian Rhapsody',
    artist: 'Queen',
    album: 'A Night at the Opera',
    duration: 354,
    durationFormatted: '5:54',
    cover: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=400&q=80',
    audioUrl: 'https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0a13f69d2.mp3?filename=rock-classic-10022.mp3'
  },
  {
    id: 's3',
    title: 'Billie Jean',
    artist: 'Michael Jackson',
    album: 'Thriller',
    duration: 294,
    durationFormatted: '4:54',
    cover: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=400&q=80',
    audioUrl: 'https://cdn.pixabay.com/download/audio/2022/03/15/audio_c8c8a73229.mp3?filename=groove-groove-10821.mp3'
  },
  {
    id: 's4',
    title: 'Smells Like Teen Spirit',
    artist: 'Nirvana',
    album: 'Nevermind',
    duration: 301,
    durationFormatted: '5:01',
    cover: 'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?auto=format&fit=crop&w=400&q=80',
    audioUrl: 'https://cdn.pixabay.com/download/audio/2022/02/10/audio_b29c97b830.mp3?filename=energetic-rock-10332.mp3'
  },
  {
    id: 's5',
    title: 'Rolling in the Deep',
    artist: 'Adele',
    album: '21',
    duration: 228,
    durationFormatted: '3:48',
    cover: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&w=400&q=80',
    audioUrl: 'https://cdn.pixabay.com/download/audio/2022/03/24/audio_34b35848bb.mp3?filename=pop-soul-10901.mp3'
  },
  {
    id: 's6',
    title: 'Bad Romance',
    artist: 'Lady Gaga',
    album: 'The Fame Monster',
    duration: 294,
    durationFormatted: '4:54',
    cover: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=400&q=80',
    audioUrl: 'https://cdn.pixabay.com/download/audio/2022/03/10/audio_2c3a5b06a4.mp3?filename=dance-pop-10640.mp3'
  },
  {
    id: 's7',
    title: "Gangsta's Paradise",
    artist: 'Coolio',
    album: "Gangsta's Paradise",
    duration: 240,
    durationFormatted: '4:00',
    cover: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=400&q=80',
    audioUrl: 'https://cdn.pixabay.com/download/audio/2022/05/16/audio_db607310df.mp3?filename=hip-hop-beat-11100.mp3'
  },
  {
    id: 's8',
    title: 'Every Breath You Take',
    artist: 'The Police',
    album: 'Synchronicity',
    duration: 253,
    durationFormatted: '4:13',
    cover: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?auto=format&fit=crop&w=400&q=80',
    audioUrl: 'https://cdn.pixabay.com/download/audio/2021/09/06/audio_8b25ed8a71.mp3?filename=chill-synth-8921.mp3'
  },
  {
    id: 's9',
    title: "Sweet Child O' Mine",
    artist: "Guns N' Roses",
    album: 'Appetite for Destruction',
    duration: 356,
    durationFormatted: '5:56',
    cover: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&w=400&q=80',
    audioUrl: 'https://cdn.pixabay.com/download/audio/2022/01/26/audio_d14f88e1a8.mp3?filename=guitar-solo-10110.mp3'
  }
];

export default function App() {
  const [darkMode, setDarkMode] = useState(true);
  const [activeTab, setActiveTab] = useState('Discover');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Track & Playback state
  const [playlist, setPlaylist] = useState(SEEDED_SONGS);
  const [discoverSongs, setDiscoverSongs] = useState(SEEDED_SONGS);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);
  const [isRepeat, setIsRepeat] = useState(false);
  const [favorites, setFavorites] = useState(['s1', 's3']);

  const audioRef = useRef(null);
  const visualizerCanvasRef = useRef(null);
  const animFrameRef = useRef(null);

  const currentTrack = playlist[currentTrackIndex] || SEEDED_SONGS[0];

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  // Dynamic discovery song shuffler on load/revisit as specified in DB schema note
  useEffect(() => {
    const shuffled = [...SEEDED_SONGS].sort(() => Math.random() - 0.5);
    setDiscoverSongs(shuffled);
  }, []);

  const handlePlayTrack = (index, list = playlist) => {
    setPlaylist(list);
    setCurrentTrackIndex(index);
    setIsPlaying(true);
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => setIsPlaying(true)).catch(err => console.log(err));
    }
  };

  const handleNext = () => {
    if (isShuffle) {
      const nextRand = Math.floor(Math.random() * playlist.length);
      setCurrentTrackIndex(nextRand);
    } else {
      setCurrentTrackIndex((prev) => (prev + 1) % playlist.length);
    }
    setIsPlaying(true);
  };

  const handlePrev = () => {
    if (currentTime > 3) {
      if (audioRef.current) audioRef.current.currentTime = 0;
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

  const handleSeek = (e) => {
    const seekTime = parseFloat(e.target.value);
    setCurrentTime(seekTime);
    if (audioRef.current) {
      audioRef.current.currentTime = seekTime;
    }
  };

  const toggleFavorite = (id, e) => {
    e.stopPropagation();
    setFavorites(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  useEffect(() => {
    const canvas = visualizerCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let bars = 16;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const barWidth = canvas.width / bars;

      for (let i = 0; i < bars; i++) {
        let barHeight = isPlaying 
          ? Math.random() * (canvas.height * 0.85) + 4 
          : 3;
        
        const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
        gradient.addColorStop(0, darkMode ? '#3b82f6' : '#2563eb');
        gradient.addColorStop(1, darkMode ? '#60a5fa' : '#93c5fd');

        ctx.fillStyle = gradient;
        ctx.fillRect(i * barWidth + 1, canvas.height - barHeight, barWidth - 2, barHeight);
      }

      animFrameRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, darkMode]);

  // Audio track change handler
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.src = currentTrack.audioUrl;
      if (isPlaying) {
        audioRef.current.play().catch(e => console.log("Autoplay blocked or stream error", e));
      }
    }
  }, [currentTrackIndex, currentTrack]);

  const formatTime = (secs) => {
    if (isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Filtered tracks based on search bar
  const filteredDiscover = discoverSongs.filter(s => 
    s.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    s.artist.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className={`min-h-screen font-sans transition-colors duration-300 ${
      darkMode 
        ? 'bg-slate-950 text-slate-100' 
        : 'bg-sky-50 text-slate-800'
    }`}>
      <audio 
        ref={audioRef} 
        onTimeUpdate={handleTimeUpdate} 
        onEnded={handleNext}
      />

      {/* TOP BAR NAVIGATION */}
      {}
      <header className={`h-16 px-6 flex items-center justify-between border-b sticky top-0 z-40 backdrop-blur-md ${
        darkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-sky-400/90 text-white border-sky-300 shadow-sm'
      }`}>
        {/* Brand Logo */}
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl flex items-center justify-center ${darkMode ? 'bg-blue-600 text-white' : 'bg-white text-sky-600 shadow'}`}>
            <Radio className="w-6 h-6 animate-pulse" />
          </div>
          <span className="text-2xl font-black tracking-wider">JMS</span>
        </div>

        {/* Search Bar */}
        <div className="relative w-1/3 max-w-md">
          <Search className={`absolute left-3 top-2.5 w-4 h-4 ${darkMode ? 'text-slate-400' : 'text-slate-400'}`} />
          <input 
            type="text" 
            placeholder="Search artists, songs, playlists..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full pl-9 pr-4 py-1.5 rounded-full text-sm outline-none transition-all ${
              darkMode 
                ? 'bg-slate-800/80 text-white border border-slate-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500' 
                : 'bg-white/90 text-slate-800 border border-sky-200 focus:border-sky-500 focus:ring-2 focus:ring-sky-300'
            }`}
          />
        </div>

        {/* Right Controls / Profile */}
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setDarkMode(!darkMode)}
            className={`p-2 rounded-full transition-colors ${
              darkMode ? 'hover:bg-slate-800 text-amber-400' : 'hover:bg-sky-500 text-slate-800'
            }`}
            title="Toggle Light/Dark Theme"
          >
            {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>

          <button className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition ${
            darkMode ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-sky-500 text-white'
          }`}>
            <Music className="w-4 h-4" />
            <span className="hidden sm:inline">My Playlist</span>
          </button>

          <div className="flex items-center gap-2 border-l pl-4 border-slate-700/40">
            <div className="w-9 h-9 rounded-full bg-emerald-500/30 border border-emerald-400/50 flex items-center justify-center text-emerald-400 font-bold">
              J
            </div>
            <span className="text-sm font-semibold hidden md:inline">Jaheim</span>
            <ChevronDown className="w-4 h-4 opacity-70" />
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <div className="flex min-h-[calc(100vh-4rem-5rem)]">
        
        {/* LEFT SIDEBAR NAVIGATION */}
        {}
        <aside className={`w-56 p-4 flex flex-col justify-between border-r shrink-0 ${
          darkMode ? 'bg-slate-900/50 border-slate-800/80' : 'bg-sky-100/60 border-sky-200'
        }`}>
          <div>
            <h2 className={`text-xs font-bold uppercase tracking-wider mb-4 px-3 ${
              darkMode ? 'text-slate-400' : 'text-slate-500'
            }`}>MENU</h2>
            
            <nav className="space-y-1">
              {[
                { name: 'Discover', icon: Disc },
                { name: 'My Music', icon: Music },
                { name: 'Favourites', icon: Heart },
                { name: 'Playlist', icon: ListMusic },
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
                        ? (darkMode ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'bg-sky-500 text-white shadow')
                        : (darkMode ? 'text-slate-300 hover:bg-slate-800/60' : 'text-slate-700 hover:bg-sky-200/50')
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
            darkMode ? 'text-rose-400 hover:bg-rose-500/10' : 'text-rose-600 hover:bg-rose-100'
          }`}>
            <LogOut className="w-4 h-4" />
            Log Out
          </button>
        </aside>

        {/* MAIN WORKSPACE CONTENT */}
        {}
        <main className="flex-1 p-6 overflow-y-auto max-w-6xl">
          
          {/* Hero Banner Header */}
          <div className={`relative rounded-3xl p-8 mb-6 overflow-hidden flex items-center justify-between shadow-xl ${
            darkMode 
              ? 'bg-gradient-to-r from-slate-800 via-slate-800/90 to-blue-900/40 border border-slate-700/60' 
              : 'bg-gradient-to-r from-sky-400 via-sky-300 to-blue-300 text-white'
          }`}>
            <div className="z-10 max-w-lg">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 mb-3">
                <Sparkles className="w-3.5 h-3.5" /> Fedora & Mobile Ready
              </span>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-2">
                Welcome to <span className={darkMode ? 'text-emerald-400' : 'text-slate-900'}>Jah's Music Station</span>
              </h1>
              <p className={`text-sm leading-relaxed ${darkMode ? 'text-slate-300' : 'text-slate-800'}`}>
                Stream your custom ID3-tagged music library across your Linux desktop and mobile devices seamlessly.
              </p>
            </div>

            <div className="hidden md:block relative z-10 w-48 h-36">
              <img 
                src="https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=500&q=80" 
                alt="Headphones graphic" 
                className="w-full h-full object-cover rounded-2xl shadow-2xl rotate-2 hover:rotate-0 transition-transform duration-500 border-2 border-white/20"
              />
            </div>
          </div>

          {/* DISCOVER SECTION / TRACK LIST */}
          {}
          <section className={`rounded-2xl p-6 shadow-sm border ${
            darkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white/80 border-sky-100'
          }`}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Disc className="w-5 h-5 text-blue-500" />
                {activeTab === 'Favourites' ? 'Your Favourite Songs' : 'Discover'}
              </h2>
              <span className="text-xs text-slate-400 font-medium">
                {filteredDiscover.length} tracks indexed
              </span>
            </div>

            <div className="space-y-2">
              {filteredDiscover.map((song, idx) => {
                const isCurrent = currentTrack.id === song.id;
                const isFav = favorites.includes(song.id);

                if (activeTab === 'Favourites' && !isFav) return null;

                return (
                  <div
                    key={song.id}
                    onClick={() => handlePlayTrack(idx, filteredDiscover)}
                    className={`group flex items-center justify-between p-3 rounded-xl transition-all cursor-pointer ${
                      isCurrent
                        ? (darkMode ? 'bg-blue-600/20 border border-blue-500/40' : 'bg-sky-100 border border-sky-300')
                        : (darkMode ? 'hover:bg-slate-800/60' : 'hover:bg-sky-50')
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative w-10 h-10 rounded-lg overflow-hidden shrink-0">
                        <img src={song.cover} alt={song.title} className="w-full h-full object-cover" />
                        {isCurrent && isPlaying && (
                          <div className="absolute inset-0 bg-blue-600/60 backdrop-blur-xs flex items-center justify-center">
                            <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                          </div>
                        )}
                      </div>
                      <div>
                        <h3 className={`text-sm font-semibold transition ${
                          isCurrent ? 'text-blue-500' : ''
                        }`}>
                          "{song.title}"
                        </h3>
                        <p className="text-xs text-slate-400">{song.artist}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <span className="text-xs text-slate-400 font-mono hidden sm:inline">
                        {song.durationFormatted}
                      </span>
                      <button 
                        onClick={(e) => toggleFavorite(song.id, e)}
                        className={`p-1.5 rounded-full transition ${
                          isFav ? 'text-rose-500' : 'text-slate-400 opacity-0 group-hover:opacity-100'
                        }`}
                      >
                        <Heart className="w-4 h-4 fill-current" />
                      </button>
                      <button className={`p-2 rounded-full transition ${
                        isCurrent && isPlaying 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-slate-700/30 text-slate-300 hover:bg-blue-600 hover:text-white'
                      }`}>
                        {isCurrent && isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </main>

        {/* RIGHT SIDEBAR LAYOUT */}
        {}
        <aside className={`w-80 p-4 border-l flex flex-col justify-between shrink-0 hidden lg:flex ${
          darkMode ? 'bg-slate-900/40 border-slate-800' : 'bg-sky-100/40 border-sky-200'
        }`}>
          {/* Playlist Side Panel */}
          <div className="flex-1 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-extrabold tracking-tight">My Playlist</h2>
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 font-bold">
                Queue ({playlist.length})
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
              {playlist.map((track, i) => {
                const isSelected = i === currentTrackIndex;
                return (
                  <div
                    key={`${track.id}-${i}`}
                    onClick={() => handlePlayTrack(i)}
                    className={`flex items-center justify-between p-2.5 rounded-xl text-xs font-medium cursor-pointer transition ${
                      isSelected
                        ? (darkMode ? 'bg-blue-600 text-white font-bold' : 'bg-sky-500 text-white font-bold')
                        : (darkMode ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-700 hover:bg-sky-200/60')
                    }`}
                  >
                    <div className="truncate pr-2">
                      <p className="truncate">{track.title} – <span className={isSelected ? 'text-blue-100' : 'text-slate-400'}>{track.artist}</span></p>
                    </div>
                    {isSelected && isPlaying && (
                      <Volume2 className="w-3.5 h-3.5 shrink-0 animate-bounce" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Floating "Now Playing" Widget */}
          <div className={`mt-4 p-4 rounded-2xl shadow-xl border backdrop-blur-md relative overflow-hidden ${
            darkMode 
              ? 'bg-slate-800/80 border-slate-700/80 text-white' 
              : 'bg-white/90 border-sky-200 text-slate-800'
          }`}>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Now Playing</h3>
            
            <div className="flex gap-3 items-center mb-3">
              <img 
                src={currentTrack.cover} 
                alt={currentTrack.title} 
                className="w-16 h-16 rounded-xl object-cover shadow-md border border-white/10"
              />
              <div className="overflow-hidden">
                <h4 className="font-bold text-sm truncate">{currentTrack.title}</h4>
                <p className="text-xs text-slate-400 truncate">{currentTrack.artist}</p>
                <p className="text-[10px] text-blue-400 mt-1 font-mono">{currentTrack.album}</p>
              </div>
            </div>

            {/* Audio Spectrum Graphic Visualizer */}
            <div className="h-8 w-full bg-slate-900/30 rounded-lg overflow-hidden p-1">
              <canvas ref={visualizerCanvasRef} width="220" height="28" className="w-full h-full" />
            </div>
          </div>
        </aside>

      </div>

      {/* PERSISTENT AUDIO PLAYER CONTROL BAR */}
      {}
      <footer className={`fixed bottom-0 left-0 right-0 h-20 px-6 flex items-center justify-between border-t z-50 backdrop-blur-lg ${
        darkMode ? 'bg-slate-900/90 border-slate-800 text-white' : 'bg-white/95 border-sky-200 text-slate-800 shadow-2xl'
      }`}>
        
        {/* Track Details */}
        <div className="flex items-center gap-3 w-1/4 min-w-[180px]">
          <img 
            src={currentTrack.cover} 
            alt={currentTrack.title} 
            className="w-12 h-12 rounded-lg object-cover shadow border border-white/10 shrink-0" 
          />
          <div className="truncate">
            <h4 className="text-sm font-semibold truncate">{currentTrack.title}</h4>
            <p className="text-xs text-slate-400 truncate">{currentTrack.artist}</p>
          </div>
        </div>

        {/* Central Controls & Seek Scrub Bar */}
        <div className="flex flex-col items-center gap-1.5 w-2/4 max-w-xl">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsShuffle(!isShuffle)}
              className={`transition ${isShuffle ? 'text-blue-500' : 'text-slate-400 hover:text-slate-200'}`}
              title="Shuffle"
            >
              <Shuffle className="w-4 h-4" />
            </button>

            <button onClick={handlePrev} className="text-slate-400 hover:text-white transition">
              <SkipBack className="w-5 h-5" />
            </button>

            <button 
              onClick={togglePlay} 
              className="p-3 rounded-full bg-blue-600 text-white hover:bg-blue-500 transition shadow-lg shadow-blue-600/30"
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 pl-0.5" />}
            </button>

            <button onClick={handleNext} className="text-slate-400 hover:text-white transition">
              <SkipForward className="w-5 h-5" />
            </button>

            <button 
              onClick={() => setIsRepeat(!isRepeat)}
              className={`transition ${isRepeat ? 'text-blue-500' : 'text-slate-400 hover:text-slate-200'}`}
              title="Repeat"
            >
              <Repeat className="w-4 h-4" />
            </button>
          </div>

          {/* Time Scrubber */}
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

        {/* Volume Controls */}
        <div className="flex items-center justify-end gap-3 w-1/4 min-w-[140px]">
          <button onClick={() => setIsMuted(!isMuted)} className="text-slate-400 hover:text-white">
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
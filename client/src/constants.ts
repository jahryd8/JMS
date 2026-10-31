export const ITEMS_PER_BATCH = 20;
export const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000';

export const DB_NAME = 'jms_downloads';
export const DB_STORE = 'tracks';

export const THEME_KEY = 'jms_theme';
export const LAST_PLAYED_KEY = 'jms_last_played';
export const DOWNLOADS_ORDER_KEY = 'jms_downloads_order';
export const RESUME_PLAYBACK_KEY = 'jms_resume_playback';
export const LAST_PLAYED_VERSION = 2;

export const GENERIC_COVERS = [
  "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&w=400&q=80"
];

export const DISCOVER_CATEGORIES = [
  { id: 'late-night', name: 'Late Night', tagline: 'Slow jams after dark',
    gradient: 'from-indigo-600 via-purple-700 to-slate-900',
    image: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=800&q=80' },
  { id: 'throwbacks', name: 'Throwbacks', tagline: 'Old but gold',
    gradient: 'from-amber-500 via-orange-600 to-rose-600',
    image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=800&q=80' },
  { id: 'hype', name: 'Hype', tagline: 'Turn it up',
    gradient: 'from-rose-500 via-red-600 to-purple-700',
    image: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?auto=format&fit=crop&w=800&q=80' },
  { id: 'chill', name: 'Chill Vibes', tagline: 'Easy listening',
    gradient: 'from-teal-500 via-cyan-600 to-blue-700',
    image: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&w=800&q=80' },
  { id: 'workout', name: 'Workout', tagline: 'Push through it',
    gradient: 'from-lime-500 via-emerald-600 to-cyan-700',
    image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=800&q=80' },
  { id: 'focus', name: 'Focus', tagline: 'Deep concentration',
    gradient: 'from-slate-600 via-slate-800 to-black',
    image: 'https://images.unsplash.com/photo-1483058712412-4245e9b90334?auto=format&fit=crop&w=800&q=80' },
  { id: 'feelgood', name: 'Feel Good', tagline: 'Instant mood lift',
    gradient: 'from-yellow-400 via-pink-500 to-purple-600',
    image: 'https://images.unsplash.com/photo-1499364615650-ec38552f4f34?auto=format&fit=crop&w=800&q=80' },
  { id: 'romance', name: 'Romance', tagline: 'Love in the air',
    gradient: 'from-pink-500 via-rose-500 to-red-500',
    image: 'https://images.unsplash.com/photo-1518199266791-5375a83190b7?auto=format&fit=crop&w=800&q=80' },
  { id: 'road-trip', name: 'Road Trip', tagline: 'Windows down',
    gradient: 'from-sky-400 via-blue-600 to-indigo-800',
    image: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=800&q=80' },
  { id: 'afrobeats', name: 'Afrobeats', tagline: 'Move your body',
    gradient: 'from-orange-500 via-amber-600 to-yellow-600',
    image: 'https://images.unsplash.com/photo-1526478806334-5fd488fcaabc?auto=format&fit=crop&w=800&q=80' },
  { id: 'reggae', name: 'Reggae', tagline: 'Island time',
    gradient: 'from-green-500 via-yellow-500 to-red-500',
    image: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=800&q=80' },
  { id: 'nostalgia', name: 'Nostalgia', tagline: 'Rewind the tape',
    gradient: 'from-violet-500 via-fuchsia-600 to-purple-800',
    image: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=800&q=80' },
];
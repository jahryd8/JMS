import { Play } from 'lucide-react';
import { DISCOVER_CATEGORIES } from '../constants';

interface Props {
  darkMode: boolean;
  theme: { heroGrad: string; heroBorder: string; textMuted: string };
  onPlayRandom: (categoryName: string) => void;
}

export default function DiscoverGrid({ darkMode, theme, onPlayRandom }: Props) {
  return (
    <div className="animate-[fadeIn_0.4s_ease-out]">
      <div className={`relative p-8 sm:p-12 rounded-3xl mb-6 sm:mb-8 border overflow-hidden bg-gradient-to-br ${theme.heroGrad} ${theme.heroBorder}`}>
        <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-64 h-64 rounded-full bg-purple-500/10 blur-3xl" />
        <div className="relative">
          <p className={`text-[10px] sm:text-xs font-bold tracking-[0.3em] uppercase mb-2 ${darkMode ? 'text-blue-400' : 'text-indigo-600'}`}>
            Jah's Music Station
          </p>
          <h1 className={`text-3xl sm:text-5xl lg:text-6xl font-black leading-tight mb-3 ${
            darkMode
              ? 'bg-gradient-to-r from-white via-blue-100 to-purple-200 bg-clip-text text-transparent'
              : 'bg-gradient-to-r from-indigo-700 via-purple-700 to-pink-600 bg-clip-text text-transparent'
          }`}>
            Discover
          </h1>
          <p className={`text-sm sm:text-base max-w-2xl ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
            Tap any vibe to drop into a random track from your library.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        {DISCOVER_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => onPlayRandom(cat.name)}
            className="group relative h-36 sm:h-44 rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 text-left border border-white/10"
          >
            <img
              src={cat.image} alt={cat.name} loading="lazy"
              className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-80 group-hover:scale-110 transition-all duration-700"
            />
            <div className={`absolute inset-0 bg-gradient-to-br ${cat.gradient} opacity-80 group-hover:opacity-70 transition-opacity duration-300`} />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
            <div className="absolute inset-0 p-4 flex flex-col justify-end">
              <p className="text-white font-bold text-lg sm:text-xl leading-tight drop-shadow-lg">{cat.name}</p>
              <p className="text-white/70 text-[10px] sm:text-xs mt-0.5 drop-shadow">{cat.tagline}</p>
            </div>
            <div className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Play className="w-4 h-4 text-white fill-white" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
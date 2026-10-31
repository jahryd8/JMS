import {
  Play, Pause, SkipBack, SkipForward, Shuffle, Repeat, Volume2, VolumeX,
} from 'lucide-react';
import type { Song } from '../types';

interface Props {
  darkMode: boolean;
  theme: { textMuted: string; accentText: string; playerBar: string };
  currentTrack: Song;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  isShuffle: boolean;
  isRepeat: boolean;
  coverUrl: string;
  onTogglePlay: () => void;
  onPrev: () => void;
  onNext: () => void;
  onToggleShuffle: () => void;
  onToggleRepeat: () => void;
  onToggleMute: () => void;
  onVolumeChange: (v: number) => void;
  onSeek: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onOpenMobile: () => void;
  onCoverError: (e: React.SyntheticEvent<HTMLImageElement>) => void;
}

const formatTime = (secs: number) => {
  if (isNaN(secs) || secs <= 0) return '0:00';
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
};

export default function MiniPlayer({
  darkMode, theme, currentTrack, isPlaying, currentTime, duration, volume, isMuted,
  isShuffle, isRepeat, coverUrl,
  onTogglePlay, onPrev, onNext, onToggleShuffle, onToggleRepeat,
  onToggleMute, onVolumeChange, onSeek, onOpenMobile, onCoverError,
}: Props) {
  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <footer
      className={`fixed left-0 right-0 z-30 border-t backdrop-blur-md ${theme.playerBar}`}
      style={{ bottom: 'calc(60px + env(safe-area-inset-bottom))' }}
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2.5 flex items-center gap-3 sm:gap-4">
        <div
          className="flex items-center gap-2 sm:gap-3 min-w-0 w-32 sm:w-56 shrink-0 cursor-pointer md:cursor-default"
          onClick={() => { if (window.innerWidth < 768) onOpenMobile(); }}
        >
          <img
            src={coverUrl} alt={currentTrack.title}
            onError={onCoverError}
            className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl object-cover bg-slate-800 shadow shrink-0"
          />
          <div className="min-w-0 hidden sm:block">
            <p className="text-xs sm:text-sm font-semibold truncate">{currentTrack.title}</p>
            <p className={`text-[10px] sm:text-xs truncate ${theme.textMuted}`}>{currentTrack.artist}</p>
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center gap-1 min-w-0">
          <div className="flex items-center gap-2 sm:gap-4">
            <button onClick={onToggleShuffle}
              className={`hidden sm:block transition ${isShuffle ? theme.accentText : 'text-slate-400 hover:text-slate-200'}`}>
              <Shuffle className="w-4 h-4" />
            </button>
            <button onClick={onPrev}
              className={`${darkMode ? 'text-slate-300 hover:text-white' : 'text-slate-600 hover:text-indigo-600'} transition`}>
              <SkipBack className="w-5 h-5" />
            </button>
            <button onClick={onTogglePlay}
              className={`w-10 h-10 rounded-full flex items-center justify-center hover:scale-105 transition shadow-lg ${
                darkMode ? 'bg-white text-slate-900' : 'bg-gradient-to-br from-indigo-600 to-purple-600 text-white'
              }`}>
              {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
            </button>
            <button onClick={onNext}
              className={`${darkMode ? 'text-slate-300 hover:text-white' : 'text-slate-600 hover:text-indigo-600'} transition`}>
              <SkipForward className="w-5 h-5" />
            </button>
            <button onClick={onToggleRepeat}
              className={`hidden sm:block transition ${isRepeat ? theme.accentText : 'text-slate-400 hover:text-slate-200'}`}>
              <Repeat className="w-4 h-4" />
                        </button>
          </div>

          <div className="flex items-center gap-2 w-full max-w-md">
            <span className={`text-[10px] w-8 text-right ${theme.textMuted}`}>{formatTime(currentTime)}</span>
            <div className="relative flex-1">
              <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
              <div
                className="absolute top-1/2 -translate-y-1/2 left-0 h-1 rounded-full bg-gradient-to-r from-emerald-400 to-blue-500 transition-all duration-150"
                style={{ width: `${progressPct}%` }}
              />
              <input
                type="range" min={0} max={duration || 0} value={currentTime}
                onChange={onSeek}
                className="relative w-full h-4 bg-transparent appearance-none cursor-pointer z-10
                           [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3
                           [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white
                           [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:border-2
                           [&::-webkit-slider-thumb]:border-emerald-400
                           [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-3
                           [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white
                           [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-emerald-400"
              />
            </div>
            <span className={`text-[10px] w-8 ${theme.textMuted}`}>{formatTime(duration)}</span>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-2 w-40 justify-end">
          <button onClick={onToggleMute} className={`${theme.textMuted} hover:opacity-100 transition`}>
            {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <input
            type="range" min={0} max={1} step={0.01}
            value={isMuted ? 0 : volume}
            onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
            className="w-20 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
          />
        </div>
      </div>
    </footer>
  );
}
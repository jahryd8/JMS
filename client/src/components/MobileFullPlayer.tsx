import {
  ChevronDown, MoreHorizontal, Heart, Shuffle, SkipBack,
  SkipForward, Pause, Play, Repeat, ListPlus, HardDriveDownload, X,
} from 'lucide-react';
import type { Song, Playlist } from '../types';

interface Props {
  darkMode: boolean;
  theme: { textMuted: string; accentText: string; hover: string };
  currentTrack: Song;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  isShuffle: boolean;
  isRepeat: boolean;
  isCurrentFav: boolean;
  isCurrentDownloaded: boolean;
  downloadProg?: number;
  coverUrl: string;
  playbackQueue: Song[];
  currentTrackIndex: number;
  isOpen: boolean;
  isMenuOpen: boolean;
  playlists: Playlist[];
  getCoverUrl: (song: Song) => string;
  onClose: () => void;
  onOpenMenu: () => void;
  onCloseMenu: () => void;
  onTogglePlay: () => void;
  onPrev: () => void;
  onNext: () => void;
  onToggleShuffle: () => void;
  onToggleRepeat: () => void;
  onSeek: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onToggleFavorite: (e: React.MouseEvent) => void;
  onPlayTrack: (song: Song, queue: Song[]) => void;
  onOpenAddToPlaylist: () => void;
  onDownload: (e: React.MouseEvent) => void;
  onCoverError: (e: React.SyntheticEvent<HTMLImageElement>) => void;
}

const formatTime = (secs: number) => {
  if (isNaN(secs) || secs <= 0) return '0:00';
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
};

export default function MobileFullPlayer({
  darkMode, theme, currentTrack, isPlaying, currentTime, duration,
  isShuffle, isRepeat, isCurrentFav, isCurrentDownloaded, downloadProg,
  coverUrl, playbackQueue, currentTrackIndex, isOpen, isMenuOpen,
  getCoverUrl, onClose, onOpenMenu, onCloseMenu, onTogglePlay, onPrev, onNext,
  onToggleShuffle, onToggleRepeat, onSeek, onToggleFavorite, onPlayTrack,
  onOpenAddToPlaylist, onDownload, onCoverError,
}: Props) {
  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      className={`fixed inset-0 z-[60] md:hidden flex flex-col transform transition-transform duration-300 ${
        isOpen ? 'translate-y-0' : 'translate-y-full pointer-events-none'
      } ${darkMode ? 'bg-slate-950' : 'bg-white'}`}
      style={{
        paddingTop: 'calc(env(safe-area-inset-top) + 0.5rem)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <div className="flex items-center justify-between p-4 shrink-0">
        <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10">
          <ChevronDown className="w-6 h-6" />
        </button>
        <p className={`text-[10px] font-bold tracking-widest uppercase ${theme.textMuted}`}>Now Playing</p>
        <button onClick={onOpenMenu} className="p-2 rounded-full hover:bg-white/10">
          <MoreHorizontal className="w-6 h-6" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto overscroll-contain">
        <div className="px-6 mt-2">
          <div className="aspect-square rounded-3xl overflow-hidden shadow-2xl">
            <img
              src={coverUrl} alt={currentTrack.title}
              onError={onCoverError}
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        <div className="px-6 mt-6 flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-xl font-bold truncate">{currentTrack.title}</p>
            <p className={`text-sm truncate ${theme.textMuted}`}>{currentTrack.artist}</p>
          </div>
          <button onClick={onToggleFavorite}
            className={`p-2 rounded-full shrink-0 ${isCurrentFav ? 'text-rose-500' : theme.textMuted}`}>
            <Heart className={`w-6 h-6 ${isCurrentFav ? 'fill-rose-500' : ''}`} />
          </button>
        </div>

        <div className="px-6 mt-6">
          <div className="relative">
            <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-1.5 rounded-full bg-slate-700/60" />
            <div
              className="absolute top-1/2 -translate-y-1/2 left-0 h-1.5 rounded-full bg-gradient-to-r from-emerald-400 to-blue-500 transition-all duration-150"
              style={{ width: `${progressPct}%` }}
            />
            <input
              type="range" min={0} max={duration || 0} value={currentTime}
              onChange={onSeek}
              className="relative w-full h-6 bg-transparent appearance-none cursor-pointer z-10
                         [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5
                         [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white
                         [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:border-2
                         [&::-webkit-slider-thumb]:border-emerald-400
                         [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:w-3.5 [&::-moz-range-thumb]:h-3.5
                         [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white
                         [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-emerald-400"
            />
          </div>
          <div className="flex justify-between mt-2 text-xs text-slate-500">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        <div className="px-6 mt-6 flex items-center justify-between">
          <button onClick={onToggleShuffle}
            className={`p-3 ${isShuffle ? theme.accentText : theme.textMuted}`}>
            <Shuffle className="w-6 h-6" />
          </button>
          <button onClick={onPrev} className="p-3"><SkipBack className="w-8 h-8" /></button>
          <button onClick={onTogglePlay}
            className={`w-16 h-16 rounded-full flex items-center justify-center shadow-xl ${
              darkMode ? 'bg-white text-slate-900' : 'bg-gradient-to-br from-indigo-600 to-purple-600 text-white'
            }`}>
            {isPlaying ? <Pause className="w-7 h-7 fill-current" /> : <Play className="w-7 h-7 fill-current ml-1" />}
          </button>
          <button onClick={onNext} className="p-3"><SkipForward className="w-8 h-8" /></button>
          <button onClick={onToggleRepeat}
            className={`p-3 ${isRepeat ? theme.accentText : theme.textMuted}`}>
            <Repeat className="w-6 h-6" />
          </button>
        </div>

        <div className="px-6 mt-8 pb-12">
          <p className={`text-[10px] font-bold tracking-widest uppercase mb-3 ${theme.textMuted}`}>Up Next</p>
          {playbackQueue.length > currentTrackIndex + 1 ? (
            <div className="space-y-1">
              {playbackQueue.slice(currentTrackIndex + 1).map((song) => (
                <div
                  key={song.id}
                  onClick={() => onPlayTrack(song, playbackQueue)}
                  className={`flex items-center gap-3 p-2 rounded-xl cursor-pointer ${theme.hover}`}
                >
                  <img src={getCoverUrl(song)} alt={song.title}
                    className="w-10 h-10 rounded-lg object-cover bg-slate-800"
                    onError={onCoverError}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{song.title}</p>
                    <p className={`text-xs truncate ${theme.textMuted}`}>{song.artist}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className={`text-xs text-center py-4 ${theme.textMuted}`}>End of queue</p>
          )}
        </div>
      </div>

      {isMenuOpen && (
        <div className="absolute inset-0 z-[70] animate-[fadeIn_0.2s_ease-out]">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onCloseMenu}
          />
          <div
            className={`absolute left-0 right-0 bottom-0 rounded-t-3xl p-5 animate-[slideUp_0.25s_ease-out] ${
              darkMode ? 'bg-slate-900' : 'bg-white'
            }`}
            style={{ paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom))' }}
          >
            <div className="w-12 h-1.5 rounded-full bg-slate-500/40 mx-auto mb-5" />

            <div className="flex items-center gap-3 mb-5">
              <img src={coverUrl} alt={currentTrack.title}
                className="w-12 h-12 rounded-lg object-cover bg-slate-800"
                onError={onCoverError}
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold truncate">{currentTrack.title}</p>
                <p className={`text-xs truncate ${theme.textMuted}`}>{currentTrack.artist}</p>
              </div>
            </div>

            <div className="space-y-1">
              <button
                onClick={(e) => { onToggleFavorite(e); onCloseMenu(); }}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition ${theme.hover}`}
              >
                <Heart className={`w-5 h-5 ${isCurrentFav ? 'text-rose-500 fill-rose-500' : ''}`} />
                {isCurrentFav ? 'Remove from Favourites' : 'Add to Favourites'}
              </button>

              <button
                onClick={onOpenAddToPlaylist}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition ${theme.hover}`}
              >
                <ListPlus className="w-5 h-5" />
                Add to Playlist
              </button>

              <button
                onClick={(e) => { onDownload(e); onCloseMenu(); }}
                disabled={downloadProg !== undefined || isCurrentDownloaded}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition disabled:opacity-50 ${theme.hover}`}
              >
                <HardDriveDownload className={`w-5 h-5 ${isCurrentDownloaded ? 'text-emerald-500' : ''}`} />
                {downloadProg !== undefined
                  ? `Downloading ${downloadProg}%`
                  : isCurrentDownloaded ? 'Downloaded' : 'Download for offline'}
              </button>

              <button
                onClick={onCloseMenu}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition ${theme.hover}`}
              >
                <X className="w-5 h-5" />
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
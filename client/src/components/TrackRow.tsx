import { Play, Trash2, HardDriveDownload, DownloadCloud, Heart, Plus, Check, ChevronUp, ChevronDown } from 'lucide-react';
import type { Song, Playlist } from '../types';

interface Props {
  song: Song;
  idx: number;
  isCurrent: boolean;
  isPlaying: boolean;
  isFav: boolean;
  isDownloaded: boolean;
  downloadProgress?: number;
  isDropdownOpen: boolean;
  activeTab: string;
  activePlaylistId: string | null;
  visibleCount: number;
  progressPct: number;
  reorderActive: boolean;
  canReorder: boolean;
  showDownloadBtnAlways: boolean;
  darkMode: boolean;
  theme: { textMuted: string; accentText: string };
  coverUrl: string;
  playlists: Playlist[];
  onPlay: () => void;
  onOpenDropdown: (e: React.MouseEvent) => void;
  onToggleFavorite: (e: React.MouseEvent) => void;
  onDownload: (e: React.MouseEvent) => void;
  onRemoveDownload: (e: React.MouseEvent) => void;
  onRemoveFromPlaylist: (e: React.MouseEvent) => void;
  onToggleSongInPlaylist: (playlistId: string, e: React.MouseEvent) => void;
  onMoveUp: (e: React.MouseEvent) => void;
  onMoveDown: (e: React.MouseEvent) => void;
  onCoverError: (e: React.SyntheticEvent<HTMLImageElement>) => void;
}

const formatTime = (secs: number) => {
  if (isNaN(secs) || secs <= 0) return '0:00';
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
};

export default function TrackRow({
  song, idx, isCurrent, isPlaying, isFav, isDownloaded, downloadProgress,
  isDropdownOpen, activeTab, activePlaylistId, visibleCount, progressPct,
  reorderActive, showDownloadBtnAlways, darkMode, theme, coverUrl, playlists,
  onPlay, onOpenDropdown, onToggleFavorite, onDownload, onRemoveDownload,
  onRemoveFromPlaylist, onToggleSongInPlaylist, onMoveUp, onMoveDown, onCoverError,
}: Props) {
  const rowProgress = isCurrent ? progressPct : 0;

  return (
    <div
      onClick={() => { if (!reorderActive) onPlay(); }}
      className={`group relative flex items-center justify-between gap-2 p-2 sm:p-3.5 rounded-xl transition-all border ${
        reorderActive ? 'cursor-default' : 'cursor-pointer'
      } ${
        isCurrent
          ? (darkMode ? 'bg-blue-600/20 border-blue-500/40' : 'bg-indigo-100 border-indigo-300')
          : (darkMode ? 'hover:bg-slate-800/60 border-transparent' : 'hover:bg-white border-transparent hover:border-indigo-100')
      }`}
    >
      {isCurrent && rowProgress > 0 && (
        <div
          className="absolute left-0 bottom-0 h-0.5 bg-gradient-to-r from-emerald-400 to-blue-500 transition-all duration-300 rounded-bl-xl"
          style={{ width: `${rowProgress}%` }}
        />
      )}

      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
        {reorderActive && (
          <div className="flex flex-col shrink-0 -ml-1">
            <button
              onClick={onMoveUp}
              disabled={idx === 0}
              className={`p-1 rounded transition disabled:opacity-20 ${
                darkMode ? 'text-slate-400 hover:text-white hover:bg-slate-700' : 'text-slate-500 hover:text-indigo-600 hover:bg-slate-100'
              }`}
              title="Move up"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
            <button
              onClick={onMoveDown}
              disabled={idx === visibleCount - 1}
              className={`p-1 rounded transition disabled:opacity-20 ${
                darkMode ? 'text-slate-400 hover:text-white hover:bg-slate-700' : 'text-slate-500 hover:text-indigo-600 hover:bg-slate-100'
              }`}
              title="Move down"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="relative shrink-0">
          <img
            src={coverUrl} alt={song.title}
            onError={onCoverError}
            className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg object-cover bg-slate-800 shadow-sm"
          />
          {isCurrent && isPlaying && !reorderActive && (
            <div className="absolute inset-0 rounded-lg bg-black/40 flex items-center justify-center">
              <Play className="w-4 h-4 text-white fill-white" />
            </div>
          )}
          {isDownloaded && (
            <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center border-2 border-white dark:border-slate-950">
              <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className={`text-xs sm:text-sm font-semibold truncate ${isCurrent ? theme.accentText : ''}`}>{song.title}</p>
          <p className={`text-[10px] sm:text-xs truncate ${theme.textMuted}`}>{song.artist}</p>
        </div>
      </div>

      {!reorderActive && (
        <div className="flex items-center gap-0.5 sm:gap-1.5 shrink-0">
          <span className={`text-[10px] sm:text-xs hidden sm:inline ${theme.textMuted}`}>
            {formatTime(song.duration)}
          </span>

          {activeTab === 'PlaylistView' && activePlaylistId && activePlaylistId !== 'pl-fav' && (
            <button onClick={onRemoveFromPlaylist}
              className="p-1.5 rounded-full text-slate-400 hover:text-rose-500 transition"
              title="Remove from playlist">
              <Trash2 className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={isDownloaded ? onRemoveDownload : onDownload}
            disabled={downloadProgress !== undefined}
            className={`p-1.5 rounded-full transition ${
              showDownloadBtnAlways ? 'inline-flex' : 'hidden sm:inline-flex'
            } ${
              isDownloaded ? 'text-emerald-500 hover:text-rose-500'
                : downloadProgress !== undefined ? 'text-blue-500 cursor-wait'
                : 'text-slate-400 hover:text-blue-500'
            }`}
            title={isDownloaded ? 'Downloaded — click to remove' : downloadProgress !== undefined ? `Downloading ${downloadProgress}%` : 'Download for offline'}
          >
            {downloadProgress !== undefined ? (
              <span className="text-[10px] font-bold tabular-nums w-4 text-center">{downloadProgress}</span>
            ) : isDownloaded ? (<HardDriveDownload className="w-4 h-4" />) : (<DownloadCloud className="w-4 h-4" />)}
          </button>

          <button onClick={onToggleFavorite}
            className={`p-1.5 rounded-full transition ${
              isFav ? 'text-rose-500' : darkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-400 hover:text-rose-400'
            }`}>
            <Heart className={`w-4 h-4 ${isFav ? 'fill-rose-500' : ''}`} />
          </button>

          <div className="relative">
            <button onClick={onOpenDropdown}
              className={`p-1.5 rounded-full transition ${darkMode ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-indigo-600'}`}
              title="Add to Playlist">
              <Plus className="w-4 h-4" />
            </button>
            {isDropdownOpen && (
              <div onClick={(e) => e.stopPropagation()}
                className={`absolute right-0 top-full mt-2 w-48 rounded-xl shadow-2xl border z-[70] p-2 ${
                  darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
                }`}>
                <p className={`px-2 py-1 text-[10px] font-bold tracking-widest uppercase ${theme.textMuted}`}>
                  Add to Playlist
                </p>
                {playlists.map(pl => {
                  const inPl = pl.songIds.includes(song.id);
                  return (
                    <button key={pl.id} onClick={(e) => onToggleSongInPlaylist(pl.id, e)}
                      className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-xs font-medium transition ${
                        darkMode ? 'hover:bg-slate-800' : 'hover:bg-indigo-50'
                      }`}>
                      <span className="truncate">{pl.name}</span>
                      {inPl && <Check className="w-3.5 h-3.5 text-indigo-500" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {reorderActive && (
        <div className={`text-[10px] font-mono font-bold px-2 py-1 rounded-lg ${
          darkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-200 text-slate-600'
        }`}>
          {idx + 1}
        </div>
      )}
    </div>
  );
}
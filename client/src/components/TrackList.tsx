import { HardDriveDownload, Music } from 'lucide-react';
import TrackRow from './TrackRow';
import type { Song, Playlist } from '../types';

interface Props {
  darkMode: boolean;
  theme: { heroGrad: string; heroBorder: string; border: string; textMuted: string; accentText: string };
  activePlaylist: Playlist | undefined;
  activeTab: string;
  activePlaylistId: string | null;
  fullFilteredSongs: Song[];
  visibleSongs: Song[];
  visibleCount: number;
  isLoading: boolean;
  reorderMode: boolean;
  canReorder: boolean;
  currentTrackId: string | null;
  isPlaying: boolean;
  progressPct: number;
  downloadMetaIds: Set<string>;
  downloadProgress: Record<string, number>;
  playlists: Playlist[];
  favoriteIds: Set<string>;
  openDropdownSongId: string | null;
  downloadsCount: number;
  getCoverUrl: (song: Song) => string;
  getPlaylistRealCount: (pl: Playlist) => number;
  onPlay: (song: Song, list: Song[]) => void;
  onOpenDropdown: (songId: string | null, e: React.MouseEvent) => void;
  onToggleFavorite: (songId: string, e: React.MouseEvent) => void;
  onDownload: (song: Song, e: React.MouseEvent) => void;
  onRemoveDownload: (songId: string, e: React.MouseEvent) => void;
  onRemoveFromPlaylist: (songId: string, e: React.MouseEvent) => void;
  onToggleSongInPlaylist: (playlistId: string, songId: string, e: React.MouseEvent) => void;
  onMoveTrack: (playlistId: string, songId: string, direction: 'up' | 'down', e: React.MouseEvent) => void;
  onMoveDownload: (songId: string, direction: 'up' | 'down', e: React.MouseEvent) => void;
  onLoadMore: () => void;
  onToggleReorder: () => void;
  onCoverError: (e: React.SyntheticEvent<HTMLImageElement>) => void;
}

export default function TrackList({
  darkMode, theme, activePlaylist, activeTab, activePlaylistId,
  fullFilteredSongs, visibleSongs, visibleCount, isLoading, reorderMode, canReorder,
  currentTrackId, isPlaying, progressPct,
  downloadMetaIds, downloadProgress, playlists, favoriteIds, openDropdownSongId,
  downloadsCount, getCoverUrl, getPlaylistRealCount,
  onPlay, onOpenDropdown, onToggleFavorite, onDownload, onRemoveDownload,
  onRemoveFromPlaylist, onToggleSongInPlaylist, onMoveTrack, onMoveDownload,
  onLoadMore, onToggleReorder, onCoverError,
}: Props) {
  const reorderActive = canReorder && reorderMode;

  return (
    <div className="animate-[fadeIn_0.4s_ease-out]">
      <div className={`p-5 sm:p-6 rounded-2xl mb-6 border bg-gradient-to-br ${theme.heroGrad} ${theme.heroBorder}`}>
        <h1 className={`text-xl sm:text-3xl font-bold mb-1 ${darkMode ? '' : 'text-slate-900'}`}>
          {activePlaylist ? activePlaylist.name : activeTab === 'Downloads' ? 'Offline Library' : "Jah's Music Station"}
        </h1>
        <p className={`text-xs sm:text-sm ${darkMode ? 'text-slate-400' : 'text-slate-700'}`}>
          {activePlaylist
            ? `Custom playlist with ${getPlaylistRealCount(activePlaylist)} tracks.`
            : activeTab === 'Downloads'
              ? `${downloadsCount} track${downloadsCount === 1 ? '' : 's'} available offline.`
              : 'Welcome to your private music library. Stream anywhere seamlessly. Made by Jah (yours truly).'}
        </p>
      </div>

      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-base sm:text-lg font-bold truncate">
          {activePlaylist ? activePlaylist.name : activeTab}
        </h2>
        <div className="flex items-center gap-3 shrink-0">
          {canReorder && (
            <button
              onClick={onToggleReorder}
              className={`text-[11px] font-semibold px-3 py-1.5 rounded-lg transition ${
                reorderMode
                  ? (darkMode ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                              : 'bg-emerald-100 text-emerald-700 border border-emerald-300')
                  : (darkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                              : 'bg-slate-200 text-slate-700 hover:bg-slate-300')
              }`}
            >
              {reorderMode ? '✓ Done' : '↕ Reorder'}
            </button>
          )}
          <span className={`text-xs ${theme.textMuted}`}>
            {visibleSongs.length} / {fullFilteredSongs.length}
          </span>
        </div>
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
              <p className="text-xs mt-1 opacity-70">Made by Jah (yours truly).</p>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-1">
          {visibleSongs.map((song, idx) => {
            const isCurrent = currentTrackId === song.id;
            return (
              <TrackRow
                key={song.id}
                song={song}
                idx={idx}
                isCurrent={isCurrent}
                isPlaying={isPlaying}
                isFav={favoriteIds.has(song.id)}
                isDownloaded={downloadMetaIds.has(song.id)}
                downloadProgress={downloadProgress[song.id]}
                isDropdownOpen={openDropdownSongId === song.id}
                activeTab={activeTab}
                activePlaylistId={activePlaylistId}
                visibleCount={visibleSongs.length}
                progressPct={progressPct}
                reorderActive={reorderActive}
                canReorder={canReorder}
                showDownloadBtnAlways={activeTab === 'Downloads'}
                darkMode={darkMode}
                theme={theme}
                coverUrl={getCoverUrl(song)}
                playlists={playlists}
                onPlay={() => onPlay(song, fullFilteredSongs)}
                onOpenDropdown={(e) => onOpenDropdown(openDropdownSongId === song.id ? null : song.id, e)}
                onToggleFavorite={(e) => onToggleFavorite(song.id, e)}
                onDownload={(e) => onDownload(song, e)}
                onRemoveDownload={(e) => onRemoveDownload(song.id, e)}
                onRemoveFromPlaylist={(e) => onRemoveFromPlaylist(song.id, e)}
                onToggleSongInPlaylist={(playlistId, e) => onToggleSongInPlaylist(playlistId, song.id, e)}
                onMoveUp={(e) => {
                  if (activeTab === 'Downloads') onMoveDownload(song.id, 'up', e);
                  else if (activePlaylistId) onMoveTrack(activePlaylistId, song.id, 'up', e);
                }}
                onMoveDown={(e) => {
                  if (activeTab === 'Downloads') onMoveDownload(song.id, 'down', e);
                  else if (activePlaylistId) onMoveTrack(activePlaylistId, song.id, 'down', e);
                }}
                onCoverError={onCoverError}
              />
            );
          })}
        </div>
      )}

      {visibleCount < fullFilteredSongs.length && !reorderMode && (
        <div className="mt-6 text-center">
          <button onClick={onLoadMore}
            className={`px-6 py-2.5 rounded-xl font-semibold text-xs transition shadow-md inline-flex items-center gap-2 ${
              darkMode ? 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                       : 'bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200'
            }`}>
            Load More Tracks ({fullFilteredSongs.length - visibleCount} remaining)
          </button>
        </div>
      )}
    </div>
  );
}
import { Disc, Music, Heart, HardDriveDownload, Plus, Trash2, LogOut } from 'lucide-react';
import type { Playlist } from '../types';

interface Props {
  darkMode: boolean;
  theme: { textMuted: string; surface: string; border: string; hover: string };
  activeTab: string;
  activePlaylistId: string | null;
  playlists: Playlist[];
  downloadsCount: number;
  resumePlayback: boolean;
  onSelectTab: (tab: string) => void;
  onSelectPlaylist: (id: string) => void;
  onCreatePlaylist: () => void;
  onDeletePlaylist: (id: string, e: React.MouseEvent) => void;
  onToggleResume: () => void;
  onLogout: () => void;
  getPlaylistRealCount: (pl: Playlist) => number;
}

export default function SidebarNav({
  darkMode,
  theme,
  activeTab,
  activePlaylistId,
  playlists,
  downloadsCount,
  resumePlayback,
  onSelectTab,
  onSelectPlaylist,
  onCreatePlaylist,
  onDeletePlaylist,
  onToggleResume,
  onLogout,
  getPlaylistRealCount,
}: Props) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className={`px-3 mb-2 text-[10px] font-bold tracking-widest uppercase ${theme.textMuted}`}>Menu</p>
        <div className="space-y-1">
          {[
            { name: 'Discover', icon: Disc },
            { name: 'My Music', icon: Music },
            { name: 'Favourites', icon: Heart },
            { name: 'Downloads', icon: HardDriveDownload },
          ].map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.name && !activePlaylistId;
            const badge = item.name === 'Downloads' && downloadsCount > 0 ? downloadsCount : null;
            return (
              <button
                key={item.name}
                onClick={() => onSelectTab(item.name)}
                className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? (darkMode ? 'bg-blue-600 text-white shadow-md' : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-500/30')
                    : (darkMode ? 'text-slate-300 hover:bg-slate-800/60' : 'text-slate-700 hover:bg-indigo-50')
                }`}
              >
                <span className="flex items-center gap-3"><Icon className="w-4 h-4" />{item.name}</span>
                {badge !== null && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                    isActive ? 'bg-white/25 text-white' : darkMode ? 'bg-slate-800 text-slate-300' : 'bg-indigo-100 text-indigo-700'
                  }`}>{badge}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between px-3 mb-2">
          <p className={`text-[10px] font-bold tracking-widest uppercase ${theme.textMuted}`}>Playlists</p>
          <button
            onClick={onCreatePlaylist}
            className={`p-1 rounded-md transition ${darkMode ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-indigo-100 text-indigo-600'}`}
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
                onClick={() => onSelectPlaylist(pl.id)}
                className={`group w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-sm font-medium cursor-pointer transition-all ${
                  isActive
                    ? (darkMode ? 'bg-blue-600 text-white shadow-md' : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-500/30')
                    : (darkMode ? 'text-slate-300 hover:bg-slate-800/60' : 'text-slate-700 hover:bg-indigo-50')
                }`}
              >
                <span className="truncate flex-1 min-w-0">{pl.name}</span>
                <div className="flex items-center gap-1 shrink-0">
                  <span className={`text-[10px] tabular-nums w-6 text-right ${
                    isActive ? 'text-white/80' : theme.textMuted
                  }`}>{count}</span>
                  {!pl.isSystem && (
                    <button
                      onClick={(e) => onDeletePlaylist(pl.id, e)}
                      className={`p-1 rounded transition md:opacity-0 md:group-hover:opacity-100 ${
                        isActive ? 'hover:bg-white/20 text-white' : darkMode ? 'hover:text-rose-400' : 'hover:text-rose-500'
                      }`}
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

      {/* Resume playback toggle */}
      <div className={`px-3 pt-4 border-t ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}>
        <div className="flex items-center justify-between gap-3">
          <span className={`text-xs font-medium ${theme.textMuted}`}>
            Resume where I left off
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={resumePlayback}
            onClick={onToggleResume}
            className={`relative w-9 h-5 rounded-full transition-colors shrink-0 cursor-pointer ${
              resumePlayback
                ? (darkMode ? 'bg-blue-600' : 'bg-indigo-600')
                : (darkMode ? 'bg-slate-700' : 'bg-slate-300')
            }`}
          >
            <span
              className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                resumePlayback ? 'translate-x-[18px]' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>
        <p className={`text-[10px] mt-2 leading-snug ${theme.textMuted}`}>
          {resumePlayback
            ? 'Songs will resume from where you paused when you reopen the app.'
            : 'Every song starts from the beginning when you press play.'}
        </p>
      </div>

      <button
        onClick={onLogout}
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
          darkMode ? 'text-slate-400 hover:bg-slate-800/60' : 'text-slate-600 hover:bg-indigo-50'
        }`}
      >
        <LogOut className="w-4 h-4" />Log Out
      </button>
    </div>
  );
}
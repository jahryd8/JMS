import type { Song } from './types/song';
export type { Song };

export interface Playlist {
  id: string;
  name: string;
  songIds: string[];
  isSystem?: boolean;
}

export interface DownloadedTrack {
  id: string;
  song: Song;
  blob: Blob;
  downloadedAt: number;
}

export interface DownloadMeta {
  id: string;
  downloadedAt: number;
}
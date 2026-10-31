import { API_BASE } from '../constants';
import type { Song } from '../types';

export function toAbsoluteUrl(url: string | undefined): string | undefined {
  if (!url) return url;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('/')) return `${API_BASE}${url}`;
  return url;
}

export function getCoverUrl(song: Song | undefined, authToken: string | null, fallbacks: string[]): string {
  if (!song) return fallbacks[0];
  if (song.coverPath) {
    if (song.coverPath.startsWith('data:')) return song.coverPath;
    const absolute = toAbsoluteUrl(song.coverPath);
    if (!absolute) return fallbacks[0];
    const sep = absolute.includes('?') ? '&' : '?';
    return `${absolute}${sep}token=${authToken}`;
  }
  let hash = 0;
  for (let i = 0; i < song.id.length; i++) hash += song.id.charCodeAt(i);
  return fallbacks[hash % fallbacks.length];
}

export function getAudioUrl(song: Song, authToken: string | null): string {
  const absolute = toAbsoluteUrl(song.audioUrl) || '';
  const sep = absolute.includes('?') ? '&' : '?';
  return `${absolute}${sep}token=${authToken}`;
}
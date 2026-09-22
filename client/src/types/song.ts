export interface Song {
  id: string;
  index?: number;
  title: string;
  artist: string;
  album: string;
  duration: number;
  coverPath?: string;
  audioUrl: string; // Required property
}
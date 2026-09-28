export interface Song {
  id: string;
  index?: number;
  title: string;
  artist: string;
  album?: string;
  duration: number;
  /** Either an absolute R2 URL or a relative path like `/api/stream/xxx` */
  audioUrl: string;
  /** Either an absolute URL or a relative path like `/api/stream/cover/xxx` */
  coverPath?: string;
}
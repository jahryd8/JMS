import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import * as mm from 'music-metadata';

const router = Router();
const MUSIC_DIR = process.env.MUSIC_DIR || '/run/media/jahry8/JAH LINUX STORE/JaHMuSiC';

const SUPPORTED_EXTENSIONS = new Set([
  '.mp3', '.flac', '.m4a', '.wav', '.ogg', 
  '.aac', '.opus', '.wma', '.aiff', '.alac'
]);

const COVER_FILENAMES = ['cover.jpg', 'cover.png', 'folder.jpg', 'folder.png', 'album.jpg', 'art.jpg'];

let libraryCache: any[] | null = null;

// Look for folder-level artwork if no embedded artwork is found
const findFolderCover = (songFilePath: string): string | undefined => {
  const dir = path.dirname(songFilePath);
  for (const fileName of COVER_FILENAMES) {
    const candidatePath = path.join(dir, fileName);
    if (fs.existsSync(candidatePath)) {
      const relativeFolderCover = path.relative(MUSIC_DIR, candidatePath);
      const encodedPath = relativeFolderCover
        .split(path.sep)
        .map((seg) => encodeURIComponent(seg))
        .join('/');
      return `http://localhost:5000/api/library/cover/${encodedPath}`;
    }
  }
  return undefined;
};

// Safe recursive file collector
const getAudioFiles = (dir: string): string[] => {
  let results: string[] = [];

  if (!fs.existsSync(dir)) {
    console.warn(`[Library] Path missing or unmounted: ${dir}`);
    return results;
  }

  try {
    const list = fs.readdirSync(dir);
    for (const file of list) {
      if (file.startsWith('.')) continue; // Skip hidden/system files

      const filePath = path.join(dir, file);
      try {
        const stat = fs.statSync(filePath);
        if (stat && stat.isDirectory()) {
          results = results.concat(getAudioFiles(filePath));
        } else {
          const ext = path.extname(file).toLowerCase();
          if (SUPPORTED_EXTENSIONS.has(ext)) {
            results.push(filePath);
          }
        }
      } catch (e) {
        // Safe catch for locked or unreadable files
      }
    }
  } catch (err) {
    console.error(`[Library] Error reading folder ${dir}:`, err);
  }
  return results;
};

// Full library scan + metadata & picture extraction
const scanLibrary = async () => {
  console.log(`[Library] Starting scan on: ${MUSIC_DIR}`);
  const allFilePaths = getAudioFiles(MUSIC_DIR);
  console.log(`[Library] Found ${allFilePaths.length} audio candidates.`);

  const songs = await Promise.all(
    allFilePaths.map(async (filePath, idx) => {
      const relativePath = path.relative(MUSIC_DIR, filePath);
      const encodedRelativePath = relativePath
        .split(path.sep)
        .map((segment) => encodeURIComponent(segment))
        .join('/');

      const baseId = Buffer.from(relativePath).toString('base64url');
      const fallbackTitle = path.basename(filePath, path.extname(filePath));

      try {
        // Full parse without options so pictures are extracted properly
        const metadata = await mm.parseFile(filePath);
        const { common, format } = metadata;

        let coverPath: string | undefined = undefined;

        // 1. Embedded picture extraction (matching original library.ts logic)
        if (common.picture && common.picture.length > 0) {
          const pic = common.picture[0];
          const base64 = Buffer.from(pic.data).toString('base64');
          const mimeFormat = pic.format.includes('/') ? pic.format : `image/${pic.format}`;
          coverPath = `data:${mimeFormat};base64,${base64}`;
        }

        // 2. Folder-level cover artwork fallback
        if (!coverPath) {
          coverPath = findFolderCover(filePath);
        }

        return {
          id: baseId,
          index: idx,
          title: common.title || fallbackTitle,
          artist: common.artist || 'Unknown Artist',
          album: common.album || 'Unknown Album',
          duration: Math.round(format.duration || 0),
          coverPath,
          audioUrl: `http://localhost:5000/api/stream/${encodedRelativePath}`
        };
      } catch (err) {
        console.warn(`[Library] Metadata failed for "${relativePath}", loading fallback.`);
        return {
          id: baseId,
          index: idx,
          title: fallbackTitle,
          artist: 'Unknown Artist',
          album: 'Unknown Album',
          duration: 0,
          coverPath: findFolderCover(filePath),
          audioUrl: `http://localhost:5000/api/stream/${encodedRelativePath}`
        };
      }
    })
  );

  libraryCache = songs;
  return songs;
};

// GET /api/library/songs
router.get('/songs', async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.max(1, parseInt(req.query.limit as string) || 10);
    const searchQuery = ((req.query.search as string) || '').toLowerCase().trim();

    if (!libraryCache) {
      await scanLibrary();
    }

    let allSongs = libraryCache || [];

    if (searchQuery) {
      allSongs = allSongs.filter(
        (song) =>
          song.title.toLowerCase().includes(searchQuery) ||
          song.artist.toLowerCase().includes(searchQuery) ||
          song.album.toLowerCase().includes(searchQuery)
      );
    }

    const startIndex = (page - 1) * limit;
    const paginatedSongs = allSongs.slice(startIndex, startIndex + limit);

    res.json({
      page,
      limit,
      totalTracks: allSongs.length,
      hasMore: startIndex + limit < allSongs.length,
      songs: paginatedSongs
    });
  } catch (error) {
    console.error('[Library] Scan error:', error);
    res.status(500).json({ error: 'Failed to fetch library' });
  }
});

// GET /api/library/cover/* (Serves folder-level cover images)
router.get('/cover/*splat', (req: Request, res: Response) => {
  const rawSplat = Array.isArray(req.params.splat)
    ? req.params.splat.join('/')
    : req.params.splat || '';

  const relativePath = decodeURIComponent(rawSplat);
  const filePath = path.resolve(MUSIC_DIR, relativePath);

  if (!filePath.startsWith(path.resolve(MUSIC_DIR)) || !fs.existsSync(filePath)) {
    return res.status(404).send('Cover not found');
  }

  res.sendFile(filePath);
});

// POST /api/library/refresh (Manual Rescan)
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    console.log('[Library] Manual rescan triggered.');
    const refreshedSongs = await scanLibrary();
    res.json({ 
      message: 'Library refreshed successfully', 
      totalTracks: refreshedSongs.length 
    });
  } catch (error) {
    console.error('[Library] Rescan failed:', error);
    res.status(500).json({ error: 'Failed to refresh library' });
  }
});

export default router;
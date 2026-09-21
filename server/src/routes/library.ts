import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import * as parseMusic from 'music-metadata';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// Supported audio extensions
const AUDIO_EXTENSIONS = new Set(['.mp3', '.flac', '.m4a', '.wav', '.ogg']);

function getAudioFiles(dirPath: string, fileList: string[] = []): string[] {
  if (!fs.existsSync(dirPath)) return fileList;
  const files = fs.readdirSync(dirPath);

  for (const file of files) {
    const fullPath = path.join(dirPath, file);
    try {
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        getAudioFiles(fullPath, fileList);
      } else if (AUDIO_EXTENSIONS.has(path.extname(file).toLowerCase())) {
        fileList.push(fullPath);
      }
    } catch {
      // Skip unreadable files or broken symlinks
    }
  }
  return fileList;
}

router.post('/scan', async (req: Request, res: Response) => {
  const { directoryPath } = req.body;

  if (!directoryPath || typeof directoryPath !== 'string') {
    res.status(400).json({ error: 'Valid directoryPath required' });
    return;
  }

  try {
    const files = getAudioFiles(directoryPath);
    let addedCount = 0;

    for (const filePath of files) {
      // Check if song already exists in DB
      const existing = await prisma.song.findUnique({ where: { filePath } });
      if (existing) continue;

      try {
        const metadata = await parseMusic.parseFile(filePath);
        const title = metadata.common.title || path.basename(filePath, path.extname(filePath));
        const artist = metadata.common.artist || 'Unknown Artist';
        const album = metadata.common.album || 'Unknown Album';
        const duration = Math.round(metadata.format.duration || 0);

        await prisma.song.create({
          data: {
            title,
            artist,
            album,
            duration,
            filePath,
          },
        });
        addedCount++;
      } catch (e) {
        console.error(`Failed to parse metadata for ${filePath}:`, e);
      }
    }

    res.json({ message: 'Scan complete', totalFound: files.length, newAdded: addedCount });
  } catch (err) {
    console.error('Library scan error:', err);
    res.status(500).json({ error: 'Failed to scan library' });
  }
});

// Fetch all tracks for front-end Discover page
router.get('/songs', async (_req: Request, res: Response) => {
  try {
    const songs = await prisma.song.findMany({
      orderBy: { createdAt: 'desc' },
    });
    res.json(songs);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch songs' });
  }
});

export default router;
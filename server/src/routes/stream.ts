import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// Explicitly type the route params to avoid type collisions
interface StreamParams {
  songId: string;
}

router.get('/:songId', async (req: Request<StreamParams>, res: Response) => {
  const songId = req.params.songId;

  if (!songId || typeof songId !== 'string') {
    res.status(400).json({ error: 'Invalid song ID' });
    return;
  }

  try {
    const song = await prisma.song.findUnique({
      where: { id: songId },
    });

    if (!song || !fs.existsSync(song.filePath)) {
      res.status(404).json({ error: 'Audio file not found' });
      return;
    }

    const filePath = song.filePath;
    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
      // Byte Range Streaming (HTTP 206)
      const parts = range.replace(/bytes=/, '').split('-');
      const start = Number.parseInt(parts[0], 10);
      const end = parts[1] ? Number.parseInt(parts[1], 10) : fileSize - 1;

      const chunksize = end - start + 1;
      const file = fs.createReadStream(filePath, { start, end });

      const head = {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': 'audio/mpeg',
      };

      res.writeHead(206, head);
      file.pipe(res);
    } else {
      const head = {
        'Content-Length': fileSize,
        'Content-Type': 'audio/mpeg',
      };
      res.writeHead(200, head);
      fs.createReadStream(filePath).pipe(res);
    }
  } catch (err) {
    console.error('Stream error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
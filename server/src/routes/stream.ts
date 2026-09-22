import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';

const router = Router();
const MUSIC_DIR = process.env.MUSIC_DIR || '/run/media/jahry8/JAH LINUX STORE/JaHMuSiC';

// Helper for dynamic audio content types
const getContentType = (filePath: string): string => {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.flac': return 'audio/flac';
    case '.m4a': return 'audio/mp4';
    case '.ogg': return 'audio/ogg';
    case '.wav': return 'audio/wav';
    case '.aac': return 'audio/aac';
    case '.mp3':
    default: return 'audio/mpeg';
  }
};

// GET /api/stream/* (Express 5 wildcard syntax)
router.get('/*splat', (req: Request, res: Response) => {
  const rawSplat = Array.isArray(req.params.splat)
    ? req.params.splat.join('/')
    : req.params.splat || '';

  const relativePath = decodeURIComponent(rawSplat);
  const filePath = path.resolve(MUSIC_DIR, relativePath);

  // Security check: prevent directory traversal outside MUSIC_DIR
  if (!filePath.startsWith(path.resolve(MUSIC_DIR))) {
    return res.status(403).send('Access Denied');
  }

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    return res.status(404).send('Audio file not found');
  }

  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const range = req.headers.range;
  const contentType = getContentType(filePath);

  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunksize = end - start + 1;
    const file = fs.createReadStream(filePath, { start, end });

    const head = {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': contentType,
    };

    res.writeHead(206, head);
    file.pipe(res);
  } else {
    const head = {
      'Content-Length': fileSize,
      'Content-Type': contentType,
    };
    res.writeHead(200, head);
    fs.createReadStream(filePath).pipe(res);
  }
});

export default router;
import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || '';

// ============================================================
// GET /api/stream/cover/:songId — proxy cover art
// MUST be registered BEFORE /:songId so Express matches it first
// ============================================================
router.get('/cover/:songId', async (req: Request, res: Response) => {
  try {
    const rawSongId = req.params.songId;
    const songId = Array.isArray(rawSongId) ? rawSongId[0] : rawSongId;

    const song = await prisma.song.findUnique({ where: { id: songId } });
    if (!song || !song.coverKey) {
      return res.status(404).json({ error: 'Cover not found' });
    }

    const r2Url = `${R2_PUBLIC_URL}/${song.coverKey}`;
    const upstream = await fetch(r2Url);
    if (!upstream.ok) return res.status(upstream.status).end();

    // Normalize content type — some MP3s embed art as BMP/WEBP which
    // some browsers reject. Fall back to image/jpeg if not a safe image type.
    const rawType = upstream.headers.get('content-type') || 'image/jpeg';
    const safeType = /^image\/(jpeg|jpg|png|webp|gif)/i.test(rawType)
      ? rawType
      : 'image/jpeg';

    res.setHeader('Content-Type', safeType);
    res.setHeader('Cache-Control', 'public, max-age=86400, immutable');
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');

    if (!upstream.body) return res.end();
    const reader = upstream.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) res.write(Buffer.from(value));
    }
    res.end();
  } catch (error) {
    console.error('[Stream] Cover proxy error:', error);
    if (!res.headersSent) res.status(500).json({ error: 'Cover stream failed' });
    else res.end();
  }
});

// ============================================================
// GET /api/stream/:songId — proxy the R2 audio file
// Registered AFTER /cover/:songId
// ============================================================
router.get('/:songId', async (req: Request, res: Response) => {
  try {
    const rawSongId = req.params.songId;
    const songId = Array.isArray(rawSongId) ? rawSongId[0] : rawSongId;
    if (!songId) return res.status(400).json({ error: 'Song ID is required' });

    const song = await prisma.song.findUnique({ where: { id: songId } });
    if (!song) return res.status(404).json({ error: 'Song not found' });

    const r2Url = `${R2_PUBLIC_URL}/${song.fileKey}`;

    const upstreamHeaders: Record<string, string> = {};
    if (req.headers.range) {
      upstreamHeaders['Range'] = req.headers.range;
    }

    const upstream = await fetch(r2Url, { headers: upstreamHeaders });

    if (!upstream.ok && upstream.status !== 206) {
      console.error('[Stream] Upstream returned', upstream.status, 'for', r2Url);
      return res.status(upstream.status).json({ error: 'Upstream fetch failed' });
    }

    res.status(upstream.status);
    const forward = [
      'content-type',
      'content-length',
      'content-range',
      'accept-ranges',
      'etag',
      'last-modified',
      'cache-control',
    ];
    for (const h of forward) {
      const v = upstream.headers.get(h);
      if (v) res.setHeader(h, v);
    }
    if (!upstream.headers.get('content-type')) {
      res.setHeader('Content-Type', 'audio/mpeg');
    }
    if (!upstream.headers.get('accept-ranges')) {
      res.setHeader('Accept-Ranges', 'bytes');
    }
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');

    if (!upstream.body) return res.end();
    const reader = upstream.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) res.write(Buffer.from(value));
    }
    res.end();
  } catch (error) {
    console.error('[Stream] Audio proxy error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Stream failed' });
    } else {
      res.end();
    }
  }
});

export default router;
import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || '';

// GET /api/library/songs
router.get('/songs', async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.max(1, parseInt(req.query.limit as string) || 20);
    const searchQuery = ((req.query.search as string) || '').toLowerCase().trim();

    const whereCondition = searchQuery
      ? {
          OR: [
            { title: { contains: searchQuery, mode: 'insensitive' as const } },
            { artist: { contains: searchQuery, mode: 'insensitive' as const } },
            { album: { contains: searchQuery, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [totalTracks, songs] = await Promise.all([
      prisma.song.count({ where: whereCondition }),
      prisma.song.findMany({
        where: whereCondition,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { title: 'asc' },
      }),
    ]);

    const formattedSongs = songs.map((song, idx) => ({
      id: song.id,
      index: (page - 1) * limit + idx,
      title: song.title,
      artist: song.artist,
      album: song.album || 'Unknown Album',
      duration: song.duration || 0,
      // Cover served through the same stream proxy (protected)
      coverPath: song.coverKey ? `/api/stream/cover/${song.id}` : undefined,
      // Audio served through the stream proxy so auth works
      audioUrl: `/api/stream/${song.id}`,
    }));

    res.json({
      page,
      limit,
      totalTracks,
      hasMore: (page - 1) * limit + songs.length < totalTracks,
      songs: formattedSongs,
    });
  } catch (error) {
    console.error('[Library] Database fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch library from database' });
  }
});

export default router;
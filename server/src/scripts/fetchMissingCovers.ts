// server/src/scripts/fetchMissingCovers.ts
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const prisma = new PrismaClient();

const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },
});

const BUCKET = process.env.R2_BUCKET_NAME || '';

// Throttle helper
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface ITunesResult {
  artworkUrl100?: string;
  artistName?: string;
  trackName?: string;
  collectionName?: string;
}

async function searchItunes(artist: string, title: string): Promise<string | null> {
  const q = encodeURIComponent(`${artist} ${title}`);
  const url = `https://itunes.apple.com/search?term=${q}&media=music&entity=song&limit=1`;

  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = (await res.json()) as { results?: ITunesResult[] };
    const first = data.results?.[0];
    if (!first?.artworkUrl100) return null;

    // Upgrade to high-res artwork
    return first.artworkUrl100.replace('100x100bb', '600x600bb');
  } catch (err) {
    console.warn(`[iTunes] Search failed for "${artist} - ${title}":`, (err as Error).message);
    return null;
  }
}

async function downloadImage(url: string): Promise<{ buffer: Buffer; contentType: string } | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const contentType = res.headers.get('content-type') || 'image/jpeg';
    const arrayBuffer = await res.arrayBuffer();
    return { buffer: Buffer.from(arrayBuffer), contentType };
  } catch (err) {
    console.warn(`[iTunes] Image download failed:`, (err as Error).message);
    return null;
  }
}

async function uploadCover(key: string, buffer: Buffer, contentType: string) {
  await r2Client.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    })
  );
}

async function fetchMissingCovers() {
  console.log('[Cover Backfill] Starting...');

  // Find all songs without a coverKey
  const songs = await prisma.song.findMany({
    where: { coverKey: null },
    orderBy: { title: 'asc' },
  });

  console.log(`[Cover Backfill] Found ${songs.length} songs missing covers`);

  let found = 0;
  let missed = 0;
  let errored = 0;

  for (let i = 0; i < songs.length; i++) {
    const song = songs[i];
    const progress = `[${i + 1}/${songs.length}]`;

    // Skip junk artist strings
    if (!song.artist || song.artist === 'Unknown Artist' || !song.title) {
      missed++;
      continue;
    }

    try {
      const artworkUrl = await searchItunes(song.artist, song.title);

      if (!artworkUrl) {
        console.log(`${progress} ✗ No match: ${song.artist} - ${song.title}`);
        missed++;
        await sleep(300);
        continue;
      }

      const image = await downloadImage(artworkUrl);
      if (!image) {
        console.log(`${progress} ✗ Download failed: ${song.artist} - ${song.title}`);
        errored++;
        await sleep(300);
        continue;
      }

      const baseName = path
        .basename(song.fileKey)
        .replace(/\.[^/.]+$/, '');
      const coverKey = `covers/${baseName}.jpg`;

      await uploadCover(coverKey, image.buffer, image.contentType);

      await prisma.song.update({
        where: { id: song.id },
        data: { coverKey },
      });

      console.log(`${progress} ✓ ${song.artist} - ${song.title}`);
      found++;

      // Be polite to Apple's API — 200ms between requests
      await sleep(200);
    } catch (err) {
      console.warn(`${progress} ! Error on ${song.artist} - ${song.title}:`, (err as Error).message);
      errored++;
      await sleep(500);
    }

    if ((i + 1) % 25 === 0) {
      console.log(
        `[Cover Backfill] Progress: ${i + 1}/${songs.length} — ${found} found, ${missed} missed, ${errored} errored`
      );
    }
  }

  console.log(
    `\n[Cover Backfill] Done. ${found} covers added, ${missed} no match, ${errored} errors.`
  );
  console.log(`[Cover Backfill] Success rate: ${((found / songs.length) * 100).toFixed(1)}%`);

  await prisma.$disconnect();
}

fetchMissingCovers();
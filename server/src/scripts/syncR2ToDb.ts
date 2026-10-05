import {
  S3Client,
  ListObjectsV2Command,
  GetObjectCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { parseFile } from 'music-metadata';

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
const TMP_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'jms-sync-'));

// ---------------------------------------------------------------
// Filter out trash, hidden files, and non-MP3s
// ---------------------------------------------------------------
function isJunkKey(key: string): boolean {
  const lower = key.toLowerCase();
  if (lower.includes('/.trash-')) return true;
  if (lower.includes('/.')) return true;
  if (lower.includes('/._')) return true;
  if (lower.endsWith('/.ds_store')) return true;
  if (!lower.endsWith('.mp3')) return true;
  return false;
}

// ---------------------------------------------------------------
// R2 helpers
// ---------------------------------------------------------------
async function fetchR2Object(key: string): Promise<Buffer> {
  const res = await r2Client.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
  if (!res.Body) throw new Error('Empty body for ' + key);
  const chunks: Uint8Array[] = [];
  const stream = res.Body as any;
  for await (const chunk of stream) chunks.push(chunk as Uint8Array);
  return Buffer.concat(chunks);
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

// ---------------------------------------------------------------
// Filename fallback for untagged MP3s
// ---------------------------------------------------------------
function parseFilename(key: string) {
  const base = path.basename(key).replace(/\.[^/.]+$/, '');
  if (base.includes(' - ')) {
    const parts = base.split(' - ');
    return { artist: parts[0].trim(), title: parts.slice(1).join(' - ').trim() };
  }
  return { artist: 'Unknown Artist', title: base };
}

// ---------------------------------------------------------------
// Main sync
// ---------------------------------------------------------------
async function syncR2ToDatabase() {
  console.log('[R2 Sync] Connecting to bucket:', BUCKET);
  console.log('[R2 Sync] Temp dir:', TMP_DIR);

  try {
    // -----------------------------------------------------------
    // 1. List everything under songs/ in R2
    // -----------------------------------------------------------
    const command = new ListObjectsV2Command({ Bucket: BUCKET, Prefix: 'songs/' });
    const response = await r2Client.send(command);
    const allObjects = response.Contents || [];

    const validObjects = allObjects.filter((obj) => obj.Key && !isJunkKey(obj.Key));
    const skippedJunk = allObjects.length - validObjects.length;

    console.log(
      `[R2 Sync] Found ${allObjects.length} objects, ${validObjects.length} valid MP3s (${skippedJunk} junk skipped)`
    );

    // -----------------------------------------------------------
    // 2. Load current DB state so we can skip and diff
    // -----------------------------------------------------------
    const dbSongs = await prisma.song.findMany({
      select: { id: true, fileKey: true, coverKey: true },
    });
    const dbByKey = new Map(dbSongs.map((s) => [s.fileKey, s]));

    // -----------------------------------------------------------
    // 3. Determine which R2 keys are new vs. already indexed
    // -----------------------------------------------------------
    const r2Keys = new Set(validObjects.map((o) => o.Key!).filter(Boolean));
    const newKeys = validObjects.filter((o) => o.Key && !dbByKey.has(o.Key));
    const existingCount = validObjects.length - newKeys.length;

    console.log(
      `[R2 Sync] ${existingCount} songs already in DB, ${newKeys.length} new songs to process`
    );

    // -----------------------------------------------------------
    // 4. Process new songs only
    // -----------------------------------------------------------
    let syncCount = 0;
    let coverCount = 0;
    let errorCount = 0;

    for (const obj of newKeys) {
      if (!obj.Key) continue;
      const fileKey = obj.Key;
      const { artist: fallbackArtist, title: fallbackTitle } = parseFilename(fileKey);

      let title = fallbackTitle;
      let artist = fallbackArtist;
      let album: string | null = null;
      let duration = 0;
      let coverKey: string | null = null;

      const tmpFile = path.join(
        TMP_DIR,
        `${Date.now()}-${Math.random().toString(36).slice(2)}.mp3`
      );

      try {
        const buffer = await fetchR2Object(fileKey);
        fs.writeFileSync(tmpFile, buffer);

        const metadata = await parseFile(tmpFile, { duration: true });
        const common = metadata.common || {};
        const format = metadata.format || {};

        if (common.title) title = common.title;
        if (common.artist) artist = common.artist;
        if (common.album) album = common.album;
        if (typeof format.duration === 'number') duration = Math.round(format.duration);

        const pictures = common.picture;
        if (pictures && pictures.length > 0) {
          const pic = pictures[0];
          const ext = pic.format.includes('png') ? 'png' : 'jpg';
          const contentType = pic.format || 'image/jpeg';
          const coverObjectKey = `covers/${path
            .basename(fileKey)
            .replace(/\.[^/.]+$/, '')}.${ext}`;

          await uploadCover(coverObjectKey, Buffer.from(pic.data), contentType);
          coverKey = coverObjectKey;
          coverCount++;
        }
      } catch (err) {
        console.warn(`[R2 Sync] Parse failed for ${fileKey}:`, (err as Error).message);
        errorCount++;
      } finally {
        try { fs.unlinkSync(tmpFile); } catch { /* ignore */ }
      }

      await prisma.song.upsert({
        where: { fileKey },
        update: { title, artist, album, duration, coverKey },
        create: { fileKey, title, artist, album, duration, coverKey },
      });

      syncCount++;
      console.log(`[R2 Sync] + Added: ${artist} — ${title}`);
    }

    // -----------------------------------------------------------
    // 5. Remove orphans — DB rows whose R2 object is gone
    // -----------------------------------------------------------
    const orphans = dbSongs.filter((s) => !r2Keys.has(s.fileKey));

    if (orphans.length > 0) {
      console.log(`[R2 Sync] Removing ${orphans.length} orphaned rows (deleted from R2):`);
      for (const o of orphans) {
        console.log(`[R2 Sync] - Removing: ${o.fileKey}`);
      }
      await prisma.song.deleteMany({
        where: { id: { in: orphans.map((o) => o.id) } },
      });
    }

    // -----------------------------------------------------------
    // 6. Summary
    // -----------------------------------------------------------
    console.log('');
    console.log('════════════════════════════════════════════════');
    console.log('[R2 Sync] Complete');
    console.log(`[R2 Sync]   New songs added:   ${syncCount}`);
    console.log(`[R2 Sync]   Covers extracted:  ${coverCount}`);
    console.log(`[R2 Sync]   Orphans removed:   ${orphans.length}`);
    console.log(`[R2 Sync]   Parse errors:      ${errorCount}`);
    console.log(`[R2 Sync]   Unchanged (skipped): ${existingCount}`);
    console.log('════════════════════════════════════════════════');
  } catch (error) {
    console.error('[R2 Sync] Fatal error:', error);
  } finally {
    try { fs.rmSync(TMP_DIR, { recursive: true, force: true }); } catch { /* ignore */ }
    await prisma.$disconnect();
  }
}

syncR2ToDatabase();
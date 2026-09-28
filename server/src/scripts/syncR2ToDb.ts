import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';

// Load .env relative to server root
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

async function syncR2ToDatabase() {
  console.log('[R2 Sync] Connecting to Cloudflare R2 bucket:', process.env.R2_BUCKET_NAME);

  try {
    const command = new ListObjectsV2Command({
      Bucket: process.env.R2_BUCKET_NAME,
      Prefix: 'songs/',
    });

    const response = await r2Client.send(command);
    const objects = response.Contents || [];

    console.log(`[R2 Sync] Found ${objects.length} files in R2. Syncing to Neon PostgreSQL...`);

    let syncCount = 0;

    for (const obj of objects) {
      if (!obj.Key || obj.Key.endsWith('/')) continue;

      const relativePath = obj.Key.replace(/^songs\//, '');
      const rawFileName = path.basename(relativePath);
      const cleanName = rawFileName.replace(/\.[^/.]+$/, '');

      let artist = 'Unknown Artist';
      let title = cleanName;

      if (cleanName.includes(' - ')) {
        const parts = cleanName.split(' - ');
        artist = parts[0].trim();
        title = parts.slice(1).join(' - ').trim();
      }

      await prisma.song.upsert({
        where: { fileKey: obj.Key },     // ← was filePath
        update: {
          title,
          artist,
        },
        create: {
          fileKey: obj.Key,               // ← was filePath
          title,
          artist,
          duration: 0,
        },
      });

      syncCount++;
    }

    console.log(`[R2 Sync] Complete! Successfully indexed ${syncCount} songs into Neon DB.`);
  } catch (error) {
    console.error('[R2 Sync] Error syncing files:', error);
  } finally {
    await prisma.$disconnect();
  }
}

syncR2ToDatabase();
/*
  Warnings:

  - You are about to drop the column `coverPath` on the `Song` table. All the data in the column will be lost.
  - You are about to drop the column `filePath` on the `Song` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[fileKey]` on the table `Song` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `fileKey` to the `Song` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Song_filePath_key";

-- AlterTable
ALTER TABLE "Song" DROP COLUMN "coverPath",
DROP COLUMN "filePath",
ADD COLUMN     "coverKey" TEXT,
ADD COLUMN     "fileKey" TEXT NOT NULL,
ALTER COLUMN "duration" SET DEFAULT 0;

-- CreateIndex
CREATE UNIQUE INDEX "Song_fileKey_key" ON "Song"("fileKey");

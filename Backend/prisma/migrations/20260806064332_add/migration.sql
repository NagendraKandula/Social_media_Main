/*
  Warnings:

  - A unique constraint covering the columns `[mediaId,platform,placement]` on the table `MediaEdit` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "public"."MediaEdit_mediaId_platform_key";

-- AlterTable
ALTER TABLE "MediaEdit" ADD COLUMN     "rotation" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- CreateIndex
CREATE UNIQUE INDEX "MediaEdit_mediaId_platform_placement_key" ON "MediaEdit"("mediaId", "platform", "placement");

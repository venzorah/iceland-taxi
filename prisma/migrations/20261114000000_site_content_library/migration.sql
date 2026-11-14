BEGIN;
CREATE TABLE "MediaAsset" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "mime" TEXT NOT NULL,
  "alt" TEXT NOT NULL DEFAULT '',
  "url" TEXT NOT NULL,
  "publicId" TEXT NOT NULL,
  "bytes" INTEGER NOT NULL,
  "archived" BOOLEAN NOT NULL DEFAULT false,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MediaAsset_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "MediaAsset_publicId_key" ON "MediaAsset"("publicId");
CREATE TABLE "SiteBlock" (
  "key" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SiteBlock_pkey" PRIMARY KEY ("key")
);
COMMIT;

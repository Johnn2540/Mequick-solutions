-- Category gains a real multi-image gallery (CategoryImage, mirroring
-- ProductImage), replacing the single image/imagePublicId pair. Existing
-- image data is migrated into the new table BEFORE the old columns are
-- dropped, so no category loses its picture.

-- CreateTable
CREATE TABLE "category_images" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "publicId" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "category_images_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "category_images" ADD CONSTRAINT "category_images_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "category_images_categoryId_idx" ON "category_images"("categoryId");

-- Migrate existing single-image data into the new table. gen_random_uuid()
-- is a Postgres 13+ builtin (no extension required) — migrated rows don't
-- need to be cuid-formatted, Prisma has no requirement that existing rows
-- match its client-side id generation scheme.
INSERT INTO "category_images" ("id", "categoryId", "url", "publicId", "isPrimary", "createdAt")
SELECT gen_random_uuid()::text, "id", "image", "imagePublicId", true, CURRENT_TIMESTAMP
FROM "categories"
WHERE "image" IS NOT NULL;

-- AlterTable
ALTER TABLE "categories" DROP COLUMN "image";
ALTER TABLE "categories" DROP COLUMN "imagePublicId";

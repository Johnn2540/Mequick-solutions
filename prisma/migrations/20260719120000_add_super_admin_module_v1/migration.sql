-- Super Admin module expansion (additive to the live schema).
--
-- NOTE ON QuoteStatus: this migration DROPS and recreates the QuoteStatus
-- enum rather than additively extending it. That is only safe because
-- quote_requests had zero rows at the time this migration was written.
-- The apply script (scripts/apply-super-admin-migration.js) re-checks the
-- row count immediately before running this file and aborts if it is no
-- longer zero. Do not run this SQL by hand without the same guard.

-- AlterEnum (additive — safe regardless of existing data)
ALTER TYPE "Role" ADD VALUE 'SALES_STAFF';
ALTER TYPE "Role" ADD VALUE 'INVENTORY_MANAGER';
ALTER TYPE "Role" ADD VALUE 'CONTENT_MANAGER';

-- AlterEnum (destructive — guarded by the apply script's zero-row check)
-- The column must be cast off the enum type entirely before DROP TYPE will
-- succeed — dropping the DEFAULT alone still leaves the column's declared
-- type pointing at "QuoteStatus", which Postgres refuses to drop out from
-- under it ("cannot drop type ... because other objects depend on it").
ALTER TABLE "quote_requests" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "quote_requests" ALTER COLUMN "status" TYPE TEXT USING ("status"::text);
DROP TYPE "QuoteStatus";
CREATE TYPE "QuoteStatus" AS ENUM ('NEW', 'PENDING', 'QUOTATION_SENT', 'APPROVED', 'DECLINED', 'CLOSED');
ALTER TABLE "quote_requests" ALTER COLUMN "status" TYPE "QuoteStatus" USING ("status"::"QuoteStatus");
ALTER TABLE "quote_requests" ALTER COLUMN "status" SET DEFAULT 'NEW';

-- AlterTable
ALTER TABLE "products" ADD COLUMN "stockQuantity" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "products" ADD COLUMN "lowStockThreshold" INTEGER NOT NULL DEFAULT 5;

-- CreateTable
CREATE TABLE "customers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "hospital" TEXT,
    "company" TEXT,
    "address" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "customers_email_idx" ON "customers"("email");
CREATE INDEX "customers_phone_idx" ON "customers"("phone");

-- AlterTable (QuoteRequest gains customer + staff-assignment links)
ALTER TABLE "quote_requests" ADD COLUMN "customerId" TEXT;
ALTER TABLE "quote_requests" ADD COLUMN "assignedToId" TEXT;

ALTER TABLE "quote_requests" ADD CONSTRAINT "quote_requests_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "quote_requests" ADD CONSTRAINT "quote_requests_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "quote_requests_customerId_idx" ON "quote_requests"("customerId");
CREATE INDEX "quote_requests_assignedToId_idx" ON "quote_requests"("assignedToId");

-- CreateTable
CREATE TABLE "inventory_logs" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "userId" TEXT,
    "changeType" TEXT NOT NULL,
    "quantityChange" INTEGER NOT NULL,
    "quantityAfter" INTEGER NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_logs_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "inventory_logs" ADD CONSTRAINT "inventory_logs_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "inventory_logs" ADD CONSTRAINT "inventory_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "inventory_logs_productId_idx" ON "inventory_logs"("productId");
CREATE INDEX "inventory_logs_userId_idx" ON "inventory_logs"("userId");
CREATE INDEX "inventory_logs_createdAt_idx" ON "inventory_logs"("createdAt");

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "link" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "notifications_userId_idx" ON "notifications"("userId");
CREATE INDEX "notifications_isRead_idx" ON "notifications"("isRead");

-- CreateTable
CREATE TABLE "system_settings" (
    "id" TEXT NOT NULL DEFAULT 'main',
    "companyName" TEXT NOT NULL DEFAULT 'Mequick Solutions',
    "logoUrl" TEXT,
    "logoPublicId" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "whatsapp" TEXT,
    "address" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'KES',
    "timezone" TEXT NOT NULL DEFAULT 'Africa/Nairobi',
    "smtpHost" TEXT,
    "smtpPort" INTEGER,
    "smtpUser" TEXT,
    "smtpPassword" TEXT,
    "smtpFromEmail" TEXT,
    "smtpFromName" TEXT,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "googleAnalyticsId" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "about_content" (
    "id" TEXT NOT NULL DEFAULT 'main',
    "heading" TEXT,
    "storyText" TEXT,
    "missionText" TEXT,
    "visionText" TEXT,
    "imageUrl" TEXT,
    "imagePublicId" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "about_content_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "testimonials" (
    "id" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerTitle" TEXT,
    "photoUrl" TEXT,
    "photoPublicId" TEXT,
    "quote" TEXT NOT NULL,
    "rating" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "testimonials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partners" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "logoUrl" TEXT NOT NULL,
    "logoPublicId" TEXT,
    "websiteUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "partners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "faqs" (
    "id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "category" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "faqs_pkey" PRIMARY KEY ("id")
);

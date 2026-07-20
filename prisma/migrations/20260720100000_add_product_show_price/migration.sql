-- Product gains `showPrice` (defaults to false/hidden) — B2B medical
-- equipment pricing is quotation-based, so the public site should hide
-- price and push "Request Quote" unless an admin explicitly opts a
-- specific product in. Existing rows backfill to the same default: no
-- product's price becomes newly visible on the public site by surprise
-- when this ships.

-- AlterTable
ALTER TABLE "products" ADD COLUMN "showPrice" BOOLEAN NOT NULL DEFAULT false;

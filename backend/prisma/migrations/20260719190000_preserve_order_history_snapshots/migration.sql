-- Keep optional per-item notes used by the API and UI.
ALTER TABLE "OrderItem" ADD COLUMN IF NOT EXISTS "note" TEXT;

-- Backfill snapshots for every order item whose product still exists.
-- Existing non-empty historical values are never overwritten.
UPDATE "OrderItem" AS oi
SET
  "productName" = CASE
    WHEN COALESCE(oi."productName", '') = '' THEN p."name"
    ELSE oi."productName"
  END,
  "productImageUrl" = CASE
    WHEN oi."productImageUrl" IS NULL THEN p."imageUrl"
    ELSE oi."productImageUrl"
  END
FROM "Product" AS p
WHERE oi."productId" = p."id";

-- Rename product partial stock column to reflect its real meaning
ALTER TABLE "Product" RENAME COLUMN "quantityBonus" TO "quantityPartial";

-- Preserve both whole and partial quantities and unit metadata on order items
ALTER TABLE "OrderItem"
  ADD COLUMN "wholeQuantity" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "partialQuantity" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "wholeUnitType" TEXT,
  ADD COLUMN "partialUnitType" TEXT,
  ADD COLUMN "countPerUnit" INTEGER NOT NULL DEFAULT 1;

-- Existing orders used quantity as whole quantity
UPDATE "OrderItem" SET "wholeQuantity" = "quantity" WHERE "wholeQuantity" = 0;

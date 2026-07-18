-- DropIndex
DROP INDEX "Product_unitType_idx";

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "nameNormalized" TEXT;

-- CreateIndex
CREATE INDEX "Product_nameNormalized_idx" ON "Product"("nameNormalized");

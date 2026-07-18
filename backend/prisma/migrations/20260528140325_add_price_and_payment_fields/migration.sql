/*
  Warnings:

  - You are about to drop the column `createdAt` on the `Product` table. All the data in the column will be lost.
  - Added the required column `unitPrice` to the `OrderItem` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('UNPAID', 'PARTIAL', 'PAID');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "paidAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'UNPAID',
ADD COLUMN     "totalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "unitPrice" DOUBLE PRECISION NOT NULL;

-- AlterTable
ALTER TABLE "Product" DROP COLUMN "createdAt",
ADD COLUMN     "price" DOUBLE PRECISION,
ALTER COLUMN "subUnitType" DROP NOT NULL,
ALTER COLUMN "quantityBonus" DROP DEFAULT;

-- CreateIndex
CREATE INDEX "Product_batchId_idx" ON "Product"("batchId");

-- CreateIndex
CREATE INDEX "UploadBatch_uploadedAt_idx" ON "UploadBatch"("uploadedAt");

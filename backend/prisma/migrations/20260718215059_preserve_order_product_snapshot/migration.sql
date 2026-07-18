/*
  Warnings:

  - You are about to drop the column `imageUrl` on the `OrderItem` table. All the data in the column will be lost.
  - You are about to drop the column `note` on the `OrderItem` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "OrderItem" DROP COLUMN "imageUrl",
DROP COLUMN "note",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "productImageUrl" TEXT,
ALTER COLUMN "productName" DROP DEFAULT;

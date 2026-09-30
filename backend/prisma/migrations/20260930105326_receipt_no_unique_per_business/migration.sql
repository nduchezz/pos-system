/*
  Warnings:

  - A unique constraint covering the columns `[businessId,receiptNo]` on the table `sales` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "sales_receiptNo_key";

-- AlterTable
ALTER TABLE "sales" ADD COLUMN     "discount" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- CreateIndex
CREATE UNIQUE INDEX "sales_businessId_receiptNo_key" ON "sales"("businessId", "receiptNo");

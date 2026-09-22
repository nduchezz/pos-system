/*
  Warnings:

  - You are about to drop the column `discount` on the `sales` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[clientTransactionId]` on the table `sales` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "sales" DROP COLUMN "discount",
ADD COLUMN     "clientTransactionId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "sales_clientTransactionId_key" ON "sales"("clientTransactionId");

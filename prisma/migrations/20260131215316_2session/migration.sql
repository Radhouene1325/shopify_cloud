/*
  Warnings:

  - A unique constraint covering the columns `[shop]` on the table `Session` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Session" ALTER COLUMN "expires" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "refreshTokenExpires" SET DATA TYPE DATE;

-- CreateIndex
CREATE UNIQUE INDEX "Session_shop_key" ON "Session"("shop");

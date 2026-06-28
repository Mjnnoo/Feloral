/*
  Warnings:

  - You are about to drop the column `shortDescription` on the `Product` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."Product" DROP COLUMN "shortDescription",
ADD COLUMN     "shortDesc" TEXT;

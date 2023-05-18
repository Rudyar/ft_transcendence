/*
  Warnings:

  - Added the required column `winnerId` to the `Game` table without a default value. This is not possible if the table is not empty.
  - Added the required column `losses` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `wins` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Game" ADD COLUMN     "winnerId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "losses" INTEGER NOT NULL,
ADD COLUMN     "wins" INTEGER NOT NULL;

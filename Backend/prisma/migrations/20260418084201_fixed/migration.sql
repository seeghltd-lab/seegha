-- DropForeignKey
ALTER TABLE `ReceivingLog` DROP FOREIGN KEY `ReceivingLog_receivedById_fkey`;

-- AlterTable
ALTER TABLE `ReceivingLog` ADD COLUMN `receivedByName` VARCHAR(191) NULL,
    ADD COLUMN `receivedByType` VARCHAR(191) NOT NULL DEFAULT 'ADMIN';

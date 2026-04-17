/*
  Warnings:

  - The values [COMPLETED] on the enum `Requisition_status` will be removed. If these variants are still used in the database, this will fail.

*/
-- Convert COMPLETED → FULLY_RECEIVED before enum change
UPDATE `Requisition` SET `status` = 'APPROVED' WHERE `status` = 'COMPLETED';

-- AlterTable
ALTER TABLE `Requisition` ADD COLUMN `approvedAt` DATETIME(3) NULL,
    ADD COLUMN `completedAt` DATETIME(3) NULL,
    ADD COLUMN `rejectReason` VARCHAR(191) NULL,
    MODIFY `status` ENUM('PENDING', 'APPROVED', 'PARTIALLY_RECEIVED', 'FULLY_RECEIVED', 'REJECTED') NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE `RequisitionItem` ADD COLUMN `costPrice` DOUBLE NULL,
    ADD COLUMN `note` VARCHAR(191) NULL,
    ADD COLUMN `receivedQty` DOUBLE NOT NULL DEFAULT 0,
    ADD COLUMN `receivingStatus` ENUM('NOT_RECEIVED', 'PARTIALLY_RECEIVED', 'FULLY_RECEIVED') NOT NULL DEFAULT 'NOT_RECEIVED';

-- CreateTable
CREATE TABLE `ReceivingLog` (
    `id` VARCHAR(191) NOT NULL,
    `requisitionItemId` VARCHAR(191) NOT NULL,
    `receivedQty` DOUBLE NOT NULL,
    `receivedById` VARCHAR(191) NOT NULL,
    `receivedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `note` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ReceivingLog` ADD CONSTRAINT `ReceivingLog_requisitionItemId_fkey` FOREIGN KEY (`requisitionItemId`) REFERENCES `RequisitionItem`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ReceivingLog` ADD CONSTRAINT `ReceivingLog_receivedById_fkey` FOREIGN KEY (`receivedById`) REFERENCES `Employee`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE `requisition` ADD COLUMN `siteId` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `Requisition_siteId_idx` ON `Requisition`(`siteId`);

-- AddForeignKey
ALTER TABLE `Requisition` ADD CONSTRAINT `Requisition_siteId_fkey` FOREIGN KEY (`siteId`) REFERENCES `Site`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE `purchaseorder` ADD COLUMN `siteId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `purchaseorderitem` ADD COLUMN `categoryId` VARCHAR(191) NULL,
    ADD COLUMN `stockId` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `PurchaseOrder_siteId_idx` ON `PurchaseOrder`(`siteId`);

-- CreateIndex
CREATE INDEX `PurchaseOrderItem_stockId_idx` ON `PurchaseOrderItem`(`stockId`);

-- CreateIndex
CREATE INDEX `PurchaseOrderItem_categoryId_idx` ON `PurchaseOrderItem`(`categoryId`);

-- AddForeignKey
ALTER TABLE `PurchaseOrder` ADD CONSTRAINT `PurchaseOrder_siteId_fkey` FOREIGN KEY (`siteId`) REFERENCES `Site`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PurchaseOrderItem` ADD CONSTRAINT `PurchaseOrderItem_stockId_fkey` FOREIGN KEY (`stockId`) REFERENCES `Stock`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PurchaseOrderItem` ADD CONSTRAINT `PurchaseOrderItem_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `Category`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE `requisitionitem` ADD COLUMN `paymentType` VARCHAR(191) NOT NULL DEFAULT 'NONE';

-- AlterTable
ALTER TABLE `supplierpayment` ADD COLUMN `requisitionItemId` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `SupplierPayment_requisitionItemId_idx` ON `SupplierPayment`(`requisitionItemId`);

-- AddForeignKey
ALTER TABLE `SupplierPayment` ADD CONSTRAINT `SupplierPayment_requisitionItemId_fkey` FOREIGN KEY (`requisitionItemId`) REFERENCES `RequisitionItem`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

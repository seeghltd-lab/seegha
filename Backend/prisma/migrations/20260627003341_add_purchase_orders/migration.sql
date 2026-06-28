-- AlterTable
ALTER TABLE `supplierpayment` ADD COLUMN `purchaseOrderItemId` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `PurchaseOrder` (
    `id` VARCHAR(191) NOT NULL,
    `supplierId` VARCHAR(191) NOT NULL,
    `reference` VARCHAR(191) NULL,
    `status` ENUM('PENDING', 'PARTIALLY_RECEIVED', 'FULLY_RECEIVED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `notes` TEXT NULL,
    `createdByAdminId` VARCHAR(191) NOT NULL,
    `date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `expectedDate` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    UNIQUE INDEX `PurchaseOrder_reference_key`(`reference`),
    INDEX `PurchaseOrder_supplierId_idx`(`supplierId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PurchaseOrderItem` (
    `id` VARCHAR(191) NOT NULL,
    `purchaseOrderId` VARCHAR(191) NOT NULL,
    `itemName` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `quantity` DECIMAL(14, 4) NOT NULL,
    `unit` VARCHAR(191) NULL,
    `unitCost` DECIMAL(14, 2) NULL,
    `receivedQty` DECIMAL(14, 4) NOT NULL DEFAULT 0,
    `receivingStatus` ENUM('NOT_RECEIVED', 'PARTIALLY_RECEIVED', 'FULLY_RECEIVED') NOT NULL DEFAULT 'NOT_RECEIVED',
    `paymentType` VARCHAR(191) NOT NULL DEFAULT 'NONE',
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `PurchaseOrderItem_purchaseOrderId_idx`(`purchaseOrderId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `SupplierPayment_purchaseOrderItemId_idx` ON `SupplierPayment`(`purchaseOrderItemId`);

-- AddForeignKey
ALTER TABLE `PurchaseOrder` ADD CONSTRAINT `PurchaseOrder_supplierId_fkey` FOREIGN KEY (`supplierId`) REFERENCES `Supplier`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PurchaseOrderItem` ADD CONSTRAINT `PurchaseOrderItem_purchaseOrderId_fkey` FOREIGN KEY (`purchaseOrderId`) REFERENCES `PurchaseOrder`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SupplierPayment` ADD CONSTRAINT `SupplierPayment_purchaseOrderItemId_fkey` FOREIGN KEY (`purchaseOrderItemId`) REFERENCES `PurchaseOrderItem`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

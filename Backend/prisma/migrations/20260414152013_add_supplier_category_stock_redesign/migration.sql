/*
  Warnings:

  - You are about to drop the column `name` on the `Stock` table. All the data in the column will be lost.
  - You are about to drop the column `purchasingPrice` on the `Stock` table. All the data in the column will be lost.
  - You are about to drop the column `sellingPrice` on the `Stock` table. All the data in the column will be lost.
  - Added the required column `adminId` to the `Stock` table without a default value. This is not possible if the table is not empty.
  - Added the required column `itemName` to the `Stock` table without a default value. This is not possible if the table is not empty.
  - Added the required column `receivedDate` to the `Stock` table without a default value. This is not possible if the table is not empty.
  - Added the required column `totalValue` to the `Stock` table without a default value. This is not possible if the table is not empty.
  - Added the required column `unitCost` to the `Stock` table without a default value. This is not possible if the table is not empty.
  - Added the required column `warehouseLocation` to the `Stock` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `Stock` DROP COLUMN `name`,
    DROP COLUMN `purchasingPrice`,
    DROP COLUMN `sellingPrice`,
    ADD COLUMN `adminId` VARCHAR(191) NOT NULL,
    ADD COLUMN `categoryId` VARCHAR(191) NULL,
    ADD COLUMN `description` TEXT NULL,
    ADD COLUMN `expiryDate` DATETIME(3) NULL,
    ADD COLUMN `itemName` VARCHAR(191) NOT NULL,
    ADD COLUMN `receivedDate` DATETIME(3) NOT NULL,
    ADD COLUMN `stockImg` VARCHAR(191) NULL,
    ADD COLUMN `supplierId` VARCHAR(191) NULL,
    ADD COLUMN `totalValue` DECIMAL(14, 2) NOT NULL,
    ADD COLUMN `unitCost` DECIMAL(12, 2) NOT NULL,
    ADD COLUMN `warehouseLocation` VARCHAR(191) NOT NULL,
    MODIFY `quantity` INTEGER NOT NULL DEFAULT 0,
    MODIFY `reorderLevel` INTEGER NOT NULL DEFAULT 5;

-- CreateTable
CREATE TABLE `Supplier` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `contactPerson` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `address` VARCHAR(191) NULL,
    `city` VARCHAR(191) NULL,
    `country` VARCHAR(191) NULL DEFAULT 'Rwanda',
    `paymentTerms` VARCHAR(191) NULL,
    `rating` DOUBLE NULL DEFAULT 0,
    `status` ENUM('ACTIVE', 'INACTIVE', 'SUSPENDED') NOT NULL DEFAULT 'ACTIVE',
    `notes` TEXT NULL,
    `adminId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Supplier_code_key`(`code`),
    INDEX `Supplier_adminId_idx`(`adminId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Category` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `adminId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Category_adminId_idx`(`adminId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StockHistory` (
    `id` VARCHAR(191) NOT NULL,
    `stockId` VARCHAR(191) NOT NULL,
    `movementType` ENUM('IN', 'OUT', 'ADJUSTMENT') NOT NULL,
    `qtyBefore` INTEGER NOT NULL,
    `qtyChange` INTEGER NOT NULL,
    `qtyAfter` INTEGER NOT NULL,
    `unitPrice` DECIMAL(12, 2) NULL,
    `notes` VARCHAR(191) NULL,
    `createdByAdminId` VARCHAR(191) NULL,
    `createdByEmployeeId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `StockHistory_stockId_idx`(`stockId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `Stock_adminId_idx` ON `Stock`(`adminId`);

-- CreateIndex
CREATE INDEX `Stock_categoryId_idx` ON `Stock`(`categoryId`);

-- CreateIndex
CREATE INDEX `Stock_supplierId_idx` ON `Stock`(`supplierId`);

-- AddForeignKey
ALTER TABLE `Stock` ADD CONSTRAINT `Stock_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `Category`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Stock` ADD CONSTRAINT `Stock_supplierId_fkey` FOREIGN KEY (`supplierId`) REFERENCES `Supplier`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StockHistory` ADD CONSTRAINT `StockHistory_stockId_fkey` FOREIGN KEY (`stockId`) REFERENCES `Stock`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

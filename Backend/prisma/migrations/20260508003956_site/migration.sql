/*
  Warnings:

  - A unique constraint covering the columns `[itemName,siteId]` on the table `Stock` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateTable
CREATE TABLE `StockOut` (
    `id` VARCHAR(191) NOT NULL,
    `siteId` VARCHAR(191) NOT NULL,
    `stockId` VARCHAR(191) NOT NULL,
    `quantity` DOUBLE NOT NULL,
    `unit` VARCHAR(191) NOT NULL,
    `notes` TEXT NULL,
    `date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `recordedById` VARCHAR(191) NOT NULL,
    `recordedByType` VARCHAR(191) NOT NULL DEFAULT 'ADMIN',
    `recordedByName` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `StockOut_siteId_idx`(`siteId`),
    INDEX `StockOut_stockId_idx`(`stockId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SiteEmployeeAccess` (
    `id` VARCHAR(191) NOT NULL,
    `siteId` VARCHAR(191) NOT NULL,
    `employeeId` VARCHAR(191) NOT NULL,
    `canManageWorkers` BOOLEAN NOT NULL DEFAULT false,
    `canManageExpenses` BOOLEAN NOT NULL DEFAULT false,
    `canManageStock` BOOLEAN NOT NULL DEFAULT false,
    `canManageStockOut` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `SiteEmployeeAccess_siteId_idx`(`siteId`),
    INDEX `SiteEmployeeAccess_employeeId_idx`(`employeeId`),
    UNIQUE INDEX `SiteEmployeeAccess_siteId_employeeId_key`(`siteId`, `employeeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `Stock_itemName_siteId_key` ON `Stock`(`itemName`, `siteId`);

-- AddForeignKey
ALTER TABLE `StockOut` ADD CONSTRAINT `StockOut_siteId_fkey` FOREIGN KEY (`siteId`) REFERENCES `Site`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StockOut` ADD CONSTRAINT `StockOut_stockId_fkey` FOREIGN KEY (`stockId`) REFERENCES `Stock`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SiteEmployeeAccess` ADD CONSTRAINT `SiteEmployeeAccess_siteId_fkey` FOREIGN KEY (`siteId`) REFERENCES `Site`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SiteEmployeeAccess` ADD CONSTRAINT `SiteEmployeeAccess_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `Employee`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

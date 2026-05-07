-- AlterTable
ALTER TABLE `StockHistory` ADD COLUMN `siteId` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `StockSiteQuantity` (
    `id` VARCHAR(191) NOT NULL,
    `stockId` VARCHAR(191) NOT NULL,
    `siteId` VARCHAR(191) NOT NULL,
    `quantity` INTEGER NOT NULL DEFAULT 0,
    `reorderLevel` INTEGER NOT NULL DEFAULT 5,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `StockSiteQuantity_stockId_idx`(`stockId`),
    INDEX `StockSiteQuantity_siteId_idx`(`siteId`),
    UNIQUE INDEX `StockSiteQuantity_stockId_siteId_key`(`stockId`, `siteId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `StockSiteQuantity` ADD CONSTRAINT `StockSiteQuantity_stockId_fkey` FOREIGN KEY (`stockId`) REFERENCES `Stock`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StockSiteQuantity` ADD CONSTRAINT `StockSiteQuantity_siteId_fkey` FOREIGN KEY (`siteId`) REFERENCES `Site`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

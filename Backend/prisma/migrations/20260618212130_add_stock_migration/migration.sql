-- AlterTable: Equipment vs Material stock typing + checked-out quantity tracking
ALTER TABLE `Stock` ADD COLUMN `stockType` ENUM('MATERIAL', 'EQUIPMENT') NOT NULL DEFAULT 'MATERIAL',
    ADD COLUMN `quantityOut` INTEGER NOT NULL DEFAULT 0;

-- AlterTable: Equipment checkout/return tracking on stock-out records
ALTER TABLE `StockOut` ADD COLUMN `status` ENUM('OUT', 'RETURNED') NOT NULL DEFAULT 'OUT',
    ADD COLUMN `returnedAt` DATETIME(3) NULL,
    ADD COLUMN `returnNotes` TEXT NULL;

-- AlterTable: add RETURN (equipment) + MIGRATION_OUT/MIGRATION_IN movement types, and link history rows to migrations
ALTER TABLE `StockHistory` ADD COLUMN `migrationId` VARCHAR(191) NULL,
    MODIFY `movementType` ENUM('IN', 'OUT', 'ADJUSTMENT', 'RETURN', 'MIGRATION_OUT', 'MIGRATION_IN') NOT NULL;

-- CreateTable
CREATE TABLE `StockMigration` (
    `id` VARCHAR(191) NOT NULL,
    `stockId` VARCHAR(191) NOT NULL,
    `sourceSiteId` VARCHAR(191) NOT NULL,
    `destinationSiteId` VARCHAR(191) NOT NULL,
    `destinationStockId` VARCHAR(191) NULL,
    `quantity` DOUBLE NOT NULL,
    `unit` VARCHAR(191) NOT NULL,
    `unitCostAtMigration` DECIMAL(12, 2) NOT NULL,
    `status` ENUM('IN_TRANSIT', 'RECEIVED', 'CANCELLED', 'REJECTED') NOT NULL DEFAULT 'IN_TRANSIT',
    `instant` BOOLEAN NOT NULL DEFAULT false,
    `notes` TEXT NULL,
    `cancelReason` TEXT NULL,
    `initiatedById` VARCHAR(191) NOT NULL,
    `initiatedByType` VARCHAR(191) NOT NULL,
    `initiatedByName` VARCHAR(191) NULL,
    `receivedById` VARCHAR(191) NULL,
    `receivedByType` VARCHAR(191) NULL,
    `receivedByName` VARCHAR(191) NULL,
    `dispatchedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `receivedAt` DATETIME(3) NULL,
    `cancelledAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `StockMigration_sourceSiteId_idx`(`sourceSiteId`),
    INDEX `StockMigration_destinationSiteId_idx`(`destinationSiteId`),
    INDEX `StockMigration_stockId_idx`(`stockId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `StockHistory_migrationId_idx` ON `StockHistory`(`migrationId`);

-- AddForeignKey
ALTER TABLE `StockHistory` ADD CONSTRAINT `StockHistory_migrationId_fkey` FOREIGN KEY (`migrationId`) REFERENCES `StockMigration`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StockMigration` ADD CONSTRAINT `StockMigration_stockId_fkey` FOREIGN KEY (`stockId`) REFERENCES `Stock`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StockMigration` ADD CONSTRAINT `StockMigration_destinationStockId_fkey` FOREIGN KEY (`destinationStockId`) REFERENCES `Stock`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StockMigration` ADD CONSTRAINT `StockMigration_sourceSiteId_fkey` FOREIGN KEY (`sourceSiteId`) REFERENCES `Site`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StockMigration` ADD CONSTRAINT `StockMigration_destinationSiteId_fkey` FOREIGN KEY (`destinationSiteId`) REFERENCES `Site`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

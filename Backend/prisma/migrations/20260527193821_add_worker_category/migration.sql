-- AlterTable
ALTER TABLE `siteworkerrecord` ADD COLUMN `categoryId` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `WorkerCategory` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `adminId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `WorkerCategory_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `SiteWorkerRecord_categoryId_idx` ON `SiteWorkerRecord`(`categoryId`);

-- AddForeignKey
ALTER TABLE `SiteWorkerRecord` ADD CONSTRAINT `SiteWorkerRecord_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `WorkerCategory`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

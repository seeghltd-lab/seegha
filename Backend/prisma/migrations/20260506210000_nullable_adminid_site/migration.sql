-- Make adminId optional on Site, SiteWorkerRecord, SiteExpense
-- Allows employees (who have no adminId) to create and manage sites

ALTER TABLE `Site` MODIFY `adminId` VARCHAR(191) NULL;
ALTER TABLE `SiteWorkerRecord` MODIFY `adminId` VARCHAR(191) NULL;
ALTER TABLE `SiteExpense` MODIFY `adminId` VARCHAR(191) NULL;

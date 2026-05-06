-- Make adminId optional on Supplier and Category
-- Allows employees (who have no adminId) to create suppliers and categories

ALTER TABLE `Supplier` MODIFY `adminId` VARCHAR(191) NULL;
ALTER TABLE `Category` MODIFY `adminId` VARCHAR(191) NULL;

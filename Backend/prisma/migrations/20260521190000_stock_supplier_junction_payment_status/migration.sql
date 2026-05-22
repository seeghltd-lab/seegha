-- CreateTable: StockSupplier junction (safe re-run)
CREATE TABLE IF NOT EXISTS `StockSupplier` (
  `id`         VARCHAR(191) NOT NULL,
  `stockId`    VARCHAR(191) NOT NULL,
  `supplierId` VARCHAR(191) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `StockSupplier_stockId_supplierId_key`(`stockId`, `supplierId`),
  INDEX `StockSupplier_stockId_idx`(`stockId`),
  INDEX `StockSupplier_supplierId_idx`(`supplierId`),
  CONSTRAINT `StockSupplier_stockId_fkey`
    FOREIGN KEY (`stockId`)    REFERENCES `Stock`    (`id`) ON DELETE CASCADE  ON UPDATE CASCADE,
  CONSTRAINT `StockSupplier_supplierId_fkey`
    FOREIGN KEY (`supplierId`) REFERENCES `Supplier` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Migrate existing supplierId data into StockSupplier (INSERT IGNORE = safe if already done)
INSERT IGNORE INTO `StockSupplier` (`id`, `stockId`, `supplierId`)
SELECT UUID(), `id`, `supplierId`
FROM `Stock`
WHERE `supplierId` IS NOT NULL;

-- Drop FK if still exists (may have already been dropped in a partial run)
SET @fk_exists = (
  SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'Stock'
    AND CONSTRAINT_NAME = 'Stock_supplierId_fkey'
    AND CONSTRAINT_TYPE = 'FOREIGN KEY'
);
SET @sql = IF(@fk_exists > 0,
  'ALTER TABLE `Stock` DROP FOREIGN KEY `Stock_supplierId_fkey`',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Drop supplierId column if still exists
SET @col_exists = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'Stock'
    AND COLUMN_NAME = 'supplierId'
);
SET @sql2 = IF(@col_exists > 0,
  'ALTER TABLE `Stock` DROP COLUMN `supplierId`',
  'SELECT 1'
);
PREPARE stmt2 FROM @sql2;
EXECUTE stmt2;
DEALLOCATE PREPARE stmt2;

-- AddColumn: SupplierPayment.status (if not already added)
SET @status_exists = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'SupplierPayment'
    AND COLUMN_NAME = 'status'
);
SET @sql3 = IF(@status_exists = 0,
  "ALTER TABLE `SupplierPayment` ADD COLUMN `status` ENUM('UNPAID','PAID','PARTIAL') NULL DEFAULT 'UNPAID'",
  'SELECT 1'
);
PREPARE stmt3 FROM @sql3;
EXECUTE stmt3;
DEALLOCATE PREPARE stmt3;

-- Set existing CREDITs to UNPAID, DEBITs to NULL
UPDATE `SupplierPayment` SET `status` = 'UNPAID' WHERE `type` = 'CREDIT';
UPDATE `SupplierPayment` SET `status` = NULL     WHERE `type` = 'DEBIT';

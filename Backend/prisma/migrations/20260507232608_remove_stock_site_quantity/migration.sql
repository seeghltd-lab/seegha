/*
  Warnings:

  - You are about to drop the `stocksitequantity` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `stocksitequantity` DROP FOREIGN KEY `StockSiteQuantity_siteId_fkey`;

-- DropForeignKey
ALTER TABLE `stocksitequantity` DROP FOREIGN KEY `StockSiteQuantity_stockId_fkey`;

-- DropTable
DROP TABLE `stocksitequantity`;

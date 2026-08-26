-- AlterTable
ALTER TABLE "Collection" ADD COLUMN     "visibleToAllies" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "barcode" TEXT;

-- AlterTable
ALTER TABLE "Sale" ADD COLUMN     "collected" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "Product_barcode_key" ON "Product"("barcode");

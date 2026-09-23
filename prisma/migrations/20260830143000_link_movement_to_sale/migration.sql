-- AlterTable
ALTER TABLE "InventoryMovement" ADD COLUMN     "saleId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "InventoryMovement_saleId_key" ON "InventoryMovement"("saleId");

-- AddForeignKey
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE SET NULL ON UPDATE CASCADE;

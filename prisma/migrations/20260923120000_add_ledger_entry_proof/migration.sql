-- Agrega el comprobante de pago (imagen o PDF) a los movimientos de la
-- cuenta de consignación del aliado (pagos recibidos / ajustes).
ALTER TABLE "LedgerEntry" ADD COLUMN "proofUrl" TEXT;

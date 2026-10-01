-- Elimina el marcador "Por cobrar/Cobrado" por venta individual (Sale.collected
-- y Sale.paymentProofUrl): quedaba desconectado de los pagos reales que se
-- registran en la cuenta de consignación del aliado (LedgerEntry), lo que
-- causaba que el total "por cobrar" no bajara al registrar un pago. La cuenta
-- de consignación queda como única fuente de verdad para la deuda de aliados.
ALTER TABLE "Sale" DROP COLUMN "collected";
ALTER TABLE "Sale" DROP COLUMN "paymentProofUrl";

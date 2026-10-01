-- Revierte la venta de prueba "Cartera Roja" (1 unidad, $140, USDT, Punto
-- físico principal) hecha para probar el comprobante, y elimina el cierre
-- de caja de prueba que se hizo para ver cómo se veía el cierre. Al borrar
-- el cierre, cualquier venta real que aún lo referencie queda sin cierre
-- asignado (ON DELETE SET NULL) en vez de perderse.

CREATE TEMP TABLE _cartera_roja_target AS
SELECT s.id AS sale_id, s."productId", s."locationId", s.quantity, s."cashClosingId"
FROM "Sale" s
JOIN "Product" p ON s."productId" = p.id
JOIN "Location" l ON s."locationId" = l.id
WHERE p.name = 'Cartera Roja'
  AND l.name = 'Punto físico principal'
  AND s.quantity = 1
  AND s."unitPrice" = 140
ORDER BY s."saleDate" DESC
LIMIT 1;

UPDATE "InventoryItem" ii
SET quantity = ii.quantity + t.quantity
FROM _cartera_roja_target t
WHERE ii."productId" = t."productId"
  AND ii."locationId" = t."locationId";

DELETE FROM "InventoryMovement" im
USING _cartera_roja_target t
WHERE im."saleId" = t.sale_id;

DELETE FROM "Sale" s
USING _cartera_roja_target t
WHERE s.id = t.sale_id;

-- Elimina el cierre de caja de prueba: el asociado a la venta de Cartera
-- Roja si tenía uno, o si no, el cierre más reciente registrado.
DELETE FROM "CashClosing" cc
WHERE cc.id = (
  SELECT COALESCE(
    (SELECT t."cashClosingId" FROM _cartera_roja_target t WHERE t."cashClosingId" IS NOT NULL LIMIT 1),
    (SELECT cc2.id FROM "CashClosing" cc2 ORDER BY cc2."closedAt" DESC LIMIT 1)
  )
);

DROP TABLE _cartera_roja_target;
